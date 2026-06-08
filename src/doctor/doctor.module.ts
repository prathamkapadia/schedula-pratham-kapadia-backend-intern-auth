import { Module, Injectable, Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  getProfile(doctor: User) {
    return {
      success: true,
      message: 'Doctor profile fetched successfully',
      profile: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialization: doctor.specialization ?? 'Not specified',
        licenseNumber: doctor.licenseNumber ?? 'Not specified',
        memberSince: doctor.createdAt,
      },
    };
  }

  async getDashboard(doctor: User) {
    const totalPatients = await this.userRepo.count({ where: { role: Role.PATIENT } });
    return {
      success: true,
      dashboard: {
        welcome: `Hello Dr. ${doctor.name}`,
        specialization: doctor.specialization ?? 'General',
        stats: { totalPatients, upcomingAppointments: 0, completedAppointments: 0 },
      },
    };
  }

  async getAllPatients() {
    const patients = await this.userRepo.find({
      where: { role: Role.PATIENT },
      select: { id: true, name: true, email: true, dateOfBirth: true, bloodGroup: true, createdAt: true },
    });
    return { success: true, count: patients.length, patients };
  }
}

@Controller('api/doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) { return this.doctorService.getProfile(user); }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) { return this.doctorService.getDashboard(user); }

  @Get('patients')
  getAllPatients() { return this.doctorService.getAllPatients(); }
}

@Module({
  imports: [AuthModule],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}