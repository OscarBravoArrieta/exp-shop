import { Component, input } from '@angular/core';
import { PrimeNgModule } from '../../imports/primeng';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { CsvExportModule } from 'ag-grid-community'; // Para la versión gratuita
import { GridReadyEvent, GridApi } from 'ag-grid-community';


ModuleRegistry.registerModules([
    AllCommunityModule,
    CsvExportModule,
]);

@Component({
    selector: 'app-data-viewer-template',
    imports: [AgGridAngular, PrimeNgModule],
    templateUrl: './data-viewer-template.html',
    styleUrl: './data-viewer-template.scss',
})
export class DataViewerTemplate {

    private gridApi!: GridApi;
    

    dataSet = input<any[]>([])
    dataSource = input<string>('')
    columnDefs = input<any[]>([])

    defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
    };
    onGridReady(params: GridReadyEvent) {
        this.gridApi = params.api; // 👈 Guarda la API aquí
    }

    exportarA_CSV() {
        this.gridApi.exportDataAsCsv({
            fileName: 'mi-reporte.csv',
            columnSeparator: ';',// Opcional: Cambia el separador por defecto si lo abres en Excel Latino
           
        });
    }    


}
