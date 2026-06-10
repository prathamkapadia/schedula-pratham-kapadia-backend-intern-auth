import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { SignupDto, LoginDto } from './auth.dto';
export declare class AuthService {
    private readonly userRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, jwtService: JwtService);
    signup(dto: SignupDto): Promise<{
        success: boolean;
        message: string;
        token: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("./user.entity").Role;
            specialization: string;
            licenseNumber: string;
            dateOfBirth: string;
            bloodGroup: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        success: boolean;
        message: string;
        token: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("./user.entity").Role;
            specialization: string;
            licenseNumber: string;
            dateOfBirth: string;
            bloodGroup: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getMe(user: User): {
        success: boolean;
        user: User;
    };
    private sign;
}
