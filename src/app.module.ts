import { Module, Controller, Get } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';

@Controller()
class AppController {
  @Get()
  health() {
    return {
      message: '🏥 Schedula API running!',
      routes: {
        'POST /api/auth/signup': 'Register (DOCTOR or PATIENT)',
        'POST /api/auth/login': 'Login => get JWT token',
        'GET  /api/auth/me': 'Current user [any role]',
        'POST  /api/doctor/profile': 'Create doctor profile [DOCTOR only]',
        'GET   /api/doctor/profile': 'Get doctor profile [DOCTOR only]',
        'PATCH /api/doctor/profile': 'Update doctor profile [DOCTOR only]',
        'GET   /api/doctor/dashboard': 'Doctor dashboard [DOCTOR only]',
        'GET   /api/doctor/patients': 'List all patients [DOCTOR only]',
        'GET   /api/doctor': 'Discover doctors [PUBLIC]',
        'GET   /api/doctor/:id': 'Doctor profile by ID [PUBLIC]',
        'POST  /api/patient/profile': 'Create patient profile [PATIENT only]',
        'GET   /api/patient/profile': 'Get patient profile [PATIENT only]',
        'PATCH /api/patient/profile': 'Update patient profile [PATIENT only]',
        'GET   /api/patient/dashboard': 'Patient dashboard [PATIENT only]',
        'GET   /api/patient/doctors': 'List available doctors [PATIENT only]',
      },
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
   TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ito1md4xQbWk@ep-curly-unit-ao9bv1fi-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    entities: [User, DoctorProfile, PatientProfile],
    synchronize: true,
    ssl: { rejectUnauthorized: false },
    extra: {
      connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ito1md4xQbWk@ep-curly-unit-ao9bv1fi-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    },
  }),
}),
    AuthModule,
    DoctorModule,
    PatientModule,
  ],
  controllers: [AppController],
})
export class AppModule {}