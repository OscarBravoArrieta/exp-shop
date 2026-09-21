import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface


@Component({
    selector: 'app-products-list',
    imports: [AgGridAngular],
    templateUrl: './products-list.html',
    styleUrl: './products-list.scss',
})
export default class ProductsList {
    rowData = [
        { make: "Tesla", model: "Model Y", price: 64950, electric: true },
        { make: "Ford", model: "F-Series", price: 33850, electric: false },
        { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    ];

    // Column Definitions: Defines the columns to be displayed.
    colDefs: ColDef[] = [
        { field: "make" },
        { field: "model" },
        { field: "price" },
        { field: "electric" }
    ];

    
    defaultColDef: ColDef = {
        flex: 1,
    }
}
