import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SignupInput, LoginInput } from './dto/inputs';
import { AuthResponse } from './types/auth-response.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtToken(userId: string): string {
    return this.jwtService.sign({ id: userId });
  }

  async signup(signupInput: SignupInput): Promise<AuthResponse> {
    const user = await this.usersService.create(signupInput);
    const token = this.getJwtToken(user.id);

    return { token, user };
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const { email, password } = loginInput;
    const user = await this.usersService.findOneByEmail(email);

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new BadRequestException('Credenciales inválidas');
    }

    const token = this.getJwtToken(user.id);
    return { token, user };
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.usersService.findOne(id);

    if (!user.isActive) {
      throw new UnauthorizedException('El usuario está inactivo, contacta a un administrador');
    }

    return user;
  }

  revalidateToken(user: User): AuthResponse {
    const token = this.getJwtToken(user.id);
    return { token, user };
  }

  /**
   * `user` ya viene resuelto por JwtStrategy (relee la base en cada request,
   * ver docs/modulo-auth-jwt.md §4.4) — no hace falta otra consulta acá.
   */
  getProfile(user: User): User {
    return user;
  }
}
