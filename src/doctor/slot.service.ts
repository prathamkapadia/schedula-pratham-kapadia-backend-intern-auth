import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorProfile } from './doctor-profile.entity';
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

  async getSlotsForDoctor(doctorId: string, dateStr: string): Promise<object> {
    // 1. Validate date
    this.validateDate(dateStr);

    // 2. Find doctor profile
    const doctor = await this.doctorProfileRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }
    if (!doctor.slotDuration || doctor.slotDuration < 10) {
      throw new BadRequestException(
        `Doctor has not set a valid slot duration. Please contact the doctor.`,
      );
    }

    // 3. Emergency block FIRST — always takes priority over everything
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
        slotDuration: doctor.slotDuration,
        isAvailable: false,
        reason: emergencyBlock.reason ?? 'Doctor is unavailable on this date',
        slots: [],
      };
    }

    // 4. Check custom override slots — if exist regenerate from custom
    const customSlots = await this.customRepo.find({
      where: { doctorId: doctor.id, date: dateStr, isAvailable: true },
      order: { startTime: 'ASC' },
    });

    if (customSlots.length > 0) {
      // Delete existing slots and regenerate from custom override
      await this.slotRepo.delete({ doctorId: doctor.id, date: dateStr });

      const generatedSlots: { startTime: string; endTime: string }[] = [];
      for (const window of customSlots) {
        const slots = this.generateSlotsFromWindow(
          window.startTime!,
          window.endTime!,
          doctor.slotDuration,
        );
        generatedSlots.push(...slots);
      }

      if (generatedSlots.length === 0) {
        return {
          success: true,
          date: dateStr,
          doctorId: doctor.id,
          doctorName: doctor.fullName,
          specialization: doctor.specialization,
          slotDuration: doctor.slotDuration,
          isAvailable: false,
          slots: [],
          message: 'No slots could be generated from custom availability',
        };
      }

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
      return this.filterAndReturnSlots(savedSlots, dateStr, doctor, 'custom_override');
    }

    // 5. Check if slots already exist (recurring based)
    const existingSlots = await this.slotRepo.find({
      where: { doctorId, date: dateStr },
      order: { startTime: 'ASC' },
    });

    if (existingSlots.length > 0) {
      return this.filterAndReturnSlots(existingSlots, dateStr, doctor, 'recurring');
    }

    // 6. Generate from recurring availability
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
        slotDuration: doctor.slotDuration,
        isAvailable: false,
        slots: [],
        message: `Dr. ${doctor.fullName} has no availability on this day`,
      };
    }

    const availabilityWindows = recurringSlots.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    const generatedSlots: { startTime: string; endTime: string }[] = [];
    for (const window of availabilityWindows) {
      const slots = this.generateSlotsFromWindow(
        window.startTime,
        window.endTime,
        doctor.slotDuration,
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
        slotDuration: doctor.slotDuration,
        isAvailable: false,
        slots: [],
        message: 'No slots could be generated from the available time windows',
      };
    }

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
    return this.filterAndReturnSlots(savedSlots, dateStr, doctor, 'recurring');
  }

  private filterAndReturnSlots(
    slots: Slot[],
    dateStr: string,
    doctor: DoctorProfile,
    source: string = 'recurring',
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
        slotDuration: doctor.slotDuration,
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
      slotDuration: doctor.slotDuration,
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
}