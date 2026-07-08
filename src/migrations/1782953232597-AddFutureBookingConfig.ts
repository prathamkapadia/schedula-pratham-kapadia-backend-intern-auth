import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFutureBookingConfig1782953232597 implements MigrationInterface {
    name = 'AddFutureBookingConfig1782953232597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "fk_appointments_rescheduled_from"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ADD "allow_future_booking" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ADD "max_future_booking_days" integer`);
        await queryRunner.query(`ALTER TYPE "public"."scheduling_type_enum" RENAME TO "scheduling_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_profiles_scheduling_type_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" TYPE "public"."doctor_profiles_scheduling_type_enum" USING "scheduling_type"::"text"::"public"."doctor_profiles_scheduling_type_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" SET DEFAULT 'STREAM'`);
        await queryRunner.query(`DROP TYPE "public"."scheduling_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."day_of_week_enum" RENAME TO "day_of_week_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_availability_day_of_week_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ALTER COLUMN "day_of_week" TYPE "public"."recurring_availability_day_of_week_enum" USING "day_of_week"::"text"::"public"."recurring_availability_day_of_week_enum"`);
        await queryRunner.query(`DROP TYPE "public"."day_of_week_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."slot_status_enum" RENAME TO "slot_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."slots_status_enum" AS ENUM('AVAILABLE', 'BOOKED')`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" TYPE "public"."slots_status_enum" USING "status"::"text"::"public"."slots_status_enum"`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`);
        await queryRunner.query(`DROP TYPE "public"."slot_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."appointment_status_enum" RENAME TO "appointment_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('BOOKED', 'CANCELLED', 'RESCHEDULED')`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" TYPE "public"."appointments_status_enum" USING "status"::"text"::"public"."appointments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'BOOKED'`);
        await queryRunner.query(`DROP TYPE "public"."appointment_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."appointment_status_enum_old" AS ENUM('BOOKED', 'CANCELLED', 'RESCHEDULED')`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" TYPE "public"."appointment_status_enum_old" USING "status"::"text"::"public"."appointment_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'BOOKED'`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."appointment_status_enum_old" RENAME TO "appointment_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."slot_status_enum_old" AS ENUM('AVAILABLE', 'BOOKED')`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" TYPE "public"."slot_status_enum_old" USING "status"::"text"::"public"."slot_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`);
        await queryRunner.query(`DROP TYPE "public"."slots_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."slot_status_enum_old" RENAME TO "slot_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."day_of_week_enum_old" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ALTER COLUMN "day_of_week" TYPE "public"."day_of_week_enum_old" USING "day_of_week"::"text"::"public"."day_of_week_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availability_day_of_week_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."day_of_week_enum_old" RENAME TO "day_of_week_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."scheduling_type_enum_old" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" TYPE "public"."scheduling_type_enum_old" USING "scheduling_type"::"text"::"public"."scheduling_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ALTER COLUMN "scheduling_type" SET DEFAULT 'STREAM'`);
        await queryRunner.query(`DROP TYPE "public"."doctor_profiles_scheduling_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."scheduling_type_enum_old" RENAME TO "scheduling_type_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN "max_future_booking_days"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN "allow_future_booking"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_rescheduled_from" FOREIGN KEY ("rescheduled_from_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
