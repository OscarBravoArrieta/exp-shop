import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, max, min, minLength, readonly, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Products } from '../../../core/services/products';
import { Categories } from '../../../core/services/categories';
import type { Product } from '../../../core/models/products.model';
import type { Category } from '../../../core/models/category.model';

type FormMode = 'create' | 'edit' | 'view';

interface ProductsFormModel {
    title: string;
    price: number;
    description: string;
    slug: string;
    quantity: number;
    image: string;
    categoryId: string;
}

/**
 * Mismo esquema que UsersForm (modos crear/editar/ver vía
 * DynamicDialogConfig.data, Signal Forms, botón "Eliminar" en edición que
 * llama softDelete). `images` del backend es un arreglo, pero acá se maneja
 * como un solo campo de URL — no había pedido un uploader/repetidor de
 * imágenes, así que se simplifica a "la imagen principal" (`images: [url]`).
 */
@Component({
    selector: 'app-products-form',
    imports: [FormField, ButtonModule, InputTextModule, MessageModule],
    templateUrl: './products-form.html',
    styleUrl: './products-form.scss',
})
export class ProductsForm {
    private readonly productsService = inject(Products);
    private readonly categoriesService = inject(Categories);
    private readonly dialogRef = inject(DynamicDialogRef, { optional: true });
    private readonly dialogConfig = inject(DynamicDialogConfig, { optional: true });

    protected readonly mode = signal<FormMode>(this.resolveMode());
    protected readonly productId = signal<string | undefined>(this.dialogConfig?.data?.id || undefined);

    protected readonly categoriesResource = rxResource({
        stream: () => this.categoriesService.getCategories(),
        defaultValue: [] as Category[],
    });

    protected readonly productModel = signal<ProductsFormModel>({
        title: '',
        price: 0,
        description: '',
        slug: '',
        quantity: 0,
        image: '',
        categoryId: '',
    });

    protected readonly productForm = form(this.productModel, schemaPath => {
        readonly(schemaPath.title, { when: () => this.mode() === 'view' });
        required(schemaPath.title, { message: 'El título es obligatorio' });
        minLength(schemaPath.title, 3, { message: 'El título debe tener al menos 3 caracteres' });

        readonly(schemaPath.price, { when: () => this.mode() === 'view' });
        required(schemaPath.price, { message: 'El precio es obligatorio' });
        min(schemaPath.price, 0.01, { message: 'El precio debe ser mayor que 0' });

        readonly(schemaPath.description, { when: () => this.mode() === 'view' });
        required(schemaPath.description, { message: 'La descripción es obligatoria' });

        readonly(schemaPath.slug, { when: () => this.mode() === 'view' });
        required(schemaPath.slug, { message: 'El slug es obligatorio' });

        readonly(schemaPath.quantity, { when: () => this.mode() === 'view' });
        required(schemaPath.quantity, { message: 'La cantidad es obligatoria' });
        min(schemaPath.quantity, 0, { message: 'La cantidad no puede ser negativa' });
        max(schemaPath.quantity, 1_000_000, { message: 'La cantidad no es válida' });

        readonly(schemaPath.categoryId, { when: () => this.mode() === 'view' });
        readonly(schemaPath.image, { when: () => this.mode() === 'view' });
    });

    protected readonly lastStatus = signal<boolean | null>(null);
    protected readonly loading = signal(false);
    protected readonly submitting = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    protected readonly readOnly = computed(() => this.mode() === 'view');

    protected readonly title = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Editar producto';
            case 'view':
                return 'Detalle del producto';
            default:
                return 'Nuevo producto';
        }
    });

    protected readonly subtitle = computed(() => {
        switch (this.mode()) {
            case 'edit':
                return 'Actualiza los datos del producto.';
            case 'view':
                return 'Información del producto.';
            default:
                return 'Completa los datos para crear un producto.';
        }
    });

    constructor() {
        const id = this.productId();
        if (this.mode() !== 'create' && id) {
            void this.loadProduct(id);
        }
    }

    private resolveMode(): FormMode {
        const raw = String(this.dialogConfig?.data?.mode ?? '').toLowerCase();

        if (raw.includes('edit')) return 'edit';
        if (raw.includes('show') || raw.includes('view')) return 'view';
        return 'create';
    }

    private async loadProduct(id: string): Promise<void> {
        this.loading.set(true);

        try {
            const product = await firstValueFrom(this.productsService.getProductById(id));
            this.applyProduct(product);
        } catch (error) {
            this.errorMessage.set(this.toErrorMessage(error));
        } finally {
            this.loading.set(false);
        }
    }

    private applyProduct(product: Product): void {
        this.productModel.set({
            title: product.title,
            price: product.price,
            description: product.description,
            slug: product.slug,
            quantity: product.quantity,
            image: product.images?.[0] ?? '',
            categoryId: product.categoryId ?? '',
        });
        this.lastStatus.set(product.isActive);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.readOnly()) return;

        void submit(this.productForm, async () => {
            this.errorMessage.set(null);
            this.submitting.set(true);

            try {
                const { title, price, description, slug, quantity, image, categoryId } =
                    this.productModel();
                const images = image ? [image] : [];
                const id = this.productId();

                const saved =
                    this.mode() === 'edit' && id
                        ? await firstValueFrom(
                              this.productsService.updateProduct({
                                  id,
                                  title,
                                  price,
                                  description,
                                  slug,
                                  quantity,
                                  images,
                                  categoryId: categoryId || undefined,
                              })
                          )
                        : await firstValueFrom(
                              this.productsService.createProduct({
                                  title,
                                  price,
                                  description,
                                  slug,
                                  quantity,
                                  images,
                                  categoryId: categoryId || undefined,
                              })
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
        const id = this.productId();
        if (!id || this.submitting()) return;

        this.errorMessage.set(null);
        this.submitting.set(true);

        try {
            const saved = await firstValueFrom(this.productsService.softDeleteProduct(id));
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

        return 'No se pudo guardar el producto. Intenta de nuevo.';
    }
}
