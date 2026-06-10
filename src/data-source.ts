import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'schedula',
  entities: [User, DoctorProfile, PatientProfile],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});