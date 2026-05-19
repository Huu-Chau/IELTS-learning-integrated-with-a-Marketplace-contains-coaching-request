import { Role } from './auth.types';

export class RegisterPayload {
    constructor(
        readonly username: string,
        readonly password: string,
        readonly name: string,
        readonly role: Role,
    ) { }
}
