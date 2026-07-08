import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderSentToAppointments1700000014000 implements MigrationInterface {
  name = 'AddReminderSentToAppointments1700000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN IF NOT EXISTS "reminder_sent" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointments"
      DROP COLUMN IF EXISTS "reminder_sent"
    `);
  }
}