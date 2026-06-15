import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { PatientProfile } from './patient-profile.entity';
import { CreatePatientProfileDto, UpdatePatientProfileDto } from './patient.dto';
export declare class PatientService {
    private readonly patientProfileRepo;
    private readonly userRepo;
    constructor(patientProfileRepo: Repository<PatientProfile>, userRepo: Repository<User>);
    createProfile(patient: User, dto: CreatePatientProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    getProfile(patient: User): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    updateProfile(patient: User, dto: UpdatePatientProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    getDashboard(patient: User): Promise<{
        success: boolean;
        dashboard: {
            welcome: string;
            onboardingComplete: boolean;
            stats: {
                availableDoctors: number;
                upcomingAppointments: number;
                pastAppointments: number;
            };
        };
    }>;
    getAvailableDoctors(): Promise<{
        success: boolean;
        count: number;
        doctors: User[];
    }>;
}
export declare class PatientController {
    private readonly patientService;
    constructor(patientService: PatientService);
    createProfile(user: User, dto: CreatePatientProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    getProfile(user: User): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    updateProfile(user: User, dto: UpdatePatientProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: PatientProfile;
    }>;
    getDashboard(user: User): Promise<{
        success: boolean;
        dashboard: {
            welcome: string;
            onboardingComplete: boolean;
            stats: {
                availableDoctors: number;
                upcomingAppointments: number;
                pastAppointments: number;
            };
        };
    }>;
    getAvailableDoctors(): Promise<{
        success: boolean;
        count: number;
        doctors: User[];
    }>;
}
export declare class PatientModule {
}
