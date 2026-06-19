import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSchedulingFieldsToDoctorProfiles1700000010000 implements MigrationInterface {
  name = 'AddSchedulingFieldsToDoctorProfiles1700000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "scheduling_type_enum" AS ENUM ('STREAM', 'WAVE')
    `);

    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'scheduling_type',
        type: 'scheduling_type_enum',
        default: "'STREAM'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'buffer_time',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'max_patients_per_wave',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctor_profiles', 'max_patients_per_wave');
    await queryRunner.dropColumn('doctor_profiles', 'buffer_time');
    await queryRunner.dropColumn('doctor_profiles', 'scheduling_type');
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduling_type_enum"`);
  }
}