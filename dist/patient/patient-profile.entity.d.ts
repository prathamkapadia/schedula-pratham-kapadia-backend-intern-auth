import { User } from '../auth/user.entity';
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare class PatientProfile {
    id: string;
    user: User;
    userId: string;
    fullName: string;
    age: number;
    gender: Gender;
    phone: string;
    address: string;
    city: string;
    state: string;
    bloodGroup: string;
    allergies: string;
    existingConditions: string;
    currentMedications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    createdAt: Date;
    updatedAt: Date;
}
