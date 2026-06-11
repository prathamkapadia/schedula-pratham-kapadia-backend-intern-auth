import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { User, Role } from '../auth/user.entity';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
  CreateCustomAvailabilityDto,
} from './availability.dto';

@Controller('api/doctor/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Static routes FIRST — must be before :id routes to avoid conflict

  // POST /api/doctor/availability/override
  @Post('override')
  createOverride(@CurrentUser() user: User, @Body() dto: CreateCustomAvailabilityDto) {
    return this.availabilityService.createOverride(user, dto);
  }

  // GET /api/doctor/availability/date?date=2026-06-15
  @Get('date')
  getAvailabilityByDate(@CurrentUser() user: User, @Query('date') date: string) {
    return this.availabilityService.getAvailabilityByDate(user, date);
  }

  // POST /api/doctor/availability
  @Post()
  createRecurring(@CurrentUser() user: User, @Body() dto: CreateRecurringAvailabilityDto) {
    return this.availabilityService.createRecurring(user, dto);
  }

  // GET /api/doctor/availability
  @Get()
  getRecurring(@CurrentUser() user: User) {
    return this.availabilityService.getRecurring(user);
  }

  // PATCH /api/doctor/availability/:id
  @Patch(':id')
  updateRecurring(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateRecurringAvailabilityDto) {
    return this.availabilityService.updateRecurring(user, id, dto);
  }

  // DELETE /api/doctor/availability/:id
  @Delete(':id')
  deleteRecurring(@CurrentUser() user: User, @Param('id') id: string) {
    return this.availabilityService.deleteRecurring(user, id);
  }
}