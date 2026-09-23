import {
     BadRequestException,
     Injectable,
     InternalServerErrorException,
     Logger,
     NotFoundException,
 } from '@nestjs/common';
 import * as bcrypt from 'bcryptjs';
 import { Prisma, PrismaService, User as PrismaUser } from '@org/prisma';
 import { CreateUserInput } from './dto/create-user.input';
 import { UpdateUserInput } from './dto/update-user.input';

 const SALT_ROUNDS = 10;

 @Injectable()
 export class UsersService {
     
     private readonly logger = new Logger(UsersService.name);

     constructor(private readonly prisma: PrismaService) {}

     async create(createUserInput: CreateUserInput): Promise<PrismaUser> {
        
         const password = await bcrypt.hash(createUserInput.password, SALT_ROUNDS);

         try {
             return await this.prisma.user.create({
                 data: { ...createUserInput, password },
             });
          } catch (error) {
             this.handleDbErrors(error);
         }
     }

     findAll(roles: string[] = []): Promise<PrismaUser[]> {
         return this.prisma.user.findMany({
             where: roles.length > 0 ? { roles: { hasSome: roles } } : undefined,
             orderBy: { createdAt: 'desc' },
         });
     }

     async findOne(id: string): Promise<PrismaUser> {
         const user = await this.prisma.user.findUnique({ where: { id } });

         if (!user) {
             throw new NotFoundException(`No existe un usuario con id ${id}`);
         }

         return user;
     }

     async findOneByEmail(email: string): Promise<PrismaUser> {
         const user = await this.prisma.user.findUnique({ where: { email } });

         if (!user) {
             throw new NotFoundException(`No existe un usuario con email ${email}`);
         }

         return user;
     }

     async update(id: string, updateUserInput: UpdateUserInput): Promise<PrismaUser> {
         const { id: _ignored, password, ...rest } = updateUserInput;
 
         try {
             return await this.prisma.user.update({
                 where: { id },
                     data: {
                         ...rest,
                         ...(password ? 
                             { password: await bcrypt.hash(password, SALT_ROUNDS) } : {}
                        ),
                 },
             });
         } catch (error) {

             this.handleDbErrors(error);
        }
    }

     async remove(id: string): Promise<PrismaUser> {
         try {
             return await this.prisma.user.delete({ where: { id } });
         } catch (error) {
             this.handleDbErrors(error);
         }
     }

     private handleDbErrors(error: unknown): never {
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2002') {
                 const target = (error.meta?.['target'] as string[] | undefined)?.join(', ');
                 throw new BadRequestException(`Ya existe un usuario con ese ${target ?? 'valor único'}`);
             }

             if (error.code === 'P2025') {
                 throw new NotFoundException('Usuario no encontrado');
            }
         }

         this.logger.error(error);
         throw new InternalServerErrorException('Revisa los logs del servidor');
     }
 }
