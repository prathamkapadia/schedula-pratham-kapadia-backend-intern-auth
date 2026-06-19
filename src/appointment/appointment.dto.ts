import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format (e.g. 2026-06-20)',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 10:00)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 10:30)',
  })
  endTime: string;
}

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'newDate must be in YYYY-MM-DD format (e.g. 2026-06-20)',
  })
  newDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'newStartTime must be in HH:MM format (e.g. 10:00)',
  })
  newStartTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'newEndTime must be in HH:MM format (e.g. 10:30)',
  })
  newEndTime: string;
}