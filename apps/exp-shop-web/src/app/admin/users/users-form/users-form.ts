import { Component, computed, inject, signal } from '@angular/core';
import {
    email,
    form,
    FormField,
    minLength,
    readonly,
    required,
    submit,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Users } from '../../../core/services/users';
import type { User } from '@exp-shop/shared/interfaces';

type FormMode = 'create' | 'edit' | 'view';

interface UsersFormModel {
    fullName: string;
    email: string;
    password: string;
}

const ROLE_OPTIONS = ['admin', 'user', 'superUser'] as const;

/**
 * Se abre como diálogo dinámico de PrimeNG (ver DataViewerTemplate.callDialog) —
 * `DynamicDialogConfig.data` trae `{ id, mode }`. `mode` se normaliza con
 * `resolveMode()` porque hoy conviven distintos valores en el código que la
 * invoca ('EDIT'/'SHOW' desde ActionButtonsCell, el placeholder 'open' desde
 * el botón "Nuevo" de DataViewerTemplate) — cualquier valor que no sea
 * reconocible como edición o vista se trata como alta nueva.
 */
@Component({
    selector: 'app-users-form',
    imports: [FormField, ButtonModule, InputTextModule, MessageModule],
    templateUrl: './users-form.html',
    styleUrl: './users-form.scss',
})
export class UsersForm {
    private readonly usersService = inject(Users);
    private readonly dialogRef = inject(DynamicDialogRef, { optional: true });
    private readonly dialogConfig = inject(DynamicDialogConfig, { optional: true });

    protected readonly roleOptions = ROLE_OPTIONS;

    protected readonly mode = signal<FormMode>(this.resolveMode());
    protected readonly userId = signal<string | undefined>(this.dialogConfig?.data?.id || undefined);

    protected readonly userModel = signal<UsersFormModel>({
        fullName: '',
        email: '',
        password: '',
    });

    protected readonly userForm = form(this.userModel, schemaPath => {
        readonly(schemaPath.fullName, { when: () => this.mode() === 'view' });
        required(schemaPath.fullName, { message: 'El nombre es obligatorio' });
        minLength(schemaPath.fullName, 3, {
            message: 'El nombre debe tener al menos 3 caracteres',
        });

        readonly(schemaPath.email, { when: () => this.mode() === 'view' });
        required(schemaPath.email, { message: 'El correo es obligatorio' });
        email(schemaPath.email, { message: 'Ingresa un correo válido' });

        // En modo edición, dejar la contraseña en blanco significa "no cambiarla".
        required(schemaPath.password, {
            when: () => this.mode() !== 'edit',
            message: 'La contraseña es obligatoria',
        });
        minLength(
            schemaPath.password,
            () => (this.mode() === 'edit' && !this.userModel().password ? undefined : 8),
            { message: 'La contraseña debe tener al menos 8 caracteres' }
        );
    });

    protected readonly selectedRoles = signal<string[]>(['user']);
    protected readonly lastStatus = signal<boolean | null>(null);

    protected readonly loading = signal(false);
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);
    protected readonly showPassword = signal(false);

    protected readonly readOnly = computed(() => this.mode() === 'view');

    protected readonly title = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Editar usuario';
            case 'view':
                return 'Detalle del usuario';
            default:
                return 'Nuevo usuario';
        }
    });

    protected readonly subtitle = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Actualiza los datos del usuario.';
            case 'view':
                return 'Información del usuario.';
            default:
                return 'Completa los datos para crear un usuario.';
        }
    });

    constructor() {
        const id = this.userId();
        if (this.mode() !== 'create' && id) {
            void this.loadUser(id);
        }
    }

    private resolveMode(): FormMode {
        const raw = String(this.dialogConfig?.data?.mode ?? '').toLowerCase();

        if (raw.includes('edit')) return 'edit';
        if (raw.includes('show') || raw.includes('view')) return 'view';
        return 'create';
    }

    private async loadUser(id: string): Promise<void> {
        this.loading.set(true);

        try {
            const user = await firstValueFrom(this.usersService.getUserById(id));
            this.applyUser(user);
        } catch (error) {
            this.errorMessage.set(this.toErrorMessage(error));
        } finally {
            this.loading.set(false);
        }
    }

    private applyUser(user: User): void {
        this.userModel.set({ fullName: user.fullName, email: user.email, password: '' });
        this.selectedRoles.set(user.roles?.length ? user.roles : ['user']);
        this.lastStatus.set(user.isActive);
    }

    protected isRoleSelected(role: string): boolean {
        return this.selectedRoles().includes(role);
    }

    protected toggleRole(role: string): void {
        if (this.readOnly()) return;

        const current = this.selectedRoles();
        this.selectedRoles.set(
            current.includes(role) ? current.filter(r => r !== role) : [...current, role]
        );
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.readOnly()) return;

        void submit(this.userForm, async () => {
            this.errorMessage.set(null);
            this.submitting.set(true);

            try {
                const { fullName, email, password } = this.userModel();
                const roles = this.selectedRoles();
                const id = this.userId();

                const saved =
                    this.mode() === 'edit' && id
                        ? await firstValueFrom(
                              this.usersService.updateUser({
                                  id,
                                  fullName,
                                  email,
                                  roles,
                                  ...(password ? { password } : {}),
                              })
                          )
                        : await firstValueFrom(
                              this.usersService.createUser({ fullName, email, password, roles })
                          );

                this.dialogRef?.close(saved);
                return undefined;
            } catch (error) {
                this.errorMessage.set(this.toErrorMessage(error));
                return undefined;
            } finally {
                this.submitting.set(false);
            }
        });
    }

    protected async onSoftDelete(): Promise<void> {
        const id = this.userId();
        if (!id || this.submitting()) return;

        this.errorMessage.set(null);
        this.submitting.set(true);

        try {
            const saved = await firstValueFrom(this.usersService.softDeleteUser(id));
            this.dialogRef?.close(saved);
        } catch (error) {
            this.errorMessage.set(this.toErrorMessage(error));
        } finally {
            this.submitting.set(false);
        }
    }

    protected onCancel(): void {
        this.dialogRef?.close();
    }

    private toErrorMessage(error: unknown): string {
        if (CombinedGraphQLErrors.is(error)) {
            return error.message;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return 'No se pudo guardar el usuario. Intenta de nuevo.';
    }
}
