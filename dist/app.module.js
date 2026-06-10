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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const doctor_module_1 = require("./doctor/doctor.module");
const patient_module_1 = require("./patient/patient.module");
const user_entity_1 = require("./auth/user.entity");
const doctor_profile_entity_1 = require("./doctor/doctor-profile.entity");
const patient_profile_entity_1 = require("./patient/patient-profile.entity");
let AppController = class AppController {
    health() {
        return {
            message: '🏥 Schedula API running!',
            routes: {
                'POST /api/auth/signup': 'Register (DOCTOR or PATIENT)',
                'POST /api/auth/login': 'Login => get JWT token',
                'GET  /api/auth/me': 'Current user [any role]',
                'POST  /api/doctor/profile': 'Create doctor profile [DOCTOR only]',
                'GET   /api/doctor/profile': 'Get doctor profile [DOCTOR only]',
                'PATCH /api/doctor/profile': 'Update doctor profile [DOCTOR only]',
                'GET   /api/doctor/dashboard': 'Doctor dashboard [DOCTOR only]',
                'GET   /api/doctor/patients': 'List all patients [DOCTOR only]',
                'GET   /api/doctor': 'Discover doctors [PUBLIC]',
                'GET   /api/doctor/:id': 'Doctor profile by ID [PUBLIC]',
                'POST  /api/patient/profile': 'Create patient profile [PATIENT only]',
                'GET   /api/patient/profile': 'Get patient profile [PATIENT only]',
                'PATCH /api/patient/profile': 'Update patient profile [PATIENT only]',
                'GET   /api/patient/dashboard': 'Patient dashboard [PATIENT only]',
                'GET   /api/patient/doctors': 'List available doctors [PATIENT only]',
            },
        };
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "health", null);
AppController = __decorate([
    (0, common_1.Controller)()
], AppController);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => ({
                    type: 'postgres',
                    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ito1md4xQbWk@ep-curly-unit-ao9bv1fi.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require', entities: [user_entity_1.User, doctor_profile_entity_1.DoctorProfile, patient_profile_entity_1.PatientProfile],
                    synchronize: true,
                    ssl: {
                        rejectUnauthorized: false,
                    },
                }),
            }),
            auth_module_1.AuthModule,
            doctor_module_1.DoctorModule,
            patient_module_1.PatientModule,
        ],
        controllers: [AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map