import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from './user.entity';

export class SignupDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Role, { message: 'Role must be DOCTOR or PATIENT' }) role: Role;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() bloodGroup?: string;
}

export class LoginDto {
  @IsEmail() @IsNotEmpty() email: string;
  @IsString() @IsNotEmpty() password: string;
}