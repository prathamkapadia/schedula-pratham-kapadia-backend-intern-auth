import { Module, Controller, Get } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { User } from './auth/user.entity';

@Controller()
class AppController {
  @Get()
  health() {
    return {
      message: '🏥 Schedula API running!',
      routes: {
        'POST /api/auth/signup': 'Register (DOCTOR or PATIENT)',
        'POST /api/auth/login': 'Login → get JWT token',
        'GET /api/auth/me': 'Current user [any role]',
        'GET /api/doctor/profile': '[DOCTOR only]',
        'GET /api/doctor/dashboard': '[DOCTOR only]',
        'GET /api/doctor/patients': '[DOCTOR only]',
        'GET /api/patient/profile': '[PATIENT only]',
        'GET /api/patient/dashboard': '[PATIENT only]',
        'GET /api/patient/doctors': '[PATIENT only]',
      },
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'schedula',
      entities: [User],
      synchronize: true,
    }),
    AuthModule,
    DoctorModule,
    PatientModule,
  ],
  controllers: [AppController],
})
export class AppModule {}