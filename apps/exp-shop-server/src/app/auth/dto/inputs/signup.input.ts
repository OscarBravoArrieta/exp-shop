import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

/**
 * A propósito NO tiene `roles` (a diferencia de users/dto/create-user.input.ts,
 * que sí lo permite para altas hechas por un admin desde UsersResolver):
 * quien se autorregistra siempre queda con el rol por defecto de Prisma (`user`).
 */
@InputType()
export class SignupInput {
  @Field(() => String)
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName!: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
