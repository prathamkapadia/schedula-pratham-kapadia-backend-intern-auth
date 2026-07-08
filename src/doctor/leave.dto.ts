import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format (e.g. 2026-07-10)',
  })
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class UpdateLeaveDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format (e.g. 2026-07-10)',
  })
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}