import { Injectable, computed, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, catchError, map, of, tap } from 'rxjs';
import type { User } from '@exp-shop/shared/interfaces';
import { LocalStorage } from './local-storage';

export const AUTH_TOKEN_KEY = 'exp-shop-token';

export interface AuthResponse {
  token: string;
  user: User;
}

export type AuthStatus = 'checking' | 'authenticated' | 'not-authenticated';

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

const LOGIN_MUTATION = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      token
      user { ${USER_FIELDS} }
    }
  }
`;

const PROFILE_QUERY = gql`
  query Profile {
    profile { ${USER_FIELDS} }
  }
`;

const REVALIDATE_QUERY = gql`
  query Revalidate {
    revalidate {
      token
      user { ${USER_FIELDS} }
    }
  }
`;

/**
 * Fuente de verdad de la sesión en el frontend. El token vive en localStorage
 * (vía LocalStorage) y el usuario actual en un signal — cualquier componente
 * puede leer `currentUser()`/`isAuthenticated()` de forma reactiva, sin
 * tener que volver a pedirlo.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly apollo = inject(Apollo);
  private readonly localStorage = inject(LocalStorage);

  private readonly _currentUser = signal<User | null>(null);
  private readonly _status = signal<AuthStatus>('checking');

  readonly currentUser = this._currentUser.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  login(email: string, password: string): Observable<AuthResponse> {
    return this.apollo
      .mutate<{ login: AuthResponse }>({
        mutation: LOGIN_MUTATION,
        variables: { loginInput: { email, password } },
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error('No se recibió respuesta del servidor al iniciar sesión');
          }
          console.log('Login response from authService:', result.data.login);
          return result.data.login;
        }),
        tap((auth) => this.setSession(auth)),
      );
  }

  /** Trae el perfil del usuario logueado y refresca el signal `currentUser`. */
  getProfile(): Observable<User> {
    return this.apollo
      .query<{ profile: User }>({
        query: PROFILE_QUERY,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error('No se pudo obtener el perfil');
          }
          return result.data.profile;
        }),
        tap((user) => this._currentUser.set(user)),
      );
  }

  logout(): void {
    this.localStorage.removeItem(AUTH_TOKEN_KEY);
    this._currentUser.set(null);
    this._status.set('not-authenticated');
    // limpia la cache de Apollo para que no queden datos del usuario anterior
    void this.apollo.client.clearStore().catch(() => undefined);
  }

  /**
   * Se llama al arrancar la app (ver app.config.ts): si hay token guardado,
   * lo valida contra el backend (revalidate relee la base, ver
   * docs/modulo-auth-jwt.md §4.4) y renueva la sesión; si no hay token, o el
   * que había ya no sirve, deja el estado en 'not-authenticated'.
   */
  checkAuthStatus(): Observable<boolean> {
    const token = this.localStorage.getItem<string>(AUTH_TOKEN_KEY);

    if (!token) {
      this._status.set('not-authenticated');
      return of(false);
    }

    return this.apollo
      .query<{ revalidate: AuthResponse }>({
        query: REVALIDATE_QUERY,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data) {
            throw new Error('No se pudo revalidar la sesión');
          }
          //console.log('AuthService.checkstatus...', result.data.revalidate)
          return result.data.revalidate;
        }),
        tap((auth) => this.setSession(auth)),
        map(() => true),
        catchError(() => {
          this.logout();
          return of(false);
        }),
      );
  }

  private setSession(auth: AuthResponse): void {
    this.localStorage.setItem(AUTH_TOKEN_KEY, auth.token);
    this._currentUser.set(auth.user);
    this._status.set('authenticated');
  }
}
