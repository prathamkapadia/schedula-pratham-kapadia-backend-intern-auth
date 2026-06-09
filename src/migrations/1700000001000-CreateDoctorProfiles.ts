import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateDoctorProfiles1700000001000 implements MigrationInterface {
  name = 'CreateDoctorProfiles1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'doctor_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isUnique: true },
          { name: 'fullName', type: 'varchar' },
          { name: 'specialization', type: 'varchar' },
          { name: 'experienceYears', type: 'int' },
          { name: 'qualification', type: 'varchar' },
          { name: 'consultationFee', type: 'decimal', precision: 10, scale: 2 },
          { name: 'availability', type: 'jsonb', default: "'[]'" },
          { name: 'bio', type: 'text', isNullable: true },
          { name: 'profilePictureUrl', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'doctor_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_profiles');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('user_id'));
    if (fk) await queryRunner.dropForeignKey('doctor_profiles', fk);
    await queryRunner.dropTable('doctor_profiles');
  }
}