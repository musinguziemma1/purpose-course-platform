export function hashPassword(password: string): string;
export function verifyPassword(password: string, stored: string): boolean;
export function passwordError(password: string): string | null;
export function initialPassword(): string;
