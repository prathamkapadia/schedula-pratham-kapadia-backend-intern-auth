import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DoctorProfile } from './doctor-profile.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Entity('recurring_availability')
export class RecurringAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorProfile;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column({ type: 'enum', enum: DayOfWeek, name: 'day_of_week' })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('custom_availability')
export class CustomAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorProfile;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', name: 'start_time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', name: 'end_time', nullable: true })
  endTime: string | null;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}