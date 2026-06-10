export declare enum Role {
    DOCTOR = "DOCTOR",
    PATIENT = "PATIENT"
}
export declare class User {
    id: string;
    name: string;
    email: string;
    password: string;
    role: Role;
    specialization: string;
    licenseNumber: string;
    dateOfBirth: string;
    bloodGroup: string;
    createdAt: Date;
    updatedAt: Date;
}
