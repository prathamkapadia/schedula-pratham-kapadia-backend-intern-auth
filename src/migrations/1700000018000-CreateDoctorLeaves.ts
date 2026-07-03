import { MigrationInterface, QueryRunner, Table, TableUnique } from 'typeorm';

export class CreateDoctorLeaves1700000018000 implements MigrationInterface {
  name = 'CreateDoctorLeaves1700000018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'doctor_leaves',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'doctor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      ALTER TABLE "doctor_leaves"
      ADD CONSTRAINT "FK_doctor_leaves_doctor_id"
      FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.createUniqueConstraint(
      'doctor_leaves',
      new TableUnique({
        name: 'UQ_doctor_leaves_doctor_date',
        columnNames: ['doctor_id', 'date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_leaves" DROP CONSTRAINT "UQ_doctor_leaves_doctor_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "doctor_leaves" DROP CONSTRAINT "FK_doctor_leaves_doctor_id"
    `);
    await queryRunner.dropTable('doctor_leaves');
  }
}