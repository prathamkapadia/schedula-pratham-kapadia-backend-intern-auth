"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddIsAvailableToDoctorProfiles1700000003000 = void 0;
const typeorm_1 = require("typeorm");
class AddIsAvailableToDoctorProfiles1700000003000 {
    name = 'AddIsAvailableToDoctorProfiles1700000003000';
    async up(queryRunner) {
        await queryRunner.addColumn('doctor_profiles', new typeorm_1.TableColumn({
            name: 'isAvailable',
            type: 'boolean',
            default: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('doctor_profiles', 'isAvailable');
    }
}
exports.AddIsAvailableToDoctorProfiles1700000003000 = AddIsAvailableToDoctorProfiles1700000003000;
//# sourceMappingURL=1700000003000-AddIsAvailableToDoctorProfiles.js.map