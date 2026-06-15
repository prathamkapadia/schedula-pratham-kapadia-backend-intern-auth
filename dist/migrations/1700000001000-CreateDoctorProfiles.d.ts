import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateDoctorProfiles1700000001000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
