import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSlotDurationToDoctorProfiles1700000007000 implements MigrationInterface {
  name = 'AddSlotDurationToDoctorProfiles1700000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'slot_duration',
        type: 'int',
        default: 30,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctor_profiles', 'slot_duration');
  }
}