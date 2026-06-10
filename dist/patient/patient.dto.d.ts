import { Gender } from './patient-profile.entity';
export declare class CreatePatientProfileDto {
    fullName: string;
    age: number;
    gender: Gender;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    bloodGroup?: string;
    allergies?: string;
    existingConditions?: string;
    currentMedications?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}
export declare class UpdatePatientProfileDto {
    fullName?: string;
    age?: number;
    gender?: Gender;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    bloodGroup?: string;
    allergies?: string;
    existingConditions?: string;
    currentMedications?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}
