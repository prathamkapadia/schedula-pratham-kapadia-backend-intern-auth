import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './auth.dto';
import { User } from './user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
}
