import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCustomAvailability1700000006000 implements MigrationInterface {
  name = 'CreateCustomAvailability1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'custom_availability',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'doctor_id', type: 'uuid' },
          { name: 'date', type: 'date' },
          { name: 'start_time', type: 'time', isNullable: true },
          { name: 'end_time', type: 'time', isNullable: true },
          { name: 'is_available', type: 'boolean', default: true },
          { name: 'reason', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'custom_availability',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctor_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('custom_availability');
    const fk = table!.foreignKeys.find((f) => f.columnNames.includes('doctor_id'));
    if (fk) await queryRunner.dropForeignKey('custom_availability', fk);
    await queryRunner.dropTable('custom_availability');
  }
}