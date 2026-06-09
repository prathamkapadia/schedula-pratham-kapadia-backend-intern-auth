import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Role } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { PatientProfile } from './patient-profile.entity';
import { CreatePatientProfileDto, UpdatePatientProfileDto } from './patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepo: Repository<PatientProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createProfile(patient: User, dto: CreatePatientProfileDto) {
    const existing = await this.patientProfileRepo.findOne({
      where: { userId: patient.id },
    });
    if (existing) {
      throw new ConflictException(
        'Patient profile already exists. Use PATCH /patient/profile to update it.',
      );
    }
    const profile = this.patientProfileRepo.create({ ...dto, userId: patient.id });
    const saved = await this.patientProfileRepo.save(profile);
    return { success: true, message: 'Patient profile created successfully', profile: saved };
  }

  async getProfile(patient: User) {
    const profile = await this.patientProfileRepo.findOne({
      where: { userId: patient.id },
    });
    if (!profile) {
      throw new NotFoundException(
        'Patient profile not found. Please complete onboarding via POST /patient/profile.',
      );
    }
    return { success: true, message: 'Patient profile fetched successfully', profile };
  }

  async updateProfile(patient: User, dto: UpdatePatientProfileDto) {
    const profile = await this.patientProfileRepo.findOne({
      where: { userId: patient.id },
    });
    if (!profile) {
      throw new NotFoundException(
        'Patient profile not found. Please complete onboarding via POST /patient/profile first.',
      );
    }
    Object.assign(profile, dto);
    const updated = await this.patientProfileRepo.save(profile);
    return { success: true, message: 'Patient profile updated successfully', profile: updated };
  }

  async getDashboard(patient: User) {
    const availableDoctors = await this.userRepo.count({ where: { role: Role.DOCTOR } });
    const hasProfile = !!(await this.patientProfileRepo.findOne({ where: { userId: patient.id } }));
    return {
      success: true,
      dashboard: {
        welcome: `Hello, ${patient.name}`,
        onboardingComplete: hasProfile,
        stats: { availableDoctors, upcomingAppointments: 0, pastAppointments: 0 },
      },
    };
  }

  async getAvailableDoctors() {
    const doctors = await this.userRepo.find({
      where: { role: Role.DOCTOR },
      select: { id: true, name: true, email: true, specialization: true, createdAt: true },
    });
    return { success: true, count: doctors.length, doctors };
  }
}

@Controller('api/patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('profile')
  createProfile(@CurrentUser() user: User, @Body() dto: CreatePatientProfileDto) {
    return this.patientService.createProfile(user, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.patientService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdatePatientProfileDto) {
    return this.patientService.updateProfile(user, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.patientService.getDashboard(user);
  }

  @Get('doctors')
  getAvailableDoctors() {
    return this.patientService.getAvailableDoctors();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PatientProfile]), AuthModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
