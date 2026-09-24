import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { Auth } from '../../core/services/auth';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [FormField, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly loginModel = signal<LoginFormModel>({ email: '', password: '' });

  protected readonly loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo es obligatorio' });
    email(schemaPath.email, { message: 'Ingresa un correo válido' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria' });
    minLength(schemaPath.password, 8, {
      message: 'La contraseña debe tener al menos 8 caracteres',
    });
  });

  protected readonly submitting = signal(false);
  protected readonly loginError = signal<string | null>(null);

  /** Solo visual por ahora: no hay distinción real de sesión persistente vs. de una sola pestaña. */
  protected readonly rememberMe = signal(true);
  protected readonly showPassword = signal(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();

    void submit(this.loginForm, async () => {
      this.loginError.set(null);
      this.submitting.set(true);

      try {
        const { email, password } = this.loginModel();
        await firstValueFrom(this.auth.login(email, password));
        await this.router.navigateByUrl('/');
        return undefined;
      } catch (error) {
        this.loginError.set(this.toErrorMessage(error));
        return undefined;
      } finally {
        this.submitting.set(false);
      }
    });
  }

  private toErrorMessage(error: unknown): string {
    if (CombinedGraphQLErrors.is(error)) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'No se pudo iniciar sesión. Intenta de nuevo.';
  }
}
