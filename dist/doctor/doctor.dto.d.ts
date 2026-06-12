export declare class AvailabilitySlotDto {
    day: string;
    from: string;
    to: string;
}
export declare class CreateDoctorProfileDto {
    fullName: string;
    specialization: string;
    experienceYears: number;
    qualification: string;
    consultationFee: number;
    availability: AvailabilitySlotDto[];
    bio?: string;
    profilePictureUrl?: string;
    slotDuration?: number;
}
export declare class UpdateDoctorProfileDto {
    fullName?: string;
    specialization?: string;
    experienceYears?: number;
    qualification?: string;
    consultationFee?: number;
    availability?: AvailabilitySlotDto[];
    bio?: string;
    profilePictureUrl?: string;
    slotDuration?: number;
}
export declare class DoctorQueryDto {
    specialization?: string;
    search?: string;
    page?: number;
    limit?: number;
    availability?: boolean;
}
