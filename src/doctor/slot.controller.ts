import { Controller, Get, Param, Query } from '@nestjs/common';
import { SlotService } from './slot.service';

@Controller('api/doctor')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  // GET /api/doctor/:doctorId/slots?date=2026-06-20
  // Public route — no auth required, patients can view
  @Get(':doctorId/slots')
  getSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.slotService.getSlotsForDoctor(doctorId, date);
  }

  // GET /api/doctor/:doctorId/next-available
  // Public route — finds the earliest date with available slots/windows.
  // Works for both STREAM and WAVE scheduling types (Day 13).
  @Get(':doctorId/next-available')
  findNextAvailable(@Param('doctorId') doctorId: string) {
    return this.slotService.findNextAvailable(doctorId);
  }
}