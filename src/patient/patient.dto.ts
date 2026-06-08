import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Gender } from './patient-profile.entity';

export class CreatePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsEnum(Gender, { message: 'gender must be MALE, FEMALE or OTHER' })
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9\s\-]{7,15}$/, { message: 'Invalid phone number' })
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  existingConditions?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsEnum(Gender, { message: 'gender must be MALE, FEMALE or OTHER' })
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-]{7,15}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  existingConditions?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;
}