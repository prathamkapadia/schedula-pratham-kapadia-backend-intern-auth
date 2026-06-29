import { Module, Controller, Get } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { AppointmentModule } from './appointment/appointment.module';
import { User } from './auth/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';
import { RecurringAvailability, CustomAvailability } from './doctor/availability.entity';
import { Slot } from './doctor/slot.entity';
import { Appointment } from './appointment/appointment.entity';

@Controller()
class AppController {
  @Get()
  home() {
    return {
      message: '🏥 Schedula API running!',
      routes: {
        'POST /api/auth/signup': 'Register (DOCTOR or PATIENT)',
        'POST /api/auth/login': 'Login => get JWT token',
        'GET  /api/auth/me': 'Current user [any role]',
        'POST /api/doctor/profile': 'Create doctor profile [DOCTOR only]',
        'GET /api/doctor/profile': 'Get doctor profile [DOCTOR only]',
        'PATCH /api/doctor/profile': 'Update doctor profile [DOCTOR only]',
        'GET /api/doctor/dashboard': 'Doctor dashboard [DOCTOR only]',
        'GET /api/doctor/patients': 'List all patients [DOCTOR only]',
        'GET /api/doctor': 'Discover doctors [PUBLIC]',
        'GET /api/doctor/:id': 'Doctor profile by ID [PUBLIC]',
        'GET /api/doctor/:doctorId/slots?date=YYYY-MM-DD': 'Slots for doctor on date [PUBLIC]',
        'GET /api/doctor/:doctorId/next-available': 'Next available slot/wave [PUBLIC] (Day 13)',
        'POST  /api/doctor/availability': 'Create recurring availability [DOCTOR only]',
        'GET   /api/doctor/availability': 'Get recurring availability [DOCTOR only]',
        'PATCH /api/doctor/availability/:id': 'Update recurring slot [DOCTOR only]',
        'DELETE /api/doctor/availability/:id': 'Delete recurring slot [DOCTOR only]',
        'POST  /api/doctor/availability/override': 'Create custom override [DOCTOR only]',
        'GET   /api/doctor/availability/date': 'Get availability by date [DOCTOR only]',
        'GET   /api/doctor/appointments': 'Doctor view appointments [DOCTOR only]',
        'PATCH /api/doctor/appointments/:id/cancel': 'Doctor cancel appointment [DOCTOR only]',
        'POST  /api/appointment': 'Book appointment [PATIENT only]',
        'GET   /api/appointment/my': 'My appointments [PATIENT only]',
        'PATCH /api/appointment/:id/cancel': 'Cancel appointment [PATIENT only]',
        'PATCH /api/appointment/:id/reschedule': 'Reschedule appointment [PATIENT only]',
        'POST /api/patient/profile': 'Create patient profile [PATIENT only]',
        'GET /api/patient/profile': 'Get patient profile [PATIENT only]',
        'PATCH /api/patient/profile': 'Update patient profile [PATIENT only]',
        'GET /api/patient/dashboard': 'Patient dashboard [PATIENT only]',
        'GET /api/patient/doctors': 'List available doctors [PATIENT only]',
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
        url: process.env.DATABASE_URL,
        entities: [
          User,
          DoctorProfile,
          PatientProfile,
          RecurringAvailability,
          CustomAvailability,
          Slot,
          Appointment,
        ],
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    AuthModule,
    DoctorModule,
    PatientModule,
    AppointmentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}