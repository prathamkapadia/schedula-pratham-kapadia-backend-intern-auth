import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';
import { RecurringAvailability } from './doctor/availability.entity';
import { CustomAvailability } from './doctor/availability.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, DoctorProfile, PatientProfile, RecurringAvailability, CustomAvailability],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});