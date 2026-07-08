import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { DoctorProfile } from './doctor-profile.entity';
import { RecurringAvailability, CustomAvailability, DayOfWeek } from './availability.entity';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
  CreateCustomAvailabilityDto,
} from './availability.dto';

const CLINIC_START = '00:00';
const CLINIC_END = '23:59';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
  ) {}

  // Normalize time: PostgreSQL returns "10:00:00", DTO sends "10:00"
  // Always convert to "HH:MM" for consistent comparison
  private normalizeTime(time: string): string {
    if (!time) return time;
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  // Convert "HH:MM" or "HH:MM:SS" to minutes since midnight
  private toMinutes(time: string): number {
    const parts = time.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  // 1. Invalid time range: endTime must be strictly AFTER startTime
  // Catches: "15:00 – 13:00", "10:00 – 10:00"
  private validateTimeRange(startTime: string, endTime: string): void {
    if (this.toMinutes(endTime) <= this.toMinutes(startTime)) {
      throw new BadRequestException(
        `Invalid time range: endTime (${endTime}) must be after startTime (${startTime})`,
      );
    }
  }

  // 2. Clinic hours: slot must be within 09:00 – 20:00
  private validateClinicHours(startTime: string, endTime: string): void {
    const clinicStart = this.toMinutes(CLINIC_START);
    const clinicEnd = this.toMinutes(CLINIC_END);
    if (this.toMinutes(startTime) < clinicStart) {
      throw new BadRequestException(
        `startTime (${startTime}) is before clinic opening time (${CLINIC_START})`,
      );
    }
    if (this.toMinutes(endTime) > clinicEnd) {
      throw new BadRequestException(
        `endTime (${endTime}) is after clinic closing time (${CLINIC_END})`,
      );
    }
  }

  // 3. Duplicate check: exact same startTime AND endTime on same day/date
  // Normalizes both sides so "10:00" matches "10:00:00" from DB
  private checkDuplicate(
    slots: { startTime: string; endTime: string }[],
    newStart: string,
    newEnd: string,
  ): void {
    const normStart = this.normalizeTime(newStart);
    const normEnd = this.normalizeTime(newEnd);
    const duplicate = slots.find(
      (s) =>
        this.normalizeTime(s.startTime) === normStart &&
        this.normalizeTime(s.endTime) === normEnd,
    );
    if (duplicate) {
      throw new ConflictException(
        `Duplicate entry: slot ${newStart}–${newEnd} already exists for this day`,
      );
    }
  }

  // 4. Overlap check: newStart < existEnd AND newEnd > existStart
  // Catches: 10:00–12:00 overlapping with 11:00–13:00
  // excludeId used during PATCH so slot doesn't conflict with itself
  private checkOverlap(
    slots: { startTime: string; endTime: string; id?: string }[],
    newStart: string,
    newEnd: string,
    excludeId?: string,
  ): void {
    const newS = this.toMinutes(newStart);
    const newE = this.toMinutes(newEnd);
    for (const slot of slots) {
      if (excludeId && slot.id === excludeId) continue;
      const existS = this.toMinutes(slot.startTime);
      const existE = this.toMinutes(slot.endTime);
      if (newS < existE && newE > existS) {
        throw new ConflictException(
          `Time slot ${newStart}–${newEnd} overlaps with existing slot ${this.normalizeTime(slot.startTime)}–${this.normalizeTime(slot.endTime)}`,
        );
      }
    }
  }

  // Get doctor profile by userId — throws 404 if not found
  private async getDoctorProfile(userId: string): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /api/doctor/profile first.',
      );
    }
    return profile;
  }

  // Validate date: format + real calendar date + not in past
  private validateDate(dateStr: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(
        `Invalid date format: ${dateStr}. Use YYYY-MM-DD (e.g. 2026-06-15)`,
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

  // ─── Recurring Availability ───────────────────────────────────────────────

  async createRecurring(doctor: User, dto: CreateRecurringAvailabilityDto): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    this.validateTimeRange(dto.startTime, dto.endTime);   // invalid range
    this.validateClinicHours(dto.startTime, dto.endTime); // clinic hours

    const existingSlots = await this.recurringRepo.find({
      where: { doctorId: profile.id, dayOfWeek: dto.dayOfWeek },
    });

    this.checkDuplicate(existingSlots, dto.startTime, dto.endTime); // duplicate
    this.checkOverlap(existingSlots, dto.startTime, dto.endTime);   // overlap

    const slot = this.recurringRepo.create({
      doctorId: profile.id,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    const saved = await this.recurringRepo.save(slot);

    return {
      success: true,
      message: 'Recurring availability created successfully',
      data: {
        ...saved,
        startTime: this.normalizeTime(saved.startTime),
        endTime: this.normalizeTime(saved.endTime),
      },
    };
  }

  async getRecurring(doctor: User): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);
    const slots = await this.recurringRepo.find({
      where: { doctorId: profile.id },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    const grouped = slots.reduce(
      (acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
        acc[slot.dayOfWeek].push({
          id: slot.id,
          startTime: this.normalizeTime(slot.startTime),
          endTime: this.normalizeTime(slot.endTime),
        });
        return acc;
      },
      {} as Record<string, object[]>,
    );
    return {
      success: true,
      message: 'Recurring availability fetched successfully',
      data: grouped,
      totalSlots: slots.length,
    };
  }

  async updateRecurring(doctor: User, id: string, dto: UpdateRecurringAvailabilityDto): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);
    const slot = await this.recurringRepo.findOne({ where: { id, doctorId: profile.id } });
    if (!slot) {
      throw new NotFoundException(`Recurring availability slot with ID ${id} not found`);
    }

    const newDayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek;
    const newStartTime = dto.startTime ?? this.normalizeTime(slot.startTime);
    const newEndTime = dto.endTime ?? this.normalizeTime(slot.endTime);

    this.validateTimeRange(newStartTime, newEndTime);
    this.validateClinicHours(newStartTime, newEndTime);

    const existingSlots = await this.recurringRepo.find({
      where: { doctorId: profile.id, dayOfWeek: newDayOfWeek },
    });

    const otherSlots = existingSlots.filter((s) => s.id !== id);
    this.checkDuplicate(otherSlots, newStartTime, newEndTime);
    this.checkOverlap(existingSlots, newStartTime, newEndTime, id);

    slot.dayOfWeek = newDayOfWeek;
    slot.startTime = newStartTime;
    slot.endTime = newEndTime;
    const updated = await this.recurringRepo.save(slot);

    return {
      success: true,
      message: 'Recurring availability updated successfully',
      data: {
        ...updated,
        startTime: this.normalizeTime(updated.startTime),
        endTime: this.normalizeTime(updated.endTime),
      },
    };
  }

  async deleteRecurring(doctor: User, id: string): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);
    const slot = await this.recurringRepo.findOne({ where: { id, doctorId: profile.id } });
    if (!slot) {
      throw new NotFoundException(`Recurring availability slot with ID ${id} not found`);
    }
    await this.recurringRepo.remove(slot);
    return { success: true, message: 'Recurring availability slot deleted successfully' };
  }

  // ─── Custom Override ──────────────────────────────────────────────────────

  async createOverride(doctor: User, dto: CreateCustomAvailabilityDto): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    this.validateDate(dto.date);

    if (dto.isAvailable) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          'startTime and endTime are required when isAvailable is true',
        );
      }
      this.validateTimeRange(dto.startTime, dto.endTime);
      this.validateClinicHours(dto.startTime, dto.endTime);

      const existingOverrides = await this.customRepo.find({
        where: { doctorId: profile.id, date: dto.date, isAvailable: true },
      });
      const existingSlots = existingOverrides.filter(
        (s): s is CustomAvailability & { startTime: string; endTime: string } =>
          s.startTime !== null && s.endTime !== null,
      );
      this.checkDuplicate(existingSlots, dto.startTime, dto.endTime);
      this.checkOverlap(existingSlots, dto.startTime, dto.endTime);
    } else {
      const existingBlock = await this.customRepo.findOne({
        where: { doctorId: profile.id, date: dto.date, isAvailable: false },
      });
      if (existingBlock) {
        throw new ConflictException(`Doctor is already marked as unavailable on ${dto.date}`);
      }
    }

    const override = this.customRepo.create({
      doctorId: profile.id,
      date: dto.date,
      startTime: dto.isAvailable ? dto.startTime! : null,
      endTime: dto.isAvailable ? dto.endTime! : null,
      isAvailable: dto.isAvailable,
      reason: dto.reason ?? null,
    });
    const saved = await this.customRepo.save(override);

    return {
      success: true,
      message: dto.isAvailable
        ? 'Custom availability override created successfully'
        : `Doctor marked as unavailable on ${dto.date}${dto.reason ? ` (${dto.reason})` : ''}`,
      data: {
        ...saved,
        startTime: saved.startTime ? this.normalizeTime(saved.startTime) : null,
        endTime: saved.endTime ? this.normalizeTime(saved.endTime) : null,
      },
    };
  }

  async getAvailabilityByDate(doctor: User, dateStr: string): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    if (!dateStr) {
      throw new BadRequestException('date query param is required. e.g. ?date=2026-06-15');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(
        `Invalid date format: ${dateStr}. Use YYYY-MM-DD (e.g. 2026-06-15)`,
      );
    }

    // Parse locally to avoid timezone getDay() bug
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException(`Invalid date: ${dateStr} does not exist on the calendar`);
    }

    // Step 1: Emergency block?
    const emergencyBlock = await this.customRepo.findOne({
      where: { doctorId: profile.id, date: dateStr, isAvailable: false },
    });
    if (emergencyBlock) {
      return {
        success: true,
        date: dateStr,
        isAvailable: false,
        reason: emergencyBlock.reason ?? 'Doctor is unavailable on this date',
        slots: [],
        source: 'custom_override',
      };
    }

    // Step 2: Custom slots?
    const customSlots = await this.customRepo.find({
      where: { doctorId: profile.id, date: dateStr, isAvailable: true },
      order: { startTime: 'ASC' },
    });
    if (customSlots.length > 0) {
      return {
        success: true,
        date: dateStr,
        isAvailable: true,
        slots: customSlots.map((s) => ({
          id: s.id,
          startTime: this.normalizeTime(s.startTime!),
          endTime: this.normalizeTime(s.endTime!),
        })),
        source: 'custom_override',
        note: 'Custom override is in effect for this date',
      };
    }

    // Step 3: Fall back to recurring
    const dayOfWeek = DAY_MAP[date.getDay()];
    const recurringSlots = await this.recurringRepo.find({
      where: { doctorId: profile.id, dayOfWeek },
      order: { startTime: 'ASC' },
    });

    if (recurringSlots.length === 0) {
      return {
        success: true,
        date: dateStr,
        dayOfWeek,
        isAvailable: false,
        slots: [],
        source: 'recurring',
        note: `No availability set for ${dayOfWeek}`,
      };
    }

    return {
      success: true,
      date: dateStr,
      dayOfWeek,
      isAvailable: true,
      slots: recurringSlots.map((s) => ({
        id: s.id,
        startTime: this.normalizeTime(s.startTime),
        endTime: this.normalizeTime(s.endTime),
      })),
      source: 'recurring',
    };
  }
}