import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

/**
 * Protegido a nivel de clase: cualquier query/mutation de este resolver
 * requiere un JWT válido. Los roles puntuales se exigen por método con
 * @CurrentUser([...roles]), igual que en el proyecto de referencia.
 */
@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User, { name: 'createUser' })
  createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<User> {
    return this.usersService.create(createUserInput);
  }

  @Query(() => [User], { name: 'users' })
  findAll(
    @Args('roles', { type: () => [ValidRoles], nullable: true })
    roles: ValidRoles[] | undefined,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<User[]> {
    return this.usersService.findAll(roles ?? []);
  }

  @Query(() => User, { name: 'user' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) _admin: User,
  ): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Query(() => User, { name: 'userByEmail' })
  findOneByEmail(
    @Args('email') email: string,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) _admin: User,
  ): Promise<User> {
    return this.usersService.findOneByEmail(email);
  }

  @Mutation(() => User, { name: 'updateUser' })
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<User> {
    return this.usersService.update(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => User, { name: 'removeUser' })
  removeUser(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser([ValidRoles.admin]) _admin: User,
  ): Promise<User> {
    return this.usersService.remove(id);
  }
}
