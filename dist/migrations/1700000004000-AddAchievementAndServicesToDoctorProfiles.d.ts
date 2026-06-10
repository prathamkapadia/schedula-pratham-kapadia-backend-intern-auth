import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddAchievementAndServicesToDoctorProfiles1700000004000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
