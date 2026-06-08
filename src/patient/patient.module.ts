import { Module, Injectable, Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  getProfile(patient: User) {
    return {
      success: true,
      message: 'Patient profile fetched successfully',
      profile: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        dateOfBirth: patient.dateOfBirth ?? 'Not specified',
        bloodGroup: patient.bloodGroup ?? 'Not specified',
        memberSince: patient.createdAt,
      },
    };
  }

  async getDashboard(patient: User) {
    const availableDoctors = await this.userRepo.count({ where: { role: Role.DOCTOR } });
    return {
      success: true,
      dashboard: {
        welcome: `Hello, ${patient.name}`,
        bloodGroup: patient.bloodGroup ?? 'Unknown',
        stats: { availableDoctors, upcomingAppointments: 0, pastAppointments: 0 },
      },
    };
  }

  async getAvailableDoctors() {
    const doctors = await this.userRepo.find({
      where: { role: Role.DOCTOR },
      select: { id: true, name: true, email: true, specialization: true, licenseNumber: true, createdAt: true },
    });
    return { success: true, count: doctors.length, doctors };
  }
}

@Controller('api/patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) { return this.patientService.getProfile(user); }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) { return this.patientService.getDashboard(user); }

  @Get('doctors')
  getAvailableDoctors() { return this.patientService.getAvailableDoctors(); }
}

@Module({
  imports: [AuthModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}