import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAchievementAndServicesToDoctorProfiles1700000004000
  implements MigrationInterface
{
  name = 'AddAchievementAndServicesToDoctorProfiles1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'achievement',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'doctor_profiles',
      new TableColumn({
        name: 'services',
        type: 'jsonb',
        default: "'[]'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctor_profiles', 'services');
    await queryRunner.dropColumn('doctor_profiles', 'achievement');
  }
}