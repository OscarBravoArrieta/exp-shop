import { Component, inject, input, OnDestroy } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { Product } from '../../core/models/products.model';
import { CurrencyPipe } from '@angular/common';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddToCart } from '../add-to-cart/add-to-cart';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-product-details',
    imports: [PrimeNgModule, CurrencyPipe],
    providers: [
        DialogService,
        MessageService   
    ],
    templateUrl: './product-details.html',
    styleUrl: './product-details.scss',
})
export class ProductDetails implements OnDestroy {
    private dialogService = inject(DialogService);
    readonly messageService = inject(MessageService)
    product = input<Product>()

    ref: DynamicDialogRef | undefined = undefined;

    addToCart() {
        this.ref = this.dialogService.open(AddToCart, {
            header: 'Agregar Producto',
            data: {
                product: this.product()?.id,
            },
                         width: '50%',
             height: '80%',
             modal:true,
             closable: true,
             draggable: true,
             contentStyle: {"max-height": "500px", "min-height": "500px", "overflow": "auto"},
             breakpoints: {
                 '960px': '75vw',
                 '640px': '90vw'
             },
        }) ?? undefined;
        this.ref?.onClose.subscribe((product: Product) => {
             if (product) {
                 this.messageService.add({
                     severity: 'success',
                     summary: 'Producto agregado',
                     detail: ''
                 })
             }
        })
    }


    ngOnDestroy() {

         if (this.ref) {
             this.ref.close()
         }
     }




}
