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
  BadRequestException,
  Query,
  Param,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Role } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { DoctorProfile } from './doctor-profile.entity';
import { CreateDoctorProfileDto, UpdateDoctorProfileDto, DoctorQueryDto } from './doctor.dto';
import { RecurringAvailability, CustomAvailability } from './availability.entity';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Slot } from './slot.entity';
import { SlotService } from './slot.service';
import { SlotController } from './slot.controller';
import { Appointment } from '../appointment/appointment.entity';
import { AppointmentService } from '../appointment/appointment.service';

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

  async discoverDoctors(query: DoctorQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 10, 100));
    const skip = (page - 1) * limit;

    const qb = this.doctorProfileRepo
      .createQueryBuilder('doctor')
      .select([
        'doctor.id',
        'doctor.fullName',
        'doctor.specialization',
        'doctor.experienceYears',
        'doctor.consultationFee',
        'doctor.isAvailable',
        'doctor.profilePictureUrl',
        'doctor.achievement',
        'doctor.services',
        'doctor.slotDuration',
        'doctor.schedulingType',
        'doctor.bufferTime',
        'doctor.maxPatientsPerWave',
      ]);

    if (query.specialization) {
      qb.andWhere('LOWER(doctor.specialization) = LOWER(:specialization)', {
        specialization: query.specialization,
      });
    }
    if (query.search) {
      qb.andWhere('LOWER(doctor.fullName) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.availability !== undefined) {
      qb.andWhere('doctor.isAvailable = :availability', {
        availability: query.availability,
      });
    }

    const total = await qb.getCount();
    if (total === 0) {
      return {
        success: true,
        message: 'No doctors found matching your criteria',
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const doctors = await qb.skip(skip).take(limit).getMany();
    return {
      success: true,
      message: 'Doctors fetched successfully',
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async discoverDoctorById(id: string) {
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new BadRequestException('Invalid doctor ID format');
    }
    const doctor = await this.doctorProfileRepo.findOne({
      where: { id },
      select: {
        id: true,
        fullName: true,
        specialization: true,
        experienceYears: true,
        qualification: true,
        consultationFee: true,
        isAvailable: true,
        availability: true,
        bio: true,
        profilePictureUrl: true,
        achievement: true,
        services: true,
        slotDuration: true,
        schedulingType: true,
        bufferTime: true,
        maxPatientsPerWave: true,
      },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return { success: true, message: 'Doctor profile fetched successfully', data: doctor };
  }
}

@Controller('api/doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(
    private readonly doctorService: DoctorService,
    private readonly appointmentService: AppointmentService,
  ) {}

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

  // GET /api/doctor/appointments — Doctor views their appointments
  @Get('appointments')
  getDoctorAppointments(@CurrentUser() user: User) {
    return this.appointmentService.getDoctorAppointments(user);
  }
}

@Controller('api/doctor')
export class DoctorDiscoveryController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  discoverDoctors(@Query() query: DoctorQueryDto) {
    return this.doctorService.discoverDoctors(query);
  }

  @Get(':id')
  discoverDoctorById(@Param('id') id: string) {
    return this.doctorService.discoverDoctorById(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile]), AuthModule],
  controllers: [DoctorController, DoctorDiscoveryController],
  providers: [DoctorService],
  imports: [
    TypeOrmModule.forFeature([
      DoctorProfile,
      RecurringAvailability,
      CustomAvailability,
    ]),
    AuthModule,
  ],
  controllers: [DoctorController, DoctorDiscoveryController, AvailabilityController],
  providers: [DoctorService, AvailabilityService],
      Slot,
      Appointment,
      User,
    ]),
    AuthModule,
  ],
  controllers: [
    DoctorController,
    AvailabilityController,
    SlotController,
    DoctorDiscoveryController,
  ],
  providers: [DoctorService, AvailabilityService, SlotService, AppointmentService],
})
export class DoctorModule {}