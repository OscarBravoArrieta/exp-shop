import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(configService.get<string>('JWT_EXPIRATION')),
        },
      }),
    }),
    UsersModule,
  ],
  providers: [AuthResolver, AuthService, JwtStrategy],
  // Se exportan para que cualquier módulo que importe AuthModule más
  // adelante pueda reusar la estrategia/JwtService ya configurados.
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
