import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1700000011000 implements MigrationInterface {
  name = 'CreateNotifications1700000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification type enum
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum" AS ENUM(
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_CANCELLED',
        'APPOINTMENT_RESCHEDULED',
        'APPOINTMENT_REMINDER',
        'FOLLOW_UP_REMINDER'
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id" UUID NOT NULL,
        "title"      VARCHAR(255) NOT NULL,
        "message"    TEXT NOT NULL,
        "type"       "public"."notifications_type_enum" NOT NULL,
        "is_read"    BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_patient"
          FOREIGN KEY ("patient_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    // Index for fast patient notification queries
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_patient_id"
        ON "notifications" ("patient_id")
    `);

    // Index for unread count queries
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_patient_unread"
        ON "notifications" ("patient_id", "is_read")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_patient_unread"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_patient_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}