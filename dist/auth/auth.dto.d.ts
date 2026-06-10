import { Role } from './user.entity';
export declare class SignupDto {
    name: string;
    email: string;
    password: string;
    role: Role;
    specialization?: string;
    licenseNumber?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
