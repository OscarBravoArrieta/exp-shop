import { Component, input } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { Product } from '../../core/models/products.model';

@Component({
    selector: 'app-product-details',
    imports: [PrimeNgModule],
    templateUrl: './product-details.html',
    styleUrl: './product-details.scss',
})
export class ProductDetails {
    product = input<Product>()
}
