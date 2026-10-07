import { Component, inject } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { Products } from '../../core/services/products';
import { rxResource } from '@angular/core/rxjs-interop';
import { Product } from '../../core/models/products.model';
import { ProductDetails } from '../product-details/product-details';
import { Loading } from '../../shared/components/loading/loading';


@Component({
    selector: 'app-dashboard',
    imports: [PrimeNgModule, ProductDetails, Loading],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export default class Dashboard {     
    protected readonly products = inject(Products);
    protected readonly productsResource = rxResource({
        stream: () => this.products.getProducts(),
        defaultValue: [] as Product[],
    });
}
