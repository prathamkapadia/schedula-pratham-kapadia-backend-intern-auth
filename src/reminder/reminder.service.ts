import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointment/appointment.entity';
import { DoctorProfile, SchedulingType } from '../doctor/doctor-profile.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.entity';

// How many hours ahead to look for upcoming appointments
const REMINDER_WINDOW_HOURS = 24;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,

    private readonly notificationService: NotificationService,
  ) {}

  // ─── Cron Job ─────────────────────────────────────────────────────────────
  //
  // Runs every hour in production.
  // To test locally, temporarily change to CronExpression.EVERY_MINUTE
  // so you don't have to wait an hour to see it fire.
  //
  // What it does:
  //   1. Calculates the reminder window: now → now + 24 hours
  //   2. Finds all BOOKED appointments within that window where reminderSent = false
  //   3. For each appointment, creates a notification (STREAM or WAVE format)
  //   4. Marks reminderSent = true so it never fires again for that appointment

  @Cron(CronExpression.EVERY_MINUTE)
  async sendAppointmentReminders(): Promise<void> {
    this.logger.log('⏰ Reminder cron job started');

    try {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

      // Build date + time strings for the window
      const nowDate = this.toDateStr(now);
      const windowEndDate = this.toDateStr(windowEnd);
      const nowTime = this.toTimeStr(now);
      const windowEndTime = this.toTimeStr(windowEnd);

      // Fetch all BOOKED appointments that:
      //  - haven't had a reminder sent yet
      //  - fall within today or tomorrow (within the 24h window)
      const appointments = await this.appointmentRepo
        .createQueryBuilder('appt')
        .where('appt.status = :status', { status: AppointmentStatus.BOOKED })
        .andWhere('appt.reminder_sent = false')
        .andWhere(
          // Same day: date = today AND startTime > now
          // OR next day: date = tomorrow AND startTime <= windowEndTime
          `(
            (appt.date = :nowDate AND appt.start_time > :nowTime)
            OR
            (appt.date > :nowDate AND appt.date <= :windowEndDate)
          )`,
          { nowDate, nowTime, windowEndDate, windowEndTime },
        )
        .getMany();

      if (appointments.length === 0) {
        this.logger.log('No upcoming appointments needing reminders');
        return;
      }

      this.logger.log(`Found ${appointments.length} appointment(s) to remind`);

      // Load all doctor profiles in one query
      const doctorIds = [...new Set(appointments.map((a) => a.doctorId))];
      const doctors = await this.doctorProfileRepo.findByIds(doctorIds);
      const doctorMap = new Map(doctors.map((d) => [d.id, d]));

      // Process each appointment
      for (const appointment of appointments) {
        try {
          const doctor = doctorMap.get(appointment.doctorId);

          if (!doctor) {
            this.logger.warn(`Doctor not found for appointment ${appointment.id} — skipping`);
            continue;
          }

          await this.sendReminder(appointment, doctor);

          // Mark as sent — prevents duplicate reminders
          await this.appointmentRepo.update(
            { id: appointment.id },
            { reminderSent: true },
          );

          this.logger.log(`✅ Reminder sent for appointment ${appointment.id}`);
        } catch (err) {
          // Log error for this appointment but continue processing others
          this.logger.error(
            `Failed to send reminder for appointment ${appointment.id}: ${err.message}`,
          );
        }
      }

      this.logger.log('⏰ Reminder cron job completed');
    } catch (err) {
      this.logger.error(`Reminder cron job failed: ${err.message}`);
    }
  }

  // ─── Build and send the correct notification format ───────────────────────

  private async sendReminder(
    appointment: Appointment,
    doctor: DoctorProfile,
  ): Promise<void> {
    const isWave = doctor.schedulingType === SchedulingType.WAVE;
    const formattedTime = this.formatTime(appointment.startTime);
    const formattedDate = this.formatDate(appointment.date);

    let title: string;
    let message: string;

    if (isWave) {
      // Wave: include token number and reporting time
      title = 'Appointment Reminder';
      message =
        `You have an appointment with Dr. ${doctor.fullName} today. ` +
        `Reporting Time: ${formattedTime}. Token Number: ${appointment.tokenNumber ?? 'N/A'}.`;
    } else {
      // Stream: include exact time
      title = 'Appointment Reminder';
      message =
        `You have an appointment with Dr. ${doctor.fullName} on ${formattedDate} at ${formattedTime}.`;
    }

    await this.notificationService.create(
      appointment.patientId,
      NotificationType.APPOINTMENT_REMINDER,
      title,
      message,
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toDateStr(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toTimeStr(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private formatTime(time: string): string {
    // Convert "10:00" → "10:00 AM"
    const [hourStr, minute] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${period}`;
  }

  private formatDate(dateStr: string): string {
    // Convert "2026-07-06" → "6 July 2026"
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${day} ${months[month - 1]} ${year}`;
  }
}