import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWaveFieldsToSlots1700000011000 implements MigrationInterface {
  name = 'AddWaveFieldsToSlots1700000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'slots',
      new TableColumn({
        name: 'max_patients',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'slots',
      new TableColumn({
        name: 'booked_count',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('slots', 'booked_count');
    await queryRunner.dropColumn('slots', 'max_patients');
  }
}