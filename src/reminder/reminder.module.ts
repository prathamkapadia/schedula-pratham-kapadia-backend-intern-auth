import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointment/appointment.entity';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { NotificationModule } from '../notification/notification.module';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Appointment, DoctorProfile]),
    NotificationModule,
  ],
  providers: [ReminderService],
})
export class ReminderModule {}