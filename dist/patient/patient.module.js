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
exports.PatientModule = exports.PatientController = exports.PatientService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const typeorm_3 = require("@nestjs/typeorm");
const user_entity_1 = require("../auth/user.entity");
const auth_module_1 = require("../auth/auth.module");
const auth_guards_1 = require("../common/guards/auth.guards");
const patient_profile_entity_1 = require("./patient-profile.entity");
const patient_dto_1 = require("./patient.dto");
let PatientService = class PatientService {
    patientProfileRepo;
    userRepo;
    constructor(patientProfileRepo, userRepo) {
        this.patientProfileRepo = patientProfileRepo;
        this.userRepo = userRepo;
    }
    async createProfile(patient, dto) {
        const existing = await this.patientProfileRepo.findOne({
            where: { userId: patient.id },
        });
        if (existing) {
            throw new common_1.ConflictException('Patient profile already exists. Use PATCH /patient/profile to update it.');
        }
        const profile = this.patientProfileRepo.create({ ...dto, userId: patient.id });
        const saved = await this.patientProfileRepo.save(profile);
        return { success: true, message: 'Patient profile created successfully', profile: saved };
    }
    async getProfile(patient) {
        const profile = await this.patientProfileRepo.findOne({
            where: { userId: patient.id },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Patient profile not found. Please complete onboarding via POST /patient/profile.');
        }
        return { success: true, message: 'Patient profile fetched successfully', profile };
    }
    async updateProfile(patient, dto) {
        const profile = await this.patientProfileRepo.findOne({
            where: { userId: patient.id },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Patient profile not found. Please complete onboarding via POST /patient/profile first.');
        }
        Object.assign(profile, dto);
        const updated = await this.patientProfileRepo.save(profile);
        return { success: true, message: 'Patient profile updated successfully', profile: updated };
    }
    async getDashboard(patient) {
        const availableDoctors = await this.userRepo.count({ where: { role: user_entity_1.Role.DOCTOR } });
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
            where: { role: user_entity_1.Role.DOCTOR },
            select: { id: true, name: true, email: true, specialization: true, createdAt: true },
        });
        return { success: true, count: doctors.length, doctors };
    }
};
exports.PatientService = PatientService;
exports.PatientService = PatientService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(patient_profile_entity_1.PatientProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PatientService);
let PatientController = class PatientController {
    patientService;
    constructor(patientService) {
        this.patientService = patientService;
    }
    createProfile(user, dto) {
        return this.patientService.createProfile(user, dto);
    }
    getProfile(user) {
        return this.patientService.getProfile(user);
    }
    updateProfile(user, dto) {
        return this.patientService.updateProfile(user, dto);
    }
    getDashboard(user) {
        return this.patientService.getDashboard(user);
    }
    getAvailableDoctors() {
        return this.patientService.getAvailableDoctors();
    }
};
exports.PatientController = PatientController;
__decorate([
    (0, common_1.Post)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, patient_dto_1.CreatePatientProfileDto]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "createProfile", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, patient_dto_1.UpdatePatientProfileDto]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, auth_guards_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('doctors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PatientController.prototype, "getAvailableDoctors", null);
exports.PatientController = PatientController = __decorate([
    (0, common_1.Controller)('api/patient'),
    (0, common_1.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_1.RolesGuard),
    (0, auth_guards_1.Roles)(user_entity_1.Role.PATIENT),
    __metadata("design:paramtypes", [PatientService])
], PatientController);
let PatientModule = class PatientModule {
};
exports.PatientModule = PatientModule;
exports.PatientModule = PatientModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_3.TypeOrmModule.forFeature([patient_profile_entity_1.PatientProfile]), auth_module_1.AuthModule],
        controllers: [PatientController],
        providers: [PatientService],
    })
], PatientModule);
//# sourceMappingURL=patient.module.js.map