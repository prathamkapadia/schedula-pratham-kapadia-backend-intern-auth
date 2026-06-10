"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePatientProfiles1700000002000 = void 0;
const typeorm_1 = require("typeorm");
class CreatePatientProfiles1700000002000 {
    name = 'CreatePatientProfiles1700000002000';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "patient_profiles_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER')`);
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'patient_profiles',
            columns: [
                { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                { name: 'user_id', type: 'uuid', isUnique: true },
                { name: 'fullName', type: 'varchar' },
                { name: 'age', type: 'int' },
                { name: 'gender', type: 'enum', enum: ['MALE', 'FEMALE', 'OTHER'] },
                { name: 'phone', type: 'varchar' },
                { name: 'address', type: 'varchar', isNullable: true },
                { name: 'city', type: 'varchar', isNullable: true },
                { name: 'state', type: 'varchar', isNullable: true },
                { name: 'bloodGroup', type: 'varchar', isNullable: true },
                { name: 'allergies', type: 'varchar', isNullable: true },
                { name: 'existingConditions', type: 'varchar', isNullable: true },
                { name: 'currentMedications', type: 'varchar', isNullable: true },
                { name: 'emergencyContactName', type: 'varchar', isNullable: true },
                { name: 'emergencyContactPhone', type: 'varchar', isNullable: true },
                { name: 'createdAt', type: 'timestamp', default: 'now()' },
                { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            ],
        }), true);
        await queryRunner.createForeignKey('patient_profiles', new typeorm_1.TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        const table = await queryRunner.getTable('patient_profiles');
        const fk = table.foreignKeys.find((f) => f.columnNames.includes('user_id'));
        if (fk)
            await queryRunner.dropForeignKey('patient_profiles', fk);
        await queryRunner.dropTable('patient_profiles');
        await queryRunner.query(`DROP TYPE IF EXISTS "patient_profiles_gender_enum"`);
    }
}
exports.CreatePatientProfiles1700000002000 = CreatePatientProfiles1700000002000;
//# sourceMappingURL=1700000002000-CreatePatientProfiles.js.map