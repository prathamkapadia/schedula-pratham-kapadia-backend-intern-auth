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

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('patient_profiles')
export class PatientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  fullName: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  bloodGroup: string;

  @Column({ nullable: true })
  allergies: string;

  @Column({ nullable: true })
  existingConditions: string;

  @Column({ nullable: true })
  currentMedications: string;

  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}