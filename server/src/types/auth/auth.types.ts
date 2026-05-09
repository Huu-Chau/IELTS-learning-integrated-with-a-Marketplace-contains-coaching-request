export enum Role {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin',
}

export interface IRegisterResult {
    uid: string;
    role: Role;
    message: string;
}
