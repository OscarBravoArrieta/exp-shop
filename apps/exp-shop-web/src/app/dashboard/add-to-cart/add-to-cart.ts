import { Component, signal } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { form, FormField, min, required } from '@angular/forms/signals';
//import { Product } from '../../core/models/product.model';

interface AddToCartFormModel {
    id: string;
    title: string;
    price: number;
    description: string;
    category: string;
    images: string[];
    quantity: number;
}

@Component({
    selector: 'app-add-to-cart',
    imports: [
        PrimeNgModule,
        FormsModule,
        ReactiveFormsModule,
        CurrencyPipe,
        FormField,
    ],
    templateUrl: './add-to-cart.html',
    styleUrl: './add-to-cart.scss',
})
export class AddToCart {



    protected readonly addToCartModel = signal<AddToCartFormModel>({
        id: '',
        title: '',
        price: 0,
        description: '',
        category: '',
        images: [],
        quantity: 1
    });

    protected readonly addToCartForm = form(this.addToCartModel, schemaPath => {
        required(schemaPath.id, { message: 'El ID del producto es obligatorio' });
        required(schemaPath.title, { message: 'El título del producto es obligatorio' });
        required(schemaPath.price, { message: 'El precio del producto es obligatorio' });
        required(schemaPath.description, { message: 'La descripción del producto es obligatoria' });
        required(schemaPath.category, { message: 'La categoría del producto es obligatoria' });
        required(schemaPath.images, { message: 'Las imágenes del producto son obligatorias' });
        min(schemaPath.quantity, 1, {
            message: 'La cantidad debe ser al menos 1',
        });
    });

    protected onSubmit(event: Event): void {
        event.preventDefault();
        // Aquí puedes agregar la lógica para agregar el producto al carrito
        console.log('Producto agregado al carrito:', this.addToCartModel);
    }
}
