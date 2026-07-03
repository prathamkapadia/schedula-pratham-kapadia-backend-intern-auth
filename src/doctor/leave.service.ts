import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { DoctorProfile } from './doctor-profile.entity';
import { DoctorLeave } from './doctor-leave.entity';
import { Appointment, AppointmentStatus } from '../appointment/appointment.entity';
import { CreateLeaveDto, UpdateLeaveDto } from './leave.dto';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
    @InjectRepository(DoctorLeave)
    private readonly leaveRepo: Repository<DoctorLeave>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getDoctorProfile(userId: string): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /api/doctor/profile first.',
      );
    }
    return profile;
  }

  // Validate date format, calendar validity, and reject past dates
  private validateLeaveDate(dateStr: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException(
        `Invalid date format: ${dateStr}. Use YYYY-MM-DD (e.g. 2026-07-10)`,
      );
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException(`Invalid date: ${dateStr} does not exist on the calendar`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw new BadRequestException(
        `Cannot apply leave for a past date: ${dateStr}. Please choose today or a future date.`,
      );
    }
  }

  // Are there any active (BOOKED) appointments for this doctor on this date?
  private async hasActiveAppointments(doctorId: string, date: string): Promise<boolean> {
    const count = await this.appointmentRepo.count({
      where: { doctorId, date, status: AppointmentStatus.BOOKED },
    });
    return count > 0;
  }

  // ─── Create Leave ──────────────────────────────────────────────────────────

  async createLeave(doctor: User, dto: CreateLeaveDto): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    this.validateLeaveDate(dto.date);

    const duplicate = await this.leaveRepo.findOne({
      where: { doctorId: profile.id, date: dto.date },
    });
    if (duplicate) {
      throw new ConflictException(
        `Leave already exists for ${dto.date}. Use PATCH /api/doctor/leave/${duplicate.id} to update it.`,
      );
    }

    const appointmentsExist = await this.hasActiveAppointments(profile.id, dto.date);
    if (appointmentsExist) {
      throw new ConflictException(
        `Cannot apply leave. Appointments are already scheduled on ${dto.date}. ` +
        `Please cancel or reschedule existing appointments first.`,
      );
    }

    const leave = this.leaveRepo.create({
      doctorId: profile.id,
      date: dto.date,
      reason: dto.reason ?? null,
    });
    const saved = await this.leaveRepo.save(leave);

    return {
      success: true,
      message: 'Leave created successfully. Patients will not be able to book on this date.',
      data: saved,
    };
  }

  // ─── Get Leaves ────────────────────────────────────────────────────────────

  async getLeaves(doctor: User): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);
    const leaves = await this.leaveRepo.find({
      where: { doctorId: profile.id },
      order: { date: 'ASC' },
    });
    return {
      success: true,
      message: 'Leaves fetched successfully',
      count: leaves.length,
      data: leaves,
    };
  }

  // ─── Update Leave ──────────────────────────────────────────────────────────

  async updateLeave(doctor: User, leaveId: string, dto: UpdateLeaveDto): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    const leave = await this.leaveRepo.findOne({ where: { id: leaveId } });
    if (!leave) {
      throw new NotFoundException(`Leave with ID ${leaveId} not found`);
    }
    if (leave.doctorId !== profile.id) {
      throw new ForbiddenException(`You are not authorized to update this leave`);
    }

    const newDate = dto.date ?? leave.date;

    if (dto.date) {
      this.validateLeaveDate(dto.date);

      // duplicate check against a different leave record on the same new date
      const duplicate = await this.leaveRepo.findOne({
        where: { doctorId: profile.id, date: newDate },
      });
      if (duplicate && duplicate.id !== leave.id) {
        throw new ConflictException(`Leave already exists for ${newDate}`);
      }

      const appointmentsExist = await this.hasActiveAppointments(profile.id, newDate);
      if (appointmentsExist) {
        throw new ConflictException(
          `Cannot update leave. Appointments are already scheduled on ${newDate}. ` +
          `Please cancel or reschedule existing appointments first.`,
        );
      }
    }

    leave.date = newDate;
    if (dto.reason !== undefined) {
      leave.reason = dto.reason;
    }

    const updated = await this.leaveRepo.save(leave);

    return {
      success: true,
      message: 'Leave updated successfully',
      data: updated,
    };
  }

  // ─── Delete Leave ──────────────────────────────────────────────────────────

  async deleteLeave(doctor: User, leaveId: string): Promise<object> {
    const profile = await this.getDoctorProfile(doctor.id);

    const leave = await this.leaveRepo.findOne({ where: { id: leaveId } });
    if (!leave) {
      throw new NotFoundException(`Leave with ID ${leaveId} not found`);
    }
    if (leave.doctorId !== profile.id) {
      throw new ForbiddenException(`You are not authorized to delete this leave`);
    }

    await this.leaveRepo.remove(leave);

    return {
      success: true,
      message: 'Leave deleted successfully',
      data: { id: leaveId },
    };
  }

  // ─── Used by AppointmentService: check if a doctor is on leave for a date ──

  async isDoctorOnLeave(doctorId: string, date: string): Promise<DoctorLeave | null> {
    return this.leaveRepo.findOne({ where: { doctorId, date } });
  }
}