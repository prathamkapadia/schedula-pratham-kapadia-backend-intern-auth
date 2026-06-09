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
import { DoctorProfile } from './doctor-profile.entity';
import { CreateDoctorProfileDto, UpdateDoctorProfileDto } from './doctor.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createProfile(doctor: User, dto: CreateDoctorProfileDto) {
    const existing = await this.doctorProfileRepo.findOne({
      where: { userId: doctor.id },
    });
    if (existing) {
      throw new ConflictException(
        'Doctor profile already exists. Use PATCH /doctor/profile to update it.',
      );
    }
    const profile = this.doctorProfileRepo.create({ ...dto, userId: doctor.id });
    const saved = await this.doctorProfileRepo.save(profile);
    return { success: true, message: 'Doctor profile created successfully', profile: saved };
  }

  async getProfile(doctor: User) {
    const profile = await this.doctorProfileRepo.findOne({
      where: { userId: doctor.id },
    });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /doctor/profile.',
      );
    }
    return { success: true, message: 'Doctor profile fetched successfully', profile };
  }

  async updateProfile(doctor: User, dto: UpdateDoctorProfileDto) {
    const profile = await this.doctorProfileRepo.findOne({
      where: { userId: doctor.id },
    });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /doctor/profile first.',
      );
    }
    Object.assign(profile, dto);
    const updated = await this.doctorProfileRepo.save(profile);
    return { success: true, message: 'Doctor profile updated successfully', profile: updated };
  }

  async getDashboard(doctor: User) {
    const totalPatients = await this.userRepo.count({ where: { role: Role.PATIENT } });
    const hasProfile = !!(await this.doctorProfileRepo.findOne({ where: { userId: doctor.id } }));
    return {
      success: true,
      dashboard: {
        welcome: `Hello Dr. ${doctor.name}`,
        onboardingComplete: hasProfile,
        stats: { totalPatients, upcomingAppointments: 0, completedAppointments: 0 },
      },
    };
  }

  async getAllPatients() {
    const patients = await this.userRepo.find({
      where: { role: Role.PATIENT },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return { success: true, count: patients.length, patients };
  }
}

@Controller('api/doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('profile')
  createProfile(@CurrentUser() user: User, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorService.createProfile(user, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.doctorService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateDoctorProfileDto) {
    return this.doctorService.updateProfile(user, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.doctorService.getDashboard(user);
  }

  @Get('patients')
  getAllPatients() {
    return this.doctorService.getAllPatients();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile]), AuthModule],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}