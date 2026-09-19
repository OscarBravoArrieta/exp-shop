export type { User } from '@exp-shop/shared/interfaces';
// CreateUserDto y LoginDto son clases (con decoradores de class-validator) y
// deben re-exportarse como valor, no como tipo, para poder instanciarlas
// (por ejemplo, para validar un formulario antes de enviarlo).
export { CreateUserDto, LoginDto } from '@exp-shop/shared/interfaces';

export interface UserToUpdate {
  email: string;
  name: string;
}

export interface Email {
  email: string;
}

export interface EmailIsAvailable {
  isAvailable: boolean;
}

export interface Token {
  token: string;
  refreshToken: string;
}

export interface AccountError {
  field: string | null;
  message: string | null;
  code: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

export interface RegisterResult {
  requiresConfirmation: boolean | null;
}
