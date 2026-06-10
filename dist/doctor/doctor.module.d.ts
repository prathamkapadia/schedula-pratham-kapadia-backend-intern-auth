import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { DoctorProfile } from './doctor-profile.entity';
import { CreateDoctorProfileDto, UpdateDoctorProfileDto, DoctorQueryDto } from './doctor.dto';
export declare class DoctorService {
    private readonly doctorProfileRepo;
    private readonly userRepo;
    constructor(doctorProfileRepo: Repository<DoctorProfile>, userRepo: Repository<User>);
    createProfile(doctor: User, dto: CreateDoctorProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    getProfile(doctor: User): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    updateProfile(doctor: User, dto: UpdateDoctorProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    getDashboard(doctor: User): Promise<{
        success: boolean;
        dashboard: {
            welcome: string;
            onboardingComplete: boolean;
            stats: {
                totalPatients: number;
                upcomingAppointments: number;
                completedAppointments: number;
            };
        };
    }>;
    getAllPatients(): Promise<{
        success: boolean;
        count: number;
        patients: User[];
    }>;
    discoverDoctors(query: DoctorQueryDto): Promise<{
        success: boolean;
        message: string;
        data: DoctorProfile[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    discoverDoctorById(id: string): Promise<{
        success: boolean;
        message: string;
        data: DoctorProfile;
    }>;
}
export declare class DoctorController {
    private readonly doctorService;
    constructor(doctorService: DoctorService);
    createProfile(user: User, dto: CreateDoctorProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    getProfile(user: User): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    updateProfile(user: User, dto: UpdateDoctorProfileDto): Promise<{
        success: boolean;
        message: string;
        profile: DoctorProfile;
    }>;
    getDashboard(user: User): Promise<{
        success: boolean;
        dashboard: {
            welcome: string;
            onboardingComplete: boolean;
            stats: {
                totalPatients: number;
                upcomingAppointments: number;
                completedAppointments: number;
            };
        };
    }>;
    getAllPatients(): Promise<{
        success: boolean;
        count: number;
        patients: User[];
    }>;
}
export declare class DoctorDiscoveryController {
    private readonly doctorService;
    constructor(doctorService: DoctorService);
    discoverDoctors(query: DoctorQueryDto): Promise<{
        success: boolean;
        message: string;
        data: DoctorProfile[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    discoverDoctorById(id: string): Promise<{
        success: boolean;
        message: string;
        data: DoctorProfile;
    }>;
}
export declare class DoctorModule {
}
