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
import { BookAppointmentDto, RescheduleAppointmentDto } from './appointment.dto';

const RESCHEDULE_CUTOFF_MINUTES = 30;

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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private readonly DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];

  private normalizeTime(time: string): string {
    if (!time) return time;
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  private toMinutes(time: string): number {
    const parts = time.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  private minutesToTimeStr(totalMinutes: number): string {
    const clamped = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── Day 18 + Day 20: Date Validation ─────────────────────────────────────

  private validateBookingTime(
    date: string,
    startTime: string,
    doctor?: DoctorProfile,
  ): { year: number; month: number; day: number } {
    // 1. Format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(`Invalid date format: ${date}. Use YYYY-MM-DD`);
    }

    const [year, month, day] = date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);

    // 2. Calendar validity
    if (
      Number.isNaN(requestedDate.getTime()) ||
      requestedDate.getFullYear() !== year ||
      requestedDate.getMonth() !== month - 1 ||
      requestedDate.getDate() !== day
    ) {
      throw new BadRequestException(`Invalid date: ${date} does not exist on the calendar`);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = requestedDate.getTime() === today.getTime();

    // 3. Past date check
    if (requestedDate < today) {
      throw new BadRequestException(`Cannot book appointment for past date: ${date}`);
    }

    // 4. Future date check — Day 20 doctor config
    if (!isToday) {
      const allowFuture = doctor?.allowFutureBooking ?? false;

      if (!allowFuture) {
        throw new BadRequestException(
          `This doctor only accepts same-day bookings. Bookings are only allowed for today's date (${this.formatDate(today)}).`,
        );
      }

      const rawMax = doctor?.maxFutureBookingDays;
      if (rawMax !== null && rawMax !== undefined && rawMax < 1) {
        throw new BadRequestException(
          `Invalid doctor configuration: maxFutureBookingDays must be at least 1.`,
        );
      }

      const maxDays = (rawMax != null && rawMax > 0) ? rawMax : 7;
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + maxDays);

      if (requestedDate > maxDate) {
        throw new BadRequestException(
          `Booking too far in advance. This doctor accepts bookings up to ${maxDays} day(s) ahead. Latest allowed date: ${this.formatDate(maxDate)}.`,
        );
      }
    }

    // 5. Past time-of-day check — only for today
    if (isToday) {
      const slotStartMinutes = this.toMinutes(startTime);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotStartMinutes <= currentMinutes) {
        throw new BadRequestException(`Cannot book a past time slot. Please choose a future slot`);
      }
    }

    return { year, month, day };
  }

  // ─── Day 19: Booking Window Validation ────────────────────────────────────

  private validateBookingWindow(doctor: DoctorProfile, now: Date = new Date()): void {
    const { bookingOpensAt, bookingClosesAt, isAvailableToday, todayName } =
      this.computeBookingWindow(doctor, now);

    if (!isAvailableToday) {
      throw new BadRequestException(
        `Dr. ${doctor.fullName} is not available today (${todayName}).`,
      );
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes < bookingOpensAt) {
      throw new BadRequestException(
        `Booking window has not opened yet. Bookings for Dr. ${doctor.fullName} open at ${this.minutesToTimeStr(bookingOpensAt)}.`,
      );
    }
    if (currentMinutes > bookingClosesAt) {
      throw new BadRequestException(
        `Booking window has closed. Bookings for Dr. ${doctor.fullName} closed at ${this.minutesToTimeStr(bookingClosesAt)}.`,
      );
    }
  }

  computeBookingWindow(
    doctor: DoctorProfile,
    now: Date = new Date(),
  ): {
    isAvailableToday: boolean;
    todayName: string;
    consultationStart: string | null;
    consultationEnd: string | null;
    bookingOpensAt: number;
    bookingClosesAt: number;
    bookingOpensAtStr: string | null;
    bookingClosesAtStr: string | null;
    isWindowOpen: boolean;
  } {
    const todayName = this.DAY_NAMES[now.getDay()];
    const todayAvailability = (doctor.availability || []).find(
      (a) => a.day?.toLowerCase() === todayName.toLowerCase(),
    );

    if (!todayAvailability) {
      return {
        isAvailableToday: false,
        todayName,
        consultationStart: null,
        consultationEnd: null,
        bookingOpensAt: -1,
        bookingClosesAt: -1,
        bookingOpensAtStr: null,
        bookingClosesAtStr: null,
        isWindowOpen: false,
      };
    }

    const consultStartMinutes = this.toMinutes(this.normalizeTime(todayAvailability.from));
    const consultEndMinutes = this.toMinutes(this.normalizeTime(todayAvailability.to));

    if (
      Number.isNaN(consultStartMinutes) ||
      Number.isNaN(consultEndMinutes) ||
      consultEndMinutes <= consultStartMinutes
    ) {
      throw new BadRequestException(
        `Invalid consultation timings configured for Dr. ${doctor.fullName}.`,
      );
    }

    const bookingOpensAt = consultStartMinutes - 120;
    const bookingClosesAt = consultEndMinutes - 60;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return {
      isAvailableToday: true,
      todayName,
      consultationStart: this.minutesToTimeStr(consultStartMinutes),
      consultationEnd: this.minutesToTimeStr(consultEndMinutes),
      bookingOpensAt,
      bookingClosesAt,
      bookingOpensAtStr: this.minutesToTimeStr(bookingOpensAt),
      bookingClosesAtStr: this.minutesToTimeStr(bookingClosesAt),
      isWindowOpen: currentMinutes >= bookingOpensAt && currentMinutes <= bookingClosesAt,
    };
  }

  // ─── Public: Get Booking Window Info ──────────────────────────────────────

  async getBookingWindow(doctorId: string): Promise<object> {
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    const now = new Date();
    const window = this.computeBookingWindow(doctor, now);

    if (!window.isAvailableToday) {
      return {
        success: true,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        today: window.todayName,
        isAvailableToday: false,
        message: `Dr. ${doctor.fullName} is not available today (${window.todayName}).`,
      };
    }

    return {
      success: true,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      today: window.todayName,
      isAvailableToday: true,
      consultationHours: {
        start: window.consultationStart,
        end: window.consultationEnd,
      },
      bookingWindow: {
        opensAt: window.bookingOpensAtStr,
        closesAt: window.bookingClosesAtStr,
        isCurrentlyOpen: window.isWindowOpen,
      },
      currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      message: window.isWindowOpen
        ? `Booking is currently open. Window closes at ${window.bookingClosesAtStr}.`
        : now.getHours() * 60 + now.getMinutes() < window.bookingOpensAt
        ? `Booking window opens at ${window.bookingOpensAtStr}.`
        : `Booking window has closed for today. It closed at ${window.bookingClosesAtStr}.`,
    };
  }

  // ─── Cutoff Rule ──────────────────────────────────────────────────────────

  private enforceCutoffRule(appointment: Appointment): void {
    const now = new Date();
    const [year, month, day] = appointment.date.split('-').map(Number);
    const [hour, minute] = appointment.startTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const minutesUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilAppointment < RESCHEDULE_CUTOFF_MINUTES) {
      const roundedMins = Math.max(0, Math.floor(minutesUntilAppointment));
      throw new BadRequestException(
        `Cannot modify appointment less than ${RESCHEDULE_CUTOFF_MINUTES} minutes before start time. ` +
        `Your appointment starts in ${roundedMins} minute(s).`,
      );
    }
  }

  // ─── Next Available Slot Helpers ──────────────────────────────────────────

  private async findNextAvailableStreamSlot(
    doctorId: string,
    afterDate: string,
    afterTime: string,
  ): Promise<{ date: string; startTime: string; endTime: string } | null> {
    const slots = await this.slotRepo.find({
      where: { doctorId, status: SlotStatus.AVAILABLE },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    const afterMinutes = this.toMinutes(afterTime);
    for (const slot of slots) {
      if (slot.date < afterDate) continue;
      if (slot.date === afterDate && this.toMinutes(slot.startTime) <= afterMinutes) continue;
      return {
        date: slot.date,
        startTime: this.normalizeTime(slot.startTime),
        endTime: this.normalizeTime(slot.endTime),
      };
    }
    return null;
  }

  private async findNextAvailableWaveSlot(
    doctorId: string,
    afterDate: string,
    afterTime: string,
    maxPatients: number,
  ): Promise<{ date: string; startTime: string; endTime: string; available: number } | null> {
    const slots = await this.slotRepo.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    const afterMinutes = this.toMinutes(afterTime);
    for (const slot of slots) {
      if (slot.date < afterDate) continue;
      if (slot.date === afterDate && this.toMinutes(slot.startTime) <= afterMinutes) continue;
      const capacity = slot.maxPatients ?? maxPatients;
      if (slot.bookedCount >= capacity) continue;
      return {
        date: slot.date,
        startTime: this.normalizeTime(slot.startTime),
        endTime: this.normalizeTime(slot.endTime),
        available: capacity - slot.bookedCount,
      };
    }
    return null;
  }

  // ─── Book Appointment ──────────────────────────────────────────────────────

  async bookAppointment(patient: User, dto: BookAppointmentDto): Promise<object> {
    // Fetch doctor first — needed for Day 20 config
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);
    }

    // Day 18 + Day 20: date validation with doctor config
    this.validateBookingTime(dto.date, dto.startTime, doctor);

    // Day 19: time-window only applies for today
    const [year, month, day] = dto.date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate.getTime() === today.getTime()) {
      this.validateBookingWindow(doctor);
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
        `Slot not found for Dr. ${doctor.fullName} on ${dto.date} at ${dto.startTime}–${dto.endTime}. ` +
        `Please fetch available slots first via GET /api/doctor/${dto.doctorId}/slots?date=${dto.date}`,
      );
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.bookWaveAppointment(patient, doctor, slot);
    }
    return this.bookStreamAppointment(patient, doctor, slot, normalizedStart, normalizedEnd);
  }

  // ─── STREAM Booking ────────────────────────────────────────────────────────

  private async bookStreamAppointment(
    patient: User,
    doctor: DoctorProfile,
    slot: Slot,
    normalizedStart: string,
    normalizedEnd: string,
  ): Promise<object> {
    if (slot.status === SlotStatus.BOOKED) {
      const suggestion = await this.findNextAvailableStreamSlot(doctor.id, slot.date, slot.startTime);
      throw new ConflictException({
        message: `This slot (${normalizedStart}–${normalizedEnd}) is already booked.`,
        suggestion: suggestion
          ? { message: 'Next available slot:', ...suggestion }
          : 'No upcoming slots available. Please check back later.',
      });
    }

    const existingAppointment = await this.appointmentRepo.findOne({
      where: { patientId: patient.id, slotId: slot.id, status: AppointmentStatus.BOOKED },
    });
    if (existingAppointment) {
      throw new ConflictException(`You have already booked this slot`);
    }

    const appointment = await this.dataSource.transaction(async (manager) => {
      const freshSlot = await manager.findOne(Slot, { where: { id: slot.id } });
      if (!freshSlot || freshSlot.status === SlotStatus.BOOKED) {
        throw new ConflictException(`This slot was just booked by someone else. Please choose another slot`);
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
        doctor: { id: doctor.id, name: doctor.fullName, specialization: doctor.specialization },
      },
    };
  }

  // ─── WAVE Booking ──────────────────────────────────────────────────────────

  private async bookWaveAppointment(
    patient: User,
    doctor: DoctorProfile,
    slot: Slot,
  ): Promise<object> {
    const maxPatients = slot.maxPatients ?? doctor.maxPatientsPerWave ?? 0;
    if (maxPatients < 1) {
      throw new BadRequestException(`Doctor has not configured a valid wave capacity`);
    }

    const existingAppointment = await this.appointmentRepo.findOne({
      where: { patientId: patient.id, slotId: slot.id, status: AppointmentStatus.BOOKED },
    });
    if (existingAppointment) {
      throw new ConflictException(`You have already booked a token in this wave window`);
    }

    const appointment = await this.dataSource.transaction(async (manager) => {
      const freshSlot = await manager
        .createQueryBuilder(Slot, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id', { id: slot.id })
        .getOne();

      if (!freshSlot) throw new NotFoundException('Slot not found');

      if (freshSlot.bookedCount >= maxPatients) {
        const suggestion = await this.findNextAvailableWaveSlot(
          doctor.id, freshSlot.date, freshSlot.startTime, maxPatients,
        );
        throw new ConflictException({
          message: `Wave is full. Maximum ${maxPatients} patients already booked.`,
          suggestion: suggestion
            ? { message: 'Next available wave window:', ...suggestion }
            : 'No upcoming wave windows available.',
        });
      }

      const newTokenNumber = freshSlot.bookedCount + 1;
      const newBookedCount = freshSlot.bookedCount + 1;
      const newStatus = newBookedCount >= maxPatients ? SlotStatus.BOOKED : SlotStatus.AVAILABLE;
      await manager.update(Slot, { id: freshSlot.id }, { bookedCount: newBookedCount, status: newStatus });

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
        doctor: { id: doctor.id, name: doctor.fullName, specialization: doctor.specialization },
      },
    };
  }

  // ─── Reschedule Appointment ────────────────────────────────────────────────

  async rescheduleAppointment(
    patient: User,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<object> {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException(`You are not authorized to reschedule this appointment`);
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(`Cannot reschedule a cancelled appointment`);
    }
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException(`This appointment has already been rescheduled. Please check your active appointments`);
    }

    this.enforceCutoffRule(appointment);

    const normalizedNewStart = this.normalizeTime(dto.newStartTime);
    const normalizedNewEnd = this.normalizeTime(dto.newEndTime);

    // Fetch doctor before validateBookingTime — needed for Day 20 config
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: appointment.doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor not found`);

    // Day 18 + Day 20: date validation with doctor config
    this.validateBookingTime(dto.newDate, normalizedNewStart, doctor);

    if (
      appointment.date === dto.newDate &&
      this.normalizeTime(appointment.startTime) === normalizedNewStart &&
      this.normalizeTime(appointment.endTime) === normalizedNewEnd
    ) {
      throw new BadRequestException(`New appointment time is the same as current. Please choose a different time`);
    }

    // Day 19: time-window only applies for today
    const [year, month, day] = dto.newDate.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate.getTime() === today.getTime()) {
      this.validateBookingWindow(doctor);
    }

    const newSlot = await this.slotRepo.findOne({
      where: {
        doctorId: appointment.doctorId,
        date: dto.newDate,
        startTime: normalizedNewStart,
        endTime: normalizedNewEnd,
      },
    });

    if (!newSlot) {
      const isWave = doctor.schedulingType === SchedulingType.WAVE;
      const suggestion = isWave
        ? await this.findNextAvailableWaveSlot(doctor.id, dto.newDate, normalizedNewStart, doctor.maxPatientsPerWave ?? 0)
        : await this.findNextAvailableStreamSlot(doctor.id, dto.newDate, normalizedNewStart);

      throw new NotFoundException({
        message: `No slot found for ${dto.newDate} at ${dto.newStartTime}–${dto.newEndTime}. Please fetch available slots first.`,
        suggestion: suggestion ?? 'No upcoming slots available.',
      });
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.rescheduleWaveAppointment(patient, doctor, appointment, newSlot, normalizedNewStart, normalizedNewEnd);
    }
    return this.rescheduleStreamAppointment(patient, doctor, appointment, newSlot, normalizedNewStart, normalizedNewEnd);
  }

  // ─── STREAM Reschedule ─────────────────────────────────────────────────────

  private async rescheduleStreamAppointment(
    patient: User,
    doctor: DoctorProfile,
    oldAppointment: Appointment,
    newSlot: Slot,
    normalizedNewStart: string,
    normalizedNewEnd: string,
  ): Promise<object> {
    if (newSlot.status === SlotStatus.BOOKED) {
      const suggestion = await this.findNextAvailableStreamSlot(doctor.id, newSlot.date, newSlot.startTime);
      throw new ConflictException({
        message: `Requested slot (${normalizedNewStart}–${normalizedNewEnd}) is already booked.`,
        suggestion: suggestion
          ? { message: 'Next available slot:', ...suggestion }
          : 'No upcoming slots available.',
      });
    }

    const newAppointment = await this.dataSource.transaction(async (manager) => {
      const freshNewSlot = await manager.findOne(Slot, { where: { id: newSlot.id } });
      if (!freshNewSlot || freshNewSlot.status === SlotStatus.BOOKED) {
        throw new ConflictException(`This slot was just booked by someone else. Please choose another slot`);
      }
      await manager.update(Slot, { id: oldAppointment.slotId }, { status: SlotStatus.AVAILABLE });
      await manager.update(Slot, { id: newSlot.id }, { status: SlotStatus.BOOKED });
      await manager.update(Appointment, { id: oldAppointment.id }, {
        status: AppointmentStatus.RESCHEDULED,
        rescheduledAt: new Date(),
      });
      const appt = manager.create(Appointment, {
        patientId: patient.id,
        doctorId: doctor.id,
        slotId: newSlot.id,
        date: newSlot.date,
        startTime: normalizedNewStart,
        endTime: normalizedNewEnd,
        status: AppointmentStatus.BOOKED,
        tokenNumber: null,
        rescheduledFromId: oldAppointment.id,
        rescheduledAt: new Date(),
      });
      return await manager.save(Appointment, appt);
    });

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        newAppointment: {
          id: newAppointment.id,
          date: newAppointment.date,
          startTime: this.normalizeTime(newAppointment.startTime),
          endTime: this.normalizeTime(newAppointment.endTime),
          status: newAppointment.status,
          schedulingType: SchedulingType.STREAM,
          rescheduledFrom: oldAppointment.id,
        },
        previousAppointment: {
          id: oldAppointment.id,
          date: oldAppointment.date,
          startTime: this.normalizeTime(oldAppointment.startTime),
          endTime: this.normalizeTime(oldAppointment.endTime),
          status: AppointmentStatus.RESCHEDULED,
        },
        doctor: { id: doctor.id, name: doctor.fullName, specialization: doctor.specialization },
      },
    };
  }

  // ─── WAVE Reschedule ───────────────────────────────────────────────────────

  private async rescheduleWaveAppointment(
    patient: User,
    doctor: DoctorProfile,
    oldAppointment: Appointment,
    newSlot: Slot,
    normalizedNewStart: string,
    normalizedNewEnd: string,
  ): Promise<object> {
    const maxPatients = newSlot.maxPatients ?? doctor.maxPatientsPerWave ?? 0;

    const alreadyInNewWave = await this.appointmentRepo.findOne({
      where: { patientId: patient.id, slotId: newSlot.id, status: AppointmentStatus.BOOKED },
    });
    if (alreadyInNewWave) {
      throw new ConflictException(`You already have a booking in this wave window`);
    }

    const newAppointment = await this.dataSource.transaction(async (manager) => {
      const freshNewSlot = await manager
        .createQueryBuilder(Slot, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id', { id: newSlot.id })
        .getOne();

      if (!freshNewSlot) throw new NotFoundException('New wave window not found');

      if (freshNewSlot.bookedCount >= maxPatients) {
        const suggestion = await this.findNextAvailableWaveSlot(
          doctor.id, freshNewSlot.date, freshNewSlot.startTime, maxPatients,
        );
        throw new ConflictException({
          message: `Requested wave (${normalizedNewStart}–${normalizedNewEnd}) is full.`,
          suggestion: suggestion
            ? { message: 'Next available wave window:', ...suggestion }
            : 'No upcoming wave windows available.',
        });
      }

      const oldSlot = await manager.findOne(Slot, { where: { id: oldAppointment.slotId } });
      if (oldSlot) {
        const newOldCount = Math.max(0, oldSlot.bookedCount - 1);
        await manager.update(Slot, { id: oldSlot.id }, { bookedCount: newOldCount, status: SlotStatus.AVAILABLE });
      }

      const newTokenNumber = freshNewSlot.bookedCount + 1;
      const newBookedCount = freshNewSlot.bookedCount + 1;
      const newStatus = newBookedCount >= maxPatients ? SlotStatus.BOOKED : SlotStatus.AVAILABLE;
      await manager.update(Slot, { id: freshNewSlot.id }, { bookedCount: newBookedCount, status: newStatus });

      await manager.update(Appointment, { id: oldAppointment.id }, {
        status: AppointmentStatus.RESCHEDULED,
        rescheduledAt: new Date(),
      });

      const appt = manager.create(Appointment, {
        patientId: patient.id,
        doctorId: doctor.id,
        slotId: freshNewSlot.id,
        date: freshNewSlot.date,
        startTime: this.normalizeTime(freshNewSlot.startTime),
        endTime: this.normalizeTime(freshNewSlot.endTime),
        status: AppointmentStatus.BOOKED,
        tokenNumber: newTokenNumber,
        rescheduledFromId: oldAppointment.id,
        rescheduledAt: new Date(),
      });
      return await manager.save(Appointment, appt);
    });

    return {
      success: true,
      message: `Appointment rescheduled successfully. Your new token number is ${newAppointment.tokenNumber}`,
      data: {
        newAppointment: {
          id: newAppointment.id,
          date: newAppointment.date,
          startTime: this.normalizeTime(newAppointment.startTime),
          endTime: this.normalizeTime(newAppointment.endTime),
          status: newAppointment.status,
          schedulingType: SchedulingType.WAVE,
          tokenNumber: newAppointment.tokenNumber,
          rescheduledFrom: oldAppointment.id,
        },
        previousAppointment: {
          id: oldAppointment.id,
          date: oldAppointment.date,
          startTime: this.normalizeTime(oldAppointment.startTime),
          endTime: this.normalizeTime(oldAppointment.endTime),
          status: AppointmentStatus.RESCHEDULED,
          oldTokenNumber: oldAppointment.tokenNumber,
        },
        doctor: { id: doctor.id, name: doctor.fullName, specialization: doctor.specialization },
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
          rescheduledFromId: appt.rescheduledFromId,
          doctor: doctor
            ? { id: doctor.id, name: doctor.fullName, specialization: doctor.specialization, consultationFee: doctor.consultationFee }
            : null,
          createdAt: appt.createdAt,
        };
      }),
    };
  }

  // ─── Patient: Cancel Appointment ──────────────────────────────────────────

  async cancelAppointment(patient: User, appointmentId: string): Promise<object> {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException(`You are not authorized to cancel this appointment`);
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException(`Appointment is already cancelled`);
    }
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException(`This appointment has been rescheduled. Cancel the new appointment instead`);
    }

    const [year, month, day] = appointment.date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      throw new BadRequestException(`Cannot cancel a past appointment`);
    }

    this.enforceCutoffRule(appointment);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Appointment, { id: appointmentId }, { status: AppointmentStatus.CANCELLED });
      const slot = await manager.findOne(Slot, { where: { id: appointment.slotId } });
      if (slot) {
        if (appointment.tokenNumber !== null) {
          const newBookedCount = Math.max(0, slot.bookedCount - 1);
          await manager.update(Slot, { id: slot.id }, { bookedCount: newBookedCount, status: SlotStatus.AVAILABLE });
        } else {
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
    const profile = await this.doctorProfileRepo.findOne({ where: { userId: doctor.id } });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found. Please complete onboarding first.');
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
          rescheduledFromId: appt.rescheduledFromId,
          patient: patient ? { id: patient.id, name: patient.name, email: patient.email } : null,
          createdAt: appt.createdAt,
        };
      }),
    };
  }
}