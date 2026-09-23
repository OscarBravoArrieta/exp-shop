 import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
 import { UsersService } from './users.service';
 import { User } from './user.entity';
 import { CreateUserInput } from './dto/create-user.input';
 import { UpdateUserInput } from './dto/update-user.input';

 /**
  * Sin @UseGuards todavía: el módulo `auth` (JwtAuthGuard, @CurrentUser) no
  * existe aún en este proyecto. Cuando se construya, estas mutations/queries
  * deberían protegerse igual que en el proyecto de referencia analizado
  * (docs/analisis-auth-users-nest-anylist.md).
  */
 @Resolver(() => User)
 export class UsersResolver {
     constructor(private readonly usersService: UsersService) {}

     @Mutation(() => User, { name: 'createUser' })
     createUser(@Args('createUserInput') createUserInput: CreateUserInput): Promise<User> {
         return this.usersService.create(createUserInput);
     }

     @Query(() => [User], { name: 'users' })
     findAll(
         @Args('roles', { type: () => [String], nullable: true })
         roles?: string[],
     ): Promise<User[]> {
         return this.usersService.findAll(roles ?? []);
     }

     @Query(() => User, { name: 'user' })
     findOne(@Args('id', { type: () => ID }) id: string): Promise<User> {
         return this.usersService.findOne(id);
     }

     @Mutation(() => User, { name: 'updateUser' })
     updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput): Promise<User> {
         return this.usersService.update(updateUserInput.id, updateUserInput);
     }

     @Mutation(() => User, { name: 'removeUser' })
     removeUser(@Args('id', { type: () => ID }) id: string): Promise<User> {
         return this.usersService.remove(id);
     }
 }
