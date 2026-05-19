import { Role } from '../auth/auth.types';

export class TopUpPayload {
    constructor(readonly credits: number) { }
}

export class UpdateUserPayload {
    constructor(
        readonly name?: string,
        readonly email?: string,
        readonly avatar_url?: string
    ) { }
}

export class SetRolePayload {
    constructor(readonly role: Role) {
    }
}
