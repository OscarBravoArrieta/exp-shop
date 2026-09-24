import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/user.entity';

/** Lo que devuelven `signup`, `login` y `revalidate`. */
@ObjectType()
export class AuthResponse {
  @Field(() => String)
  token!: string;

  @Field(() => User)
  user!: User;
}
