 import { Field, InputType } from '@nestjs/graphql';
 import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
 import { ValidRoles } from '../../auth/enums/valid-roles.enum';

 @InputType()
 export class CreateUserInput {

     @Field(() => String)
     @IsString()
     @MinLength(3)
     fullName!: string;

     @Field(() => String)
     @IsEmail({}, { message: 'Correo electrónico inválido' })
     email!: string;   

     @Field(() => String)
     @IsString()
     @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
     password!: string; 

     @Field(() => [ValidRoles], { nullable: true })
     @IsOptional()
     @IsArray()
     @IsEnum(ValidRoles, { each: true })
     roles?: ValidRoles[];
}
