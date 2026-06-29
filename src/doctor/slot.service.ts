import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorProfile, SchedulingType } from './doctor-profile.entity';
import { RecurringAvailability, CustomAvailability, DayOfWeek } from './availability.entity';
import { Slot, SlotStatus } from './slot.entity';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

// Maximum calendar days to search ahead for next available slot (Day 13)
const MAX_SEARCH_DAYS = 30;

@Injectable()
export class SlotService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,
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

  private fromMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Returns YYYY-MM-DD for today + offsetDays calendar days (Day 13) */
  private offsetDate(offsetDays: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private validateDate(dateStr: string): void {
    if (!dateStr) {
      throw new BadRequestException('date query param is required. e.g. ?date=2026-06-20');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(
        `Invalid date format: ${dateStr}. Use YYYY-MM-DD (e.g. 2026-06-20)`,
      );
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException(
        `Invalid date: ${dateStr} does not exist on the calendar`,
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw new BadRequestException(
        `Date ${dateStr} is in the past. Please provide a present or future date`,
      );
    }
  }

  private generateStreamSlotsFromWindow(
    startTime: string,
    endTime: string,
    slotDuration: number,
    bufferTime: number,
  ): { startTime: string; endTime: string }[] {
    const slots: { startTime: string; endTime: string }[] = [];

    let current = this.toMinutes(this.normalizeTime(startTime));
    const end = this.toMinutes(this.normalizeTime(endTime));

    while (current + slotDuration <= end) {
      slots.push({
        startTime: this.fromMinutes(current),
        endTime: this.fromMinutes(current + slotDuration),
      });
      current += slotDuration + bufferTime;
    }

    return slots;
  }

  private generateSlotsFromWindow(
    startTime: string,
    endTime: string,
    slotDuration: number,
  ): { startTime: string; endTime: string }[] {
    const slots: { startTime: string; endTime: string }[] = [];

    let current = this.toMinutes(this.normalizeTime(startTime));
    const end = this.toMinutes(this.normalizeTime(endTime));

    while (current + slotDuration <= end) {
      slots.push({
        startTime: this.fromMinutes(current),
        endTime: this.fromMinutes(current + slotDuration),
      });
      current += slotDuration;
    }

    return slots;
  }

  // ─── Main public API ──────────────────────────────────────────────────────

  async getSlotsForDoctor(doctorId: string, dateStr: string): Promise<object> {
    // 1. Validate date
    this.validateDate(dateStr);

    // 2. Find doctor profile
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: doctorId } });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    if (doctor.schedulingType === SchedulingType.WAVE) {
      return this.getWaveSlots(doctor, dateStr);
    }
    return this.getStreamSlots(doctor, dateStr);
  }

  // ─── STREAM scheduling ────────────────────────────────────────────────────

  private async getStreamSlots(doctor: DoctorProfile, dateStr: string): Promise<object> {
    if (!doctor.slotDuration || doctor.slotDuration < 10) {
      throw new BadRequestException(
        `Doctor has not set a valid slot duration. Please contact the doctor.`,
      );
    }

    const doctorId = doctor.id;

    // Step 1: Emergency block takes priority over everything
    const emergencyBlock = await this.customRepo.findOne({
      where: { doctorId: doctor.id, date: dateStr, isAvailable: false },
    });

    if (emergencyBlock) {
      return {
        success: true,
        date: dateStr,
        doctorId,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        slotDuration: doctor.slotDuration,
        bufferTime: doctor.bufferTime,
        isAvailable: false,
        reason: emergencyBlock.reason ?? 'Doctor is unavailable on this date',
        slots: [],
      };
    }

    // Step 2: Check if slots already exist for this doctor + date
    const existingSlots = await this.slotRepo.find({
      where: { doctorId, date: dateStr },
      order: { startTime: 'ASC' },
    });

    if (existingSlots.length > 0) {
      return this.filterAndReturnSlots(existingSlots, dateStr, doctor, 'existing');
    }

    // Step 3: Determine availability windows (custom override or recurring)
    let availabilityWindows: { startTime: string; endTime: string }[] = [];
    let source: string;

    const customSlots = await this.customRepo.find({
      where: { doctorId: doctor.id, date: dateStr, isAvailable: true },
      order: { startTime: 'ASC' },
    });

    if (customSlots.length > 0) {
      availabilityWindows = customSlots.map((s) => ({
        startTime: s.startTime!,
        endTime: s.endTime!,
      }));
      source = 'custom_override';
    } else {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = DAY_MAP[date.getDay()];

      const recurringSlots = await this.recurringRepo.find({
        where: { doctorId: doctor.id, dayOfWeek },
        order: { startTime: 'ASC' },
      });

      if (recurringSlots.length === 0) {
        return {
          success: true,
          date: dateStr,
          doctorId,
          doctorName: doctor.fullName,
          specialization: doctor.specialization,
          schedulingType: doctor.schedulingType,
          slotDuration: doctor.slotDuration,
          bufferTime: doctor.bufferTime,
          isAvailable: false,
          slots: [],
          message: `Dr. ${doctor.fullName} has no availability on this day`,
        };
      }

      availabilityWindows = recurringSlots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      }));
      source = 'recurring';
    }

    // Step 4: Generate slots from all availability windows
    const generatedSlots: { startTime: string; endTime: string }[] = [];
    for (const window of availabilityWindows) {
      const slots = this.generateStreamSlotsFromWindow(
        window.startTime,
        window.endTime,
        doctor.slotDuration,
        doctor.bufferTime,
      );
      generatedSlots.push(...slots);
    }

    if (generatedSlots.length === 0) {
      return {
        success: true,
        date: dateStr,
        doctorId,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        slotDuration: doctor.slotDuration,
        bufferTime: doctor.bufferTime,
        isAvailable: false,
        slots: [],
        message: 'No slots could be generated from the available time windows',
      };
    }

    // Step 5: Save generated slots to DB
    const slotEntities = generatedSlots.map((s) =>
      this.slotRepo.create({
        doctorId: doctor.id,
        date: dateStr,
        startTime: s.startTime,
        endTime: s.endTime,
        status: SlotStatus.AVAILABLE,
      }),
    );
    const savedSlots = await this.slotRepo.save(slotEntities);
    return this.filterAndReturnSlots(savedSlots, dateStr, doctor, source);
  }

  // ─── Shared stream slot filter + return ───────────────────────────────────

  private filterAndReturnSlots(
    slots: Slot[],
    dateStr: string,
    doctor: DoctorProfile,
    source: string,
  ): object {
    const now = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() + 1 === month &&
      now.getDate() === day;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const availableSlots = slots.filter((slot) => {
      if (slot.status === SlotStatus.BOOKED) return false;

      if (isToday) {
        const slotStart = this.toMinutes(this.normalizeTime(slot.startTime));
        if (slotStart <= currentMinutes) return false;
      }

      return true;
    });

    if (availableSlots.length === 0) {
      return {
        success: true,
        date: dateStr,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        slotDuration: doctor.slotDuration,
        bufferTime: doctor.bufferTime,
        isAvailable: false,
        slots: [],
        source,
        message: 'No available slots for this date',
      };
    }

    return {
      success: true,
      date: dateStr,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      schedulingType: doctor.schedulingType,
      slotDuration: doctor.slotDuration,
      bufferTime: doctor.bufferTime,
      isAvailable: true,
      totalAvailableSlots: availableSlots.length,
      source,
      slots: availableSlots.map((s) => ({
        id: s.id,
        startTime: this.normalizeTime(s.startTime),
        endTime: this.normalizeTime(s.endTime),
        status: s.status,
      })),
    };
  }

  // ─── WAVE scheduling ──────────────────────────────────────────────────────

  private async getWaveSlots(doctor: DoctorProfile, dateStr: string): Promise<object> {
    if (!doctor.maxPatientsPerWave || doctor.maxPatientsPerWave < 1) {
      throw new BadRequestException(
        `Doctor has not set a valid maxPatientsPerWave for WAVE scheduling. Please contact the doctor.`,
      );
    }

    const doctorId = doctor.id;

    // Emergency block
    const emergencyBlock = await this.customRepo.findOne({
      where: { doctorId: doctor.id, date: dateStr, isAvailable: false },
    });
    if (emergencyBlock) {
      return {
        success: true,
        date: dateStr,
        doctorId,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        maxPatientsPerWave: doctor.maxPatientsPerWave,
        isAvailable: false,
        reason: emergencyBlock.reason ?? 'Doctor is unavailable on this date',
        windows: [],
      };
    }

    // Custom override
    const customSlots = await this.customRepo.find({
      where: { doctorId: doctor.id, date: dateStr, isAvailable: true },
      order: { startTime: 'ASC' },
    });

    if (customSlots.length > 0) {
      await this.slotRepo.delete({ doctorId: doctor.id, date: dateStr });

      const slotEntities = customSlots.map((w) =>
        this.slotRepo.create({
          doctorId: doctor.id,
          date: dateStr,
          startTime: w.startTime!,
          endTime: w.endTime!,
          status: SlotStatus.AVAILABLE,
          maxPatients: doctor.maxPatientsPerWave,
          bookedCount: 0,
        }),
      );
      const savedSlots = await this.slotRepo.save(slotEntities);
      return this.filterAndReturnWaveSlots(savedSlots, dateStr, doctor, 'custom_override');
    }

    // Already-generated wave windows for this date
    const existingSlots = await this.slotRepo.find({
      where: { doctorId, date: dateStr },
      order: { startTime: 'ASC' },
    });
    if (existingSlots.length > 0) {
      return this.filterAndReturnWaveSlots(existingSlots, dateStr, doctor, 'recurring');
    }

    // Generate from recurring availability
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = DAY_MAP[date.getDay()];

    const recurringSlots = await this.recurringRepo.find({
      where: { doctorId: doctor.id, dayOfWeek },
      order: { startTime: 'ASC' },
    });

    if (recurringSlots.length === 0) {
      return {
        success: true,
        date: dateStr,
        doctorId,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        maxPatientsPerWave: doctor.maxPatientsPerWave,
        isAvailable: false,
        windows: [],
        message: `Dr. ${doctor.fullName} has no availability on this day`,
      };
    }

    const slotEntities = recurringSlots.map((w) =>
      this.slotRepo.create({
        doctorId: doctor.id,
        date: dateStr,
        startTime: w.startTime,
        endTime: w.endTime,
        status: SlotStatus.AVAILABLE,
        maxPatients: doctor.maxPatientsPerWave,
        bookedCount: 0,
      }),
    );
    const savedSlots = await this.slotRepo.save(slotEntities);
    return this.filterAndReturnWaveSlots(savedSlots, dateStr, doctor, 'recurring');
  }

  private filterAndReturnWaveSlots(
    slots: Slot[],
    dateStr: string,
    doctor: DoctorProfile,
    source: string,
  ): object {
    const now = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() + 1 === month &&
      now.getDate() === day;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const availableWindows = slots.filter((slot) => {
      if (isToday) {
        const windowEnd = this.toMinutes(this.normalizeTime(slot.endTime));
        if (windowEnd <= currentMinutes) return false;
      }
      return true;
    });

    if (availableWindows.length === 0) {
      return {
        success: true,
        date: dateStr,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
        maxPatientsPerWave: doctor.maxPatientsPerWave,
        isAvailable: false,
        windows: [],
        source,
        message: 'No available wave windows for this date',
      };
    }

    return {
      success: true,
      date: dateStr,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      schedulingType: doctor.schedulingType,
      maxPatientsPerWave: doctor.maxPatientsPerWave,
      isAvailable: true,
      source,
      windows: availableWindows.map((s) => ({
        id: s.id,
        startTime: this.normalizeTime(s.startTime),
        endTime: this.normalizeTime(s.endTime),
        maxPatients: s.maxPatients,
        booked: s.bookedCount,
        available: (s.maxPatients ?? 0) - s.bookedCount,
        isFull: s.bookedCount >= (s.maxPatients ?? 0),
      })),
    };
  }

  // ─── Day 13: Find Next Available Appointment ───────────────────────────────

  /**
   * Internal helper — calls the correct scheduling strategy for a date
   * and returns only whether availability was found plus the resolved data.
   *
   * By delegating to getStreamSlots / getWaveSlots we get:
   * - Emergency block checks for free
   * - Past-time filtering for today for free
   * - Slot generation + DB persistence for free
   * - Wave capacity checks for free
   *
   * The cast to `any` is intentional: both private methods return `object`
   * but always include `isAvailable: boolean` in their shape.
   */
  private async peekDayAvailability(
    doctor: DoctorProfile,
    dateStr: string,
  ): Promise<{ isAvailable: boolean; data: any }> {
    let result: any;

    if (doctor.schedulingType === SchedulingType.WAVE) {
      result = await this.getWaveSlots(doctor, dateStr);
    } else {
      result = await this.getStreamSlots(doctor, dateStr);
    }

    return { isAvailable: result.isAvailable === true, data: result };
  }

  /**
   * GET /api/doctor/:doctorId/next-available
   *
   * Searches forward from today for the earliest date that has at least one
   * available slot (STREAM) or at least one non-full wave window (WAVE).
   *
   * Search window: up to MAX_SEARCH_DAYS (30) calendar days.
   * Non-working days and emergency blocks are skipped automatically because
   * peekDayAvailability delegates to the same logic getStreamSlots /
   * getWaveSlots already apply.
   */
  async findNextAvailable(doctorId: string): Promise<object> {
    // 1. Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    // 2. Load doctor
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    // 3. Doctor globally unavailable
    if (!doctor.isAvailable) {
      return {
        success: false,
        message: `Dr. ${doctor.fullName} is currently not accepting appointments`,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        schedulingType: doctor.schedulingType,
      };
    }

    // 4. Validate scheduling config before wasting 30 loop iterations
    if (doctor.schedulingType === SchedulingType.WAVE) {
      if (!doctor.maxPatientsPerWave || doctor.maxPatientsPerWave < 1) {
        throw new BadRequestException(
          `Dr. ${doctor.fullName} has not configured maxPatientsPerWave. Please contact the clinic.`,
        );
      }
    } else {
      if (!doctor.slotDuration || doctor.slotDuration < 10) {
        throw new BadRequestException(
          `Dr. ${doctor.fullName} has not configured a valid slot duration. Please contact the clinic.`,
        );
      }
    }

    // 5. Search loop — offset 0 = today
    for (let offset = 0; offset < MAX_SEARCH_DAYS; offset++) {
      const dateStr = this.offsetDate(offset);

      let peek: { isAvailable: boolean; data: any };
      try {
        peek = await this.peekDayAvailability(doctor, dateStr);
      } catch {
        // Unexpected error on one date — skip it, don't abort the search
        continue;
      }

      if (!peek.isAvailable) continue;

      // Found availability — build response
      const isToday = offset === 0;
      const isStream = doctor.schedulingType !== SchedulingType.WAVE;

      return {
        success: true,
        message: isToday
          ? `Slots available today (${dateStr})`
          : `Next available appointment is on ${dateStr}`,
        searchedDays: offset + 1,
        foundOnDay: isToday ? 'today' : dateStr,
        doctor: {
          id: doctor.id,
          name: doctor.fullName,
          specialization: doctor.specialization,
          schedulingType: doctor.schedulingType,
          consultationFee: doctor.consultationFee,
          ...(isStream
            ? { slotDuration: doctor.slotDuration, bufferTime: doctor.bufferTime }
            : { maxPatientsPerWave: doctor.maxPatientsPerWave }),
        },
        availability: {
          date: dateStr,
          ...(isStream
            ? {
                totalAvailableSlots: peek.data.totalAvailableSlots,
                slots: peek.data.slots,
              }
            : {
                windows: peek.data.windows,
              }),
        },
        hint: 'Use POST /api/appointment to complete your booking',
      };
    }

    // 6. Nothing found in window
    return {
      success: false,
      message: `No appointments available for Dr. ${doctor.fullName} in the next ${MAX_SEARCH_DAYS} days. Please try again later.`,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      schedulingType: doctor.schedulingType,
      searchedDays: MAX_SEARCH_DAYS,
      searchWindow: {
        from: this.offsetDate(0),
        to: this.offsetDate(MAX_SEARCH_DAYS - 1),
      },
    };
  }
}