import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRescheduledFieldsToAppointments1700000013000 implements MigrationInterface {
  name = 'AddRescheduledFieldsToAppointments1700000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "appointment_status_enum" ADD VALUE IF NOT EXISTS 'RESCHEDULED'
    `);
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN IF NOT EXISTS "rescheduled_from_id" uuid NULL,
      ADD COLUMN IF NOT EXISTS "rescheduled_at" timestamp NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "fk_appointments_rescheduled_from"
      FOREIGN KEY ("rescheduled_from_id")
      REFERENCES "appointments"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "fk_appointments_rescheduled_from"`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "rescheduled_from_id", DROP COLUMN IF EXISTS "rescheduled_at"`);
  }
}