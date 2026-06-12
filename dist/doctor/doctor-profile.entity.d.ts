import { User } from '../auth/user.entity';
export declare class DoctorProfile {
    id: string;
    user: User;
    userId: string;
    fullName: string;
    specialization: string;
    experienceYears: number;
    qualification: string;
    consultationFee: number;
    availability: {
        day: string;
        from: string;
        to: string;
    }[];
    bio: string;
    profilePictureUrl: string;
    isAvailable: boolean;
    achievement: string;
    services: string[];
    slotDuration: number;
    createdAt: Date;
    updatedAt: Date;
}
