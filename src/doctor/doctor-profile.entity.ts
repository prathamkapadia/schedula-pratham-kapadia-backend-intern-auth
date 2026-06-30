import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';

export enum SchedulingType {
  STREAM = 'STREAM',
  WAVE = 'WAVE',
}

@Entity('doctor_profiles')
export class DoctorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  fullName: string;

  @Column()
  specialization: string;

  @Column({ type: 'int' })
  experienceYears: number;

  @Column()
  qualification: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consultationFee: number;

  @Column({ type: 'jsonb', default: [] })
  availability: { day: string; from: string; to: string }[];

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  profilePictureUrl: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ nullable: true })
  achievement: string;

  @Column({ type: 'jsonb', default: [] })
  services: string[];

  // Slot duration in minutes — used only when schedulingType is STREAM
  @Column({ type: 'int', name: 'slot_duration', default: 30 })
  slotDuration: number;

  // STREAM or WAVE scheduling strategy
  @Column({
    type: 'enum',
    enum: SchedulingType,
    name: 'scheduling_type',
    default: SchedulingType.STREAM,
  })
  schedulingType: SchedulingType;

  // Gap in minutes between consecutive STREAM slots — optional, default 0
  @Column({ type: 'int', name: 'buffer_time', default: 0 })
  bufferTime: number;

  // Max patients allowed per WAVE window — required only when schedulingType is WAVE
  @Column({ type: 'int', name: 'max_patients_per_wave', nullable: true })
  maxPatientsPerWave: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}