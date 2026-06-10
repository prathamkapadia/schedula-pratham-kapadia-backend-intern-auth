import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsAvailableToDoctorProfiles1700000003000
  implements MigrationInterface
{
  name = 'AddIsAvailableToDoctorProfiles1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'isAvailable',
        type: 'boolean',
        default: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctor_profiles', 'isAvailable');
  }
}