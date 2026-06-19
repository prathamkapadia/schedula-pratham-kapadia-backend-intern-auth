import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTokenNumberToAppointments1700000012000 implements MigrationInterface {
  name = 'AddTokenNumberToAppointments1700000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'appointments',
      new TableColumn({
        name: 'token_number',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('appointments', 'token_number');
  }
}