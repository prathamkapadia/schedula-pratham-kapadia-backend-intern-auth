"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorModule = exports.DoctorDiscoveryController = exports.DoctorController = exports.DoctorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const typeorm_3 = require("@nestjs/typeorm");
const user_entity_1 = require("../auth/user.entity");
const auth_module_1 = require("../auth/auth.module");
const auth_guards_1 = require("../common/guards/auth.guards");
const doctor_profile_entity_1 = require("./doctor-profile.entity");
const doctor_dto_1 = require("./doctor.dto");
const availability_entity_1 = require("./availability.entity");
const availability_service_1 = require("./availability.service");
const availability_controller_1 = require("./availability.controller");
const slot_entity_1 = require("./slot.entity");
const slot_service_1 = require("./slot.service");
const slot_controller_1 = require("./slot.controller");
let DoctorService = class DoctorService {
    doctorProfileRepo;
    userRepo;
    constructor(doctorProfileRepo, userRepo) {
        this.doctorProfileRepo = doctorProfileRepo;
        this.userRepo = userRepo;
    }
    async createProfile(doctor, dto) {
        const existing = await this.doctorProfileRepo.findOne({
            where: { userId: doctor.id },
        });
        if (existing) {
            throw new common_1.ConflictException('Doctor profile already exists. Use PATCH /doctor/profile to update it.');
        }
        const profile = this.doctorProfileRepo.create({ ...dto, userId: doctor.id });
        const saved = await this.doctorProfileRepo.save(profile);
        return { success: true, message: 'Doctor profile created successfully', profile: saved };
    }
    async getProfile(doctor) {
        const profile = await this.doctorProfileRepo.findOne({
            where: { userId: doctor.id },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Doctor profile not found. Please complete onboarding via POST /doctor/profile.');
        }
        return { success: true, message: 'Doctor profile fetched successfully', profile };
    }
    async updateProfile(doctor, dto) {
        const profile = await this.doctorProfileRepo.findOne({
            where: { userId: doctor.id },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Doctor profile not found. Please complete onboarding via POST /doctor/profile first.');
        }
        Object.assign(profile, dto);
        const updated = await this.doctorProfileRepo.save(profile);
        return { success: true, message: 'Doctor profile updated successfully', profile: updated };
    }
    async getDashboard(doctor) {
        const totalPatients = await this.userRepo.count({ where: { role: user_entity_1.Role.PATIENT } });
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
            where: { role: user_entity_1.Role.PATIENT },
            select: { id: true, name: true, email: true, createdAt: true },
        });
        return { success: true, count: patients.length, patients };
    }
    async discoverDoctors(query) {
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
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async discoverDoctorById(id) {
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            throw new common_1.BadRequestException('Invalid doctor ID format');
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
            },
        });
        if (!doctor) {
            throw new common_1.NotFoundException(`Doctor with ID ${id} not found`);
        }
        return {
            success: true,
            message: 'Doctor profile fetched successfully',
            data: doctor,
        };
    }
};
exports.DoctorService = DoctorService;
exports.DoctorService = DoctorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(doctor_profile_entity_1.DoctorProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], DoctorService);
let DoctorController = class DoctorController {
    doctorService;
    constructor(doctorService) {
        this.doctorService = doctorService;
    }
    createProfile(user, dto) {
        return this.doctorService.createProfile(user, dto);
    }
    getProfile(user) {
        return this.doctorService.getProfile(user);
    }
    updateProfile(user, dto) {
        return this.doctorService.updateProfile(user, dto);
    }
    getDashboard(user) {
        return this.doctorService.getDashboard(user);
    }
    getAllPatients() {
        return this.doctorService.getAllPatients();
    }
};
exports.DoctorController = DoctorController;
__decorate([
    (0, common_1.Post)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, doctor_dto_1.CreateDoctorProfileDto]),
    __metadata("design:returntype", void 0)
], DoctorController.prototype, "createProfile", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], DoctorController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, doctor_dto_1.UpdateDoctorProfileDto]),
    __metadata("design:returntype", void 0)
], DoctorController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], DoctorController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('patients'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DoctorController.prototype, "getAllPatients", null);
exports.DoctorController = DoctorController = __decorate([
    (0, common_1.Controller)('api/doctor'),
    (0, common_1.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_1.RolesGuard),
    (0, auth_guards_1.Roles)(user_entity_1.Role.DOCTOR),
    __metadata("design:paramtypes", [DoctorService])
], DoctorController);
let DoctorDiscoveryController = class DoctorDiscoveryController {
    doctorService;
    constructor(doctorService) {
        this.doctorService = doctorService;
    }
    discoverDoctors(query) {
        return this.doctorService.discoverDoctors(query);
    }
    discoverDoctorById(id) {
        return this.doctorService.discoverDoctorById(id);
    }
};
exports.DoctorDiscoveryController = DoctorDiscoveryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [doctor_dto_1.DoctorQueryDto]),
    __metadata("design:returntype", void 0)
], DoctorDiscoveryController.prototype, "discoverDoctors", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DoctorDiscoveryController.prototype, "discoverDoctorById", null);
exports.DoctorDiscoveryController = DoctorDiscoveryController = __decorate([
    (0, common_1.Controller)('api/doctor'),
    __metadata("design:paramtypes", [DoctorService])
], DoctorDiscoveryController);
let DoctorModule = class DoctorModule {
};
exports.DoctorModule = DoctorModule;
exports.DoctorModule = DoctorModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_3.TypeOrmModule.forFeature([
                doctor_profile_entity_1.DoctorProfile,
                availability_entity_1.RecurringAvailability,
                availability_entity_1.CustomAvailability,
                slot_entity_1.Slot,
            ]),
            auth_module_1.AuthModule,
        ],
        controllers: [
            DoctorController,
            DoctorDiscoveryController,
            availability_controller_1.AvailabilityController,
            slot_controller_1.SlotController,
        ],
        providers: [DoctorService, availability_service_1.AvailabilityService, slot_service_1.SlotService],
    })
], DoctorModule);
//# sourceMappingURL=doctor.module.js.map