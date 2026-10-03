import { Component, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { PrimeNgModule } from '../../../shared/imports/primeng';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';
import { rxResource } from '@angular/core/rxjs-interop';
import { Products } from '../../../core/services/products';
import { Product } from '../../../core/models/products.model';
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { ActionButtonsCell } from '../../../shared/components/action-buttons-cell/action-buttons-cell';
import { EntityConfig } from '../../../core/models/entity-config.model';
import { ProductsForm } from '../products-form/products-form';

@Component({
    selector: 'app-products-list',
    imports: [DataViewerTemplate, PrimeNgModule],
    templateUrl: './products-list.html',
    styleUrl: './products-list.scss',
})
export default class ProductsList {
    protected readonly productsService = inject(Products);
    protected readonly productsResource = rxResource({
        stream: () => this.productsService.getProducts(),
        defaultValue: [] as Product[],
    });

    config: EntityConfig<Product> = {
        title: 'PRODUCTOS',
        form: ProductsForm,
        load: () => this.productsService.getProducts(),
        // Baja lógica (softDeleteProduct marca isActive en false, no borra el registro).
        remove: product => this.productsService.softDeleteProduct(product.id).pipe(map(() => true)),
        describe: product => `al producto "${product.title}"`,
        savedMsg: 'Producto guardado',
    };

    colDefs = signal<ColDef[]>([
        {
            field: 'title',
            headerName: 'Título',
            editable: false,
        },
        {
            field: 'price',
            headerName: 'Precio',
            valueFormatter: params =>
                params.value != null ? `${Number(params.value).toFixed(2)}` : '',
            editable: false,
        },
        {
            field: 'quantity',
            headerName: 'Cantidad',
            editable: false,
        },
        {
            field: 'createdAt',
            headerName: 'Fecha de creación',
            cellDataType: 'date',
            valueFormatter: params => {
                if (!params.value) return '';
                const date = new Date(params.value);
                const year = date.getFullYear(); // Extrae año, mes y día de forma local para evitar errores de zona horaria
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            },
            editable: false,
        },
        {
            headerName: 'Acciones',
            field: 'acciones',
            cellRenderer: ActionButtonsCell,
            sortable: false,
            filter: false,
            width: 150,
        },
    ]);
}
