import { Component, inject, OnInit, signal } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { form, FormField, min, required } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog'
import { Product } from '../../core/models/products.model';
import { cartStore } from '../../core/stores/cart.store';

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
export class AddToCart implements OnInit {

    private dynamicDialogConfig = inject (DynamicDialogConfig)
    private ref = inject (DynamicDialogRef)
    private readonly cartStore = inject(cartStore)
    private readonly product = signal<Product | null>(null)

    protected readonly addToCartModel = signal<AddToCartFormModel>({
        id: '',
        title: '',
        price: 0,
        description: '',
        category: '',
        images: [],
        quantity: 1
    });

    

  
    ngOnInit() {
        if (this.dynamicDialogConfig.data && this.dynamicDialogConfig.data.product) {
            const product = this.dynamicDialogConfig.data;
            console.log('Producto recibido en AddToCart:', product.product.id);
            this.product.set(product.product);
            this.addToCartModel.set({
                id: product.product.id,
                title: product.product.title,
                price: product.product.price,
                description: product.product.description,
                category: product.product.category,
                images: product.product.images,
                quantity: 1
            });

            console.log('Imagenes:', this.addToCartModel().images);            
        }
    }



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
        const product = this.product();
        if (!product) return;

        this.cartStore.addToCart(product, this.addToCartModel().quantity);
        this.ref.close(this.addToCartModel());
    }

    closeDialog(){
        this.ref.close();
    }

}
