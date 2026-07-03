import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';
import { RecurringAvailability, CustomAvailability } from './doctor/availability.entity';
import { Slot } from './doctor/slot.entity';
import { Appointment } from './appointment/appointment.entity';
import { DoctorLeave } from './doctor/doctor-leave.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    DoctorProfile,
    PatientProfile,
    RecurringAvailability,
    CustomAvailability,
    Slot,
    Appointment,
    DoctorLeave,
  ],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});