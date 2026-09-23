 import { Field, InputType } from '@nestjs/graphql';
 import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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

     @Field(() => [String], { nullable: true })
     @IsOptional()
     @IsArray()
     roles?: string[];
}
