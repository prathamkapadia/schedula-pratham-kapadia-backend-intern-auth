import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSlots1700000008000 implements MigrationInterface {
  name = 'CreateSlots1700000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "slot_status_enum" AS ENUM ('AVAILABLE', 'BOOKED')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'slots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'doctor_id',
            type: 'uuid',
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'start_time',
            type: 'time',
          },
          {
            name: 'end_time',
            type: 'time',
          },
          {
            name: 'status',
            type: 'slot_status_enum',
            default: "'AVAILABLE'",
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

    await queryRunner.createForeignKey(
      'slots',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctor_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('slots');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('doctor_id'));
    if (fk) await queryRunner.dropForeignKey('slots', fk);
    await queryRunner.dropTable('slots');
    await queryRunner.query(`DROP TYPE IF EXISTS "slot_status_enum"`);
  }
}