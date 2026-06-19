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
import { DoctorProfile } from '../doctor/doctor-profile.entity';
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

  // ─── Book Appointment ─────────────────────────────────────────────────────

  async bookAppointment(patient: User, dto: BookAppointmentDto): Promise<object> {
    // 1. Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      throw new BadRequestException(
        `Invalid date format: ${dto.date}. Use YYYY-MM-DD`,
      );
    }

    // 2. Validate date is not in the past
    const [year, month, day] = dto.date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      throw new BadRequestException(
        `Cannot book appointment for past date: ${dto.date}`,
      );
    }

    // 3. Validate appointment is not in the past time (if today)
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

    // 4. Check doctor exists
    const doctor = await this.doctorProfileRepo.findOne({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);
    }

    // 5. Find the slot — normalize time for comparison
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

    // 6. Check slot is available
    if (slot.status === SlotStatus.BOOKED) {
      throw new ConflictException(
        `This slot (${dto.startTime}–${dto.endTime}) is already booked. Please choose another slot`,
      );
    }

    // 7. Check patient hasn't already booked same slot
    const existingAppointment = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        slotId: slot.id,
        status: AppointmentStatus.BOOKED,
      },
    });
    if (existingAppointment) {
      throw new ConflictException(
        `You have already booked this slot`,
      );
    }

    // 8. Book using transaction — atomic operation
    const appointment = await this.dataSource.transaction(async (manager) => {
      // Update slot status to BOOKED
      await manager.update(Slot, { id: slot.id }, { status: SlotStatus.BOOKED });

      // Create appointment
      const appt = manager.create(Appointment, {
        patientId: patient.id,
        doctorId: dto.doctorId,
        slotId: slot.id,
        date: dto.date,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        status: AppointmentStatus.BOOKED,
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
      return {
        success: true,
        message: 'No appointments found',
        data: [],
      };
    }

    // Fetch doctor details for each appointment
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
    // 1. Find appointment
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    // 2. Only owner can cancel
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException(
        `You are not authorized to cancel this appointment`,
      );
    }

    // 3. Cannot cancel already cancelled
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException(
        `Appointment is already cancelled`,
      );
    }

    // 4. Cannot cancel past appointment
    const [year, month, day] = appointment.date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      throw new BadRequestException(
        `Cannot cancel a past appointment`,
      );
    }

    // 5. Cancel using transaction
    await this.dataSource.transaction(async (manager) => {
      // Update appointment status
      await manager.update(
        Appointment,
        { id: appointmentId },
        { status: AppointmentStatus.CANCELLED },
      );

      // Free up the slot
      await manager.update(
        Slot,
        { id: appointment.slotId },
        { status: SlotStatus.AVAILABLE },
      );
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        id: appointmentId,
        status: AppointmentStatus.CANCELLED,
      },
    };
  }

  // ─── Doctor: View Appointments ────────────────────────────────────────────

  async getDoctorAppointments(doctor: User): Promise<object> {
    // Get doctor profile
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
      return {
        success: true,
        message: 'No appointments found',
        data: [],
      };
    }

    // Fetch patient details
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
          patient: patient
            ? {
                id: patient.id,
                name: patient.name,
                email: patient.email,
              }
            : null,
          createdAt: appt.createdAt,
        };
      }),
    };
  }
}