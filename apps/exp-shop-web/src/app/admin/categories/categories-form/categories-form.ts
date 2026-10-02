import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, minLength, readonly, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Categories } from '../../../core/services/categories';
import type { Category } from '../../../core/models/category.model';

type FormMode = 'create' | 'edit' | 'view';

interface CategoriesFormModel {
    name: string;
    image: string;
    slug: string;
}

/** Mismo esquema que UsersForm — ver el comentario ahí para el porqué de `resolveMode()`. */
@Component({
    selector: 'app-categories-form',
    imports: [FormField, ButtonModule, InputTextModule, MessageModule],
    templateUrl: './categories-form.html',
    styleUrl: './categories-form.scss',
})
export class CategoriesForm {
    private readonly categoriesService = inject(Categories);
    private readonly dialogRef = inject(DynamicDialogRef, { optional: true });
    private readonly dialogConfig = inject(DynamicDialogConfig, { optional: true });

    protected readonly mode = signal<FormMode>(this.resolveMode());
    protected readonly categoryId = signal<string | undefined>(this.dialogConfig?.data?.id || undefined);

    protected readonly categoryModel = signal<CategoriesFormModel>({
        name: '',
        image: '',
        slug: '',
    });

    protected readonly categoryForm = form(this.categoryModel, schemaPath => {
        readonly(schemaPath.name, { when: () => this.mode() === 'view' });
        required(schemaPath.name, { message: 'El nombre es obligatorio' });
        minLength(schemaPath.name, 3, { message: 'El nombre debe tener al menos 3 caracteres' });

        readonly(schemaPath.image, { when: () => this.mode() === 'view' });
        required(schemaPath.image, { message: 'La imagen es obligatoria' });

        readonly(schemaPath.slug, { when: () => this.mode() === 'view' });
        required(schemaPath.slug, { message: 'El slug es obligatorio' });
    });

    protected readonly lastStatus = signal<boolean | null>(null);
    protected readonly loading = signal(false);
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    protected readonly readOnly = computed(() => this.mode() === 'view');

    protected readonly title = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Editar categoría';
            case 'view':
                return 'Detalle de la categoría';
            default:
                return 'Nueva categoría';
        }
    });

    protected readonly subtitle = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Actualiza los datos de la categoría.';
            case 'view':
                return 'Información de la categoría.';
            default:
                return 'Completa los datos para crear una categoría.';
        }
    });

    constructor() {
        const id = this.categoryId();
        if (this.mode() !== 'create' && id) {
            void this.loadCategory(id);
        }
    }

    private resolveMode(): FormMode {
        const raw = String(this.dialogConfig?.data?.mode ?? '').toLowerCase();

        if (raw.includes('edit')) return 'edit';
        if (raw.includes('show') || raw.includes('view')) return 'view';
        return 'create';
    }

    private async loadCategory(id: string): Promise<void> {
        this.loading.set(true);

        try {
            const category = await firstValueFrom(this.categoriesService.getCategoryById(id));
            this.applyCategory(category);
        } catch (error) {
            this.errorMessage.set(this.toErrorMessage(error));
        } finally {
            this.loading.set(false);
        }
    }

    private applyCategory(category: Category): void {
        this.categoryModel.set({ name: category.name, image: category.image, slug: category.slug });
        this.lastStatus.set(category.isActive);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.readOnly()) return;

        void submit(this.categoryForm, async () => {
            this.errorMessage.set(null);
            this.submitting.set(true);

            try {
                const { name, image, slug } = this.categoryModel();
                const id = this.categoryId();

                const saved =
                    this.mode() === 'edit' && id
                        ? await firstValueFrom(
                              this.categoriesService.updateCategory({ id, name, image, slug })
                          )
                        : await firstValueFrom(
                              this.categoriesService.createCategory({ name, image, slug })
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
        const id = this.categoryId();
        if (!id || this.submitting()) return;

        this.errorMessage.set(null);
        this.submitting.set(true);

        try {
            const saved = await firstValueFrom(this.categoriesService.softDeleteCategory(id));
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

        return 'No se pudo guardar la categoría. Intenta de nuevo.';
    }
}
