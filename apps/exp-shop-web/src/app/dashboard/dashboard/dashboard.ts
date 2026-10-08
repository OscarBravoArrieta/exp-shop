import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
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
    private readonly route = inject(ActivatedRoute);
    protected readonly products = inject(Products);

    /**
     * `undefined` en '/dashboard' (todas las categorías); el id real en
     * '/category/:categoryId' — ver dashboard.routes.ts y left-panel.html.
     * `paramMap` (no `snapshot`) porque el router reutiliza esta misma
     * instancia del componente al navegar entre categorías.
     */
    protected readonly categoryId = toSignal(
        this.route.paramMap.pipe(map(params => params.get('categoryId') ?? undefined))
    );

    protected readonly productsResource = rxResource({
        stream: () => this.products.getProducts(this.categoryId()),
        defaultValue: [] as Product[],
    });
}
