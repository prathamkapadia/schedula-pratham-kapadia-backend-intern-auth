import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Appointment } from './appointment.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { NotificationModule } from '../notification/notification.module';
import { Slot } from '../doctor/slot.entity';
import { User } from '../auth/user.entity';
import { DoctorLeave } from '../doctor/doctor-leave.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, DoctorProfile, Slot, User, DoctorLeave]),
    AuthModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}