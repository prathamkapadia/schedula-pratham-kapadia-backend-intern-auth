"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAchievementAndServicesToDoctorProfiles1700000004000 = void 0;
const typeorm_1 = require("typeorm");
class AddAchievementAndServicesToDoctorProfiles1700000004000 {
    name = 'AddAchievementAndServicesToDoctorProfiles1700000004000';
    async up(queryRunner) {
        await queryRunner.addColumn('doctor_profiles', new typeorm_1.TableColumn({
            name: 'achievement',
            type: 'varchar',
            isNullable: true,
        }));
        await queryRunner.addColumn('doctor_profiles', new typeorm_1.TableColumn({
            name: 'services',
            type: 'jsonb',
            default: "'[]'",
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('doctor_profiles', 'services');
        await queryRunner.dropColumn('doctor_profiles', 'achievement');
    }
}
exports.AddAchievementAndServicesToDoctorProfiles1700000004000 = AddAchievementAndServicesToDoctorProfiles1700000004000;
//# sourceMappingURL=1700000004000-AddAchievementAndServicesToDoctorProfiles.js.map