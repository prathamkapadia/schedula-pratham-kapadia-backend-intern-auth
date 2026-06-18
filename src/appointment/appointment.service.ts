import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../auth/user.entity';
import { DoctorProfile, SchedulingType } from '../doctor/doctor-profile.entity';
import { Slot, SlotStatus } from '../doctor/slot.entity';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { BookAppointmentDto } from './appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,

    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private normalizeTime(time: string): string {
    if (!time) return time;
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  private toMinutes(time: string): number {
    const parts = time.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  private validateBookingTime(dto: BookAppointmentDto): { year: number; month: number; day: number } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      throw new BadRequestException(
        `Invalid date format: ${dto.date}. Use YYYY-MM-DD`,
      );
    }

    const [year, month, day] = dto.date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      throw new BadRequestException(
        `Cannot book appointment for past date: ${dto.date}`,
      );
    }

    const now = new Date();
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() + 1 === month &&
      now.getDate() === day;

    if (isToday) {
      const slotStartMinutes = this.toMinutes(dto.startTime);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotStartMinutes <= currentMinutes) {
        throw new BadRequestException(
          `Cannot book a past time slot. Please choose a future slot`,
        );
      }
    }

    return { year, month, day };
  }

  // ─── Book Appointment ─────────────────────────────────────────────────────

  async bookAppointment(patient: User, dto: BookAppointmentDto): Promise<object> {
    this.validateBookingTime(dto);

    const doctor = await this.doctorProfileRepo.findOne({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);
    }

    const normalizedStart = this.normalizeTime(dto.startTime);
    const normalizedEnd = this.normalizeTime(dto.endTime);

    const slot = await this.slotRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        date: dto.date,
        startTime: normalizedStart,
        endTime: normalizedEnd,
      },
    });

    if (!slot) {
      throw new NotFoundException(
        `Slot not found for Dr. ${doctor.fullName} on ${dto.date} at ${dto.startTime}–${dto.endTime}. Please fetch available slots first via GET /api/doctor/${dto.doctorId}/slots?date=${dto.date}`,
      );
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.bookWaveAppointment(patient, doctor, slot);
    }
    return this.bookStreamAppointment(patient, doctor, slot, normalizedStart, normalizedEnd);
  }

  // ─── STREAM booking — exact 1-to-1 slot booking ──────────────────────────

  private async bookStreamAppointment(
    patient: User,
    doctor: DoctorProfile,
    slot: Slot,
    normalizedStart: string,
    normalizedEnd: string,
  ): Promise<object> {
    if (slot.status === SlotStatus.BOOKED) {
      throw new ConflictException(
        `This slot (${normalizedStart}–${normalizedEnd}) is already booked. Please choose another slot`,
      );
    }

    const existingAppointment = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        slotId: slot.id,
        status: AppointmentStatus.BOOKED,
      },
    });
    if (existingAppointment) {
      throw new ConflictException(`You have already booked this slot`);
    }

    const appointment = await this.dataSource.transaction(async (manager) => {
      // Re-check status inside transaction to prevent race condition double-booking
      const freshSlot = await manager.findOne(Slot, { where: { id: slot.id } });
      if (!freshSlot || freshSlot.status === SlotStatus.BOOKED) {
        throw new ConflictException(
          `This slot was just booked by someone else. Please choose another slot`,
        );
      }

      await manager.update(Slot, { id: slot.id }, { status: SlotStatus.BOOKED });

      const appt = manager.create(Appointment, {
        patientId: patient.id,
        doctorId: doctor.id,
        slotId: slot.id,
        date: slot.date,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        status: AppointmentStatus.BOOKED,
        tokenNumber: null,
      });

      return await manager.save(Appointment, appt);
    });

    return {
      success: true,
      message: 'Appointment booked successfully',
      data: {
        id: appointment.id,
        date: appointment.date,
        startTime: this.normalizeTime(appointment.startTime),
        endTime: this.normalizeTime(appointment.endTime),
        status: appointment.status,
        schedulingType: SchedulingType.STREAM,
        doctor: {
          id: doctor.id,
          name: doctor.fullName,
          specialization: doctor.specialization,
        },
      },
    };
  }

  // ─── WAVE booking — token-based shared window booking ────────────────────

  private async bookWaveAppointment(
    patient: User,
    doctor: DoctorProfile,
    slot: Slot,
  ): Promise<object> {
    const maxPatients = slot.maxPatients ?? doctor.maxPatientsPerWave ?? 0;

    if (maxPatients < 1) {
      throw new BadRequestException(
        `Doctor has not configured a valid wave capacity`,
      );
    }

    // Prevent same patient booking same wave window twice
    const existingAppointment = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        slotId: slot.id,
        status: AppointmentStatus.BOOKED,
      },
    });
    if (existingAppointment) {
      throw new ConflictException(
        `You have already booked a token in this wave window`,
      );
    }

    const appointment = await this.dataSource.transaction(async (manager) => {
      // Lock the slot row to safely increment bookedCount under concurrency
      const freshSlot = await manager
        .createQueryBuilder(Slot, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id', { id: slot.id })
        .getOne();

      if (!freshSlot) {
        throw new NotFoundException('Slot not found');
      }

      if (freshSlot.bookedCount >= maxPatients) {
        throw new ConflictException(
          `Wave is full. Maximum ${maxPatients} patients already booked for this window (${this.normalizeTime(freshSlot.startTime)}–${this.normalizeTime(freshSlot.endTime)})`,
        );
      }

      const newTokenNumber = freshSlot.bookedCount + 1;
      const newBookedCount = freshSlot.bookedCount + 1;
      const newStatus =
        newBookedCount >= maxPatients ? SlotStatus.BOOKED : SlotStatus.AVAILABLE;

      await manager.update(
        Slot,
        { id: freshSlot.id },
        { bookedCount: newBookedCount, status: newStatus },
      );

      const appt = manager.create(Appointment, {
        patientId: patient.id,
        doctorId: doctor.id,
        slotId: freshSlot.id,
        date: freshSlot.date,
        startTime: this.normalizeTime(freshSlot.startTime),
        endTime: this.normalizeTime(freshSlot.endTime),
        status: AppointmentStatus.BOOKED,
        tokenNumber: newTokenNumber,
      });

      return await manager.save(Appointment, appt);
    });

    return {
      success: true,
      message: `Appointment booked successfully. Your token number is ${appointment.tokenNumber}`,
      data: {
        id: appointment.id,
        date: appointment.date,
        startTime: this.normalizeTime(appointment.startTime),
        endTime: this.normalizeTime(appointment.endTime),
        status: appointment.status,
        schedulingType: SchedulingType.WAVE,
        tokenNumber: appointment.tokenNumber,
        doctor: {
          id: doctor.id,
          name: doctor.fullName,
          specialization: doctor.specialization,
        },
      },
    };
  }

  // ─── Patient: View My Appointments ────────────────────────────────────────

  async getMyAppointments(patient: User): Promise<object> {
    const appointments = await this.appointmentRepo.find({
      where: { patientId: patient.id },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    if (appointments.length === 0) {
      return { success: true, message: 'No appointments found', data: [] };
    }

    const doctorIds = [...new Set(appointments.map((a) => a.doctorId))];
    const doctors = await this.doctorProfileRepo.findByIds(doctorIds);
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

    return {
      success: true,
      message: 'Appointments fetched successfully',
      count: appointments.length,
      data: appointments.map((appt) => {
        const doctor = doctorMap.get(appt.doctorId);
        return {
          id: appt.id,
          date: appt.date,
          startTime: this.normalizeTime(appt.startTime),
          endTime: this.normalizeTime(appt.endTime),
          status: appt.status,
          schedulingType: doctor?.schedulingType ?? null,
          tokenNumber: appt.tokenNumber,
          doctor: doctor
            ? {
                id: doctor.id,
                name: doctor.fullName,
                specialization: doctor.specialization,
                consultationFee: doctor.consultationFee,
              }
            : null,
          createdAt: appt.createdAt,
        };
      }),
    };
  }

  // ─── Patient: Cancel Appointment ──────────────────────────────────────────

  async cancelAppointment(patient: User, appointmentId: string): Promise<object> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException(`You are not authorized to cancel this appointment`);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException(`Appointment is already cancelled`);
    }

    const [year, month, day] = appointment.date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      throw new BadRequestException(`Cannot cancel a past appointment`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Appointment,
        { id: appointmentId },
        { status: AppointmentStatus.CANCELLED },
      );

      const slot = await manager.findOne(Slot, { where: { id: appointment.slotId } });
      if (slot) {
        if (appointment.tokenNumber !== null) {
          // WAVE — free up one seat in the window, never go below 0
          const newBookedCount = Math.max(0, slot.bookedCount - 1);
          await manager.update(
            Slot,
            { id: slot.id },
            { bookedCount: newBookedCount, status: SlotStatus.AVAILABLE },
          );
        } else {
          // STREAM — slot becomes fully available again
          await manager.update(Slot, { id: slot.id }, { status: SlotStatus.AVAILABLE });
        }
      }
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      data: { id: appointmentId, status: AppointmentStatus.CANCELLED },
    };
  }

  // ─── Doctor: View Appointments ────────────────────────────────────────────

  async getDoctorAppointments(doctor: User): Promise<object> {
    const profile = await this.doctorProfileRepo.findOne({
      where: { userId: doctor.id },
    });

    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding first.',
      );
    }

    const appointments = await this.appointmentRepo.find({
      where: { doctorId: profile.id },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    if (appointments.length === 0) {
      return { success: true, message: 'No appointments found', data: [] };
    }

    const patientIds = [...new Set(appointments.map((a) => a.patientId))];
    const patients = await this.userRepo.findByIds(patientIds);
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    return {
      success: true,
      message: 'Appointments fetched successfully',
      count: appointments.length,
      data: appointments.map((appt) => {
        const patient = patientMap.get(appt.patientId);
        return {
          id: appt.id,
          date: appt.date,
          startTime: this.normalizeTime(appt.startTime),
          endTime: this.normalizeTime(appt.endTime),
          status: appt.status,
          schedulingType: profile.schedulingType,
          tokenNumber: appt.tokenNumber,
          patient: patient
            ? { id: patient.id, name: patient.name, email: patient.email }
            : null,
          createdAt: appt.createdAt,
        };
      }),
    };
  }
}