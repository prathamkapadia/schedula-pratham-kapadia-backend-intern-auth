import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum Role {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ nullable: true, type: 'varchar' })
  specialization: string;

  @Column({ nullable: true, type: 'varchar' })
  licenseNumber: string;

  @Column({ nullable: true, type: 'varchar' })
  dateOfBirth: string;

  @Column({ nullable: true, type: 'varchar' })
  bloodGroup: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}