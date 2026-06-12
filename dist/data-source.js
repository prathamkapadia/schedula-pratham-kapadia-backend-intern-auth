"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const user_entity_1 = require("./auth/user.entity");
const doctor_profile_entity_1 = require("./doctor/doctor-profile.entity");
const patient_profile_entity_1 = require("./patient/patient-profile.entity");
const availability_entity_1 = require("./doctor/availability.entity");
const slot_entity_1 = require("./doctor/slot.entity");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [user_entity_1.User, doctor_profile_entity_1.DoctorProfile, patient_profile_entity_1.PatientProfile, availability_entity_1.RecurringAvailability, availability_entity_1.CustomAvailability, slot_entity_1.Slot],
    migrations: ['dist/migrations/*.js'],
    synchronize: false,
    ssl: {
        rejectUnauthorized: false,
    },
});
//# sourceMappingURL=data-source.js.map