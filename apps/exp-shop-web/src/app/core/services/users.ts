import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import type { User } from '@exp-shop/shared/interfaces';

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  roles?: string[];
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
}

const USER_FIELDS = `
  id
  fullName
  email
  avatar
  roles
  isActive
  createdAt
  updatedAt
`;

const USERS_QUERY = gql`
  query Users($roles: [ValidRoles!]) {
    users(roles: $roles) { ${USER_FIELDS} }
  }
`;

const USER_BY_ID_QUERY = gql`
  query User($id: ID!) {
    user(id: $id) { ${USER_FIELDS} }
  }
`;

const USER_BY_EMAIL_QUERY = gql`
  query UserByEmail($email: String!) {
    userByEmail(email: $email) { ${USER_FIELDS} }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($createUserInput: CreateUserInput!) {
    createUser(createUserInput: $createUserInput) { ${USER_FIELDS} }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($updateUserInput: UpdateUserInput!) {
    updateUser(updateUserInput: $updateUserInput) { ${USER_FIELDS} }
  }
`;

/**
 * Todas las queries/mutations de acá exigen rol admin (o admin/superUser en
 * `user`/`userByEmail`) del lado del backend — ver docs/modulo-auth-jwt.md §4.3.
 * Sin una sesión de admin autenticada, cualquiera de estos métodos devuelve
 * un error 401/403 desde la API, no algo que este servicio deba validar.
 */
@Injectable({ providedIn: 'root' })
export class Users {
  private readonly apollo = inject(Apollo);

  getUsers(roles?: string[]): Observable<User[]> {
    return this.apollo
      .query<{ users: User[] }>({
        query: USERS_QUERY,
        variables: { roles },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.users ?? []));
  }

  getUserById(id: string): Observable<User> {
    return this.apollo
      .query<{ user: User }>({
        query: USER_BY_ID_QUERY,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error(`No se encontró el usuario ${id}`);
          }
          return result.data.user;
        }),
      );
  }

  getUserByEmail(email: string): Observable<User> {
    return this.apollo
      .query<{ userByEmail: User }>({
        query: USER_BY_EMAIL_QUERY,
        variables: { email },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error(`No se encontró el usuario ${email}`);
          }
          return result.data.userByEmail;
        }),
      );
  }

  createUser(createUserInput: CreateUserInput): Observable<User> {
    return this.apollo
      .mutate<{ createUser: User }>({
        mutation: CREATE_USER_MUTATION,
        variables: { createUserInput },
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error('No se pudo crear el usuario');
          }
          return result.data.createUser;
        }),
      );
  }

  updateUser(updateUserInput: UpdateUserInput): Observable<User> {
    return this.apollo
      .mutate<{ updateUser: User }>({
        mutation: UPDATE_USER_MUTATION,
        variables: { updateUserInput },
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error('No se pudo actualizar el usuario');
          }
          return result.data.updateUser;
        }),
      );
  }
}
