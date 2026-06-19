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
import { BookAppointmentDto } from './appointment.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { User, Role } from '../auth/user.entity';

@Controller('api/appointment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {

  constructor(private readonly appointmentService: AppointmentService) {}

  // POST /api/appointment — Patient books a slot
  @Post()
  @Roles(Role.PATIENT)
  bookAppointment(@CurrentUser() user: User, @Body() dto: BookAppointmentDto) {
    return this.appointmentService.bookAppointment(user, dto);
  }

  // GET /api/appointment/my — Patient views their appointments
  // MUST be before :id route
  @Get('my')
  @Roles(Role.PATIENT)
  getMyAppointments(@CurrentUser() user: User) {
    return this.appointmentService.getMyAppointments(user);
  }

  // PATCH /api/appointment/:id/cancel — Patient cancels appointment
  @Patch(':id/cancel')
  @Roles(Role.PATIENT)
  cancelAppointment(@CurrentUser() user: User, @Param('id') id: string) {
    return this.appointmentService.cancelAppointment(user, id);
  }
}