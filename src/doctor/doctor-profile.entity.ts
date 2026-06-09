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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}