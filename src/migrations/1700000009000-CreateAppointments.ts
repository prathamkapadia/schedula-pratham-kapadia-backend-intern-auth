import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAppointments1700000009000 implements MigrationInterface {
  name = 'CreateAppointments1700000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "appointment_status_enum" AS ENUM ('BOOKED', 'CANCELLED')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'patient_id', type: 'uuid' },
          { name: 'doctor_id', type: 'uuid' },
          { name: 'slot_id', type: 'uuid' },
          { name: 'date', type: 'date' },
          { name: 'start_time', type: 'time' },
          { name: 'end_time', type: 'time' },
          {
            name: 'status',
            type: 'appointment_status_enum',
            default: "'BOOKED'",
          },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctor_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['slot_id'],
        referencedTableName: 'slots',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('appointments');
    for (const fk of table!.foreignKeys) {
      await queryRunner.dropForeignKey('appointments', fk);
    }
    await queryRunner.dropTable('appointments');
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
  }
}