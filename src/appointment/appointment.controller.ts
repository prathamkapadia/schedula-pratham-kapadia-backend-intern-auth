import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto, RescheduleAppointmentDto } from './appointment.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { User, Role } from '../auth/user.entity';

@Controller('api/appointment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @Roles(Role.PATIENT)
  bookAppointment(@CurrentUser() user: User, @Body() dto: BookAppointmentDto) {
    return this.appointmentService.bookAppointment(user, dto);
  }

  @Get('my')
  @Roles(Role.PATIENT)
  getMyAppointments(@CurrentUser() user: User) {
    return this.appointmentService.getMyAppointments(user);
  }

  @Patch(':id/cancel')
  @Roles(Role.PATIENT)
  cancelAppointment(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentService.cancelAppointment(user, id);
  }

  @Patch(':id/reschedule')
  @Roles(Role.PATIENT)
  rescheduleAppointment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentService.rescheduleAppointment(user, id, dto);
  }
}