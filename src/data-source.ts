import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';
<<<<<<< Updated upstream
=======
import { RecurringAvailability, CustomAvailability } from './doctor/availability.entity';
import { Slot } from './doctor/slot.entity';
import { Appointment } from './appointment/appointment.entity';
>>>>>>> Stashed changes

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
<<<<<<< Updated upstream
  entities: [User, DoctorProfile, PatientProfile],
=======
  entities: [
    User,
    DoctorProfile,
    PatientProfile,
    RecurringAvailability,
    CustomAvailability,
    Slot,
    Appointment,
  ],
>>>>>>> Stashed changes
  migrations: ['dist/migrations/*.js'],
  synchronize: true,
  ssl: {
    rejectUnauthorized: false,
  },
});