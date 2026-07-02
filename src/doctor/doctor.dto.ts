import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SchedulingType } from './doctor-profile.entity';

export class AvailabilitySlotDto {
  @IsString()
  @IsNotEmpty()
  day: string;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;
}

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears: number;

  @IsString()
  @IsNotEmpty()
  qualification: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  consultationFee: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  slotDuration?: number;

  @IsOptional()
  @IsEnum(SchedulingType, {
    message: `schedulingType must be one of: ${Object.values(SchedulingType).join(', ')}`,
  })
  schedulingType?: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPatientsPerWave?: number;

  // Day 20
  @IsOptional()
  @IsBoolean()
  allowFutureBooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxFutureBookingDays must be at least 1' })
  @Max(365)
  maxFutureBookingDays?: number | null;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  specialization?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  qualification?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  consultationFee?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  slotDuration?: number;

  @IsOptional()
  @IsEnum(SchedulingType, {
    message: `schedulingType must be one of: ${Object.values(SchedulingType).join(', ')}`,
  })
  schedulingType?: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPatientsPerWave?: number;

  // Day 20
  @IsOptional()
  @IsBoolean()
  allowFutureBooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxFutureBookingDays must be at least 1' })
  @Max(365)
  maxFutureBookingDays?: number | null;
}

export class DoctorQueryDto {
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  availability?: boolean;
}