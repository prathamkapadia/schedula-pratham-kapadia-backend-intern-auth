import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateRecurringAvailability1700000005000 implements MigrationInterface {
  name = 'CreateRecurringAvailability1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "day_of_week_enum" AS ENUM (
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'recurring_availability',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'doctor_id', type: 'uuid' },
          { name: 'day_of_week', type: 'day_of_week_enum' },
          { name: 'start_time', type: 'time' },
          { name: 'end_time', type: 'time' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'recurring_availability',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctor_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('recurring_availability');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('doctor_id'));
    if (fk) await queryRunner.dropForeignKey('recurring_availability', fk);
    await queryRunner.dropTable('recurring_availability');
    await queryRunner.query(`DROP TYPE IF EXISTS "day_of_week_enum"`);
  }
}