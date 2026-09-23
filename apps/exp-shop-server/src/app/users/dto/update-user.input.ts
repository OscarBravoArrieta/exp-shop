 import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
 import { IsUUID } from 'class-validator';
 import { CreateUserInput } from './create-user.input';

 /**
  * `PartialType` vuelve opcionales fullName/email/password/roles (heredados de
  * CreateUserInput) y conserva sus mismas validaciones cuando sí vienen.
  * `id` es el único campo obligatorio propio de esta clase.
  */
 @InputType()
 export class UpdateUserInput extends PartialType(CreateUserInput) {
     @Field(() => ID)
     @IsUUID()
     id!: string;
 }
