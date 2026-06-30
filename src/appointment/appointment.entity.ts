import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { Slot } from '../doctor/slot.entity';

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorProfile;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => Slot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'slot_id' })
  slot: Slot | null;

  @Column({ name: 'slot_id', nullable: true })
  slotId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  // Day 16: tracks whether a reminder notification has already been sent
  // Prevents duplicate reminders even if the cron job runs multiple times
  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  // Day 13: rescheduling fields
  @Column({ name: 'token_number', type: 'int', nullable: true, default: null })
  tokenNumber: number | null;

  @Column({ name: 'rescheduled_from_id', type: 'uuid', nullable: true, default: null })
  rescheduledFromId: string | null;

  @Column({ name: 'rescheduled_at', type: 'timestamp', nullable: true, default: null })
  rescheduledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}