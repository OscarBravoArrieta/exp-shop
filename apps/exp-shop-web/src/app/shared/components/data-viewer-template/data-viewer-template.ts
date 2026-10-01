import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common'
import { PrimeNgModule } from '../../imports/primeng';
import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { ColDef, GridOptions } from 'ag-grid-community'; // Column Definition Type Interface
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { CsvExportModule } from 'ag-grid-community'; // Para la versión gratuita
import { GridReadyEvent, GridApi } from 'ag-grid-community';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EntityConfig } from '../../../core/models/entity-config.model';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog'

ModuleRegistry.registerModules([
    AllCommunityModule,
    CsvExportModule,
]);

@Component({
    selector: 'app-data-viewer-template',
    imports: [
        AgGridAngular, 
        PrimeNgModule,
        CommonModule
    ],    
    templateUrl: './data-viewer-template.html',
    styleUrl: './data-viewer-template.scss',
    providers: [
        ConfirmationService, 
        MessageService, 
        DialogService
    ]
})
export class DataViewerTemplate {

    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    private dialogService = inject(DialogService)

    ref: DynamicDialogRef | undefined = undefined;

    private gridApi!: GridApi;

    private baseDialog: DynamicDialogConfig = {
        width: '30vw',
        closeOnEscape: false,
        contentStyle: { overflow: 'auto' },
        closable: true,
        draggable: true,
        modal: true,
        breakpoints: {
            '960px': '75vw',
            '640px': '90vw'
       },
    }
  

    dataSet = input<any[]>([])
    config = input.required<EntityConfig>()
    columnDefs = input<any[]>([])
    currentRecordId = signal(String)

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

    gridOptions: GridOptions = {
        context: {
            componentParent: this // 'this' debe apuntar explícitamente a esta clase
        }
    };    

    setCurrentRecord(rowData: any, action: string){

        this.currentRecordId = rowData.id;
        this.confirm2();

        
    }

    callDialog(id: string, mode: string) {

        const config = this.config()

        this.ref = this.dialogService.open(config.form, {
            ...this.baseDialog,
            header: 'Gestionando ' + config.title,
             ...config.dialog,
            data: {
                id,
                mode
            },
        }) ?? undefined;
        this.ref?.onClose.subscribe((record: unknown) => {
            if (record) {
                //this.reload(config.savedMsg)
            }
        });

    }

    csvExport() {        
        this.gridApi.exportDataAsCsv({
            fileName: 'mi-reporte.csv',
            columnSeparator: ';',// Opcional: Cambia el separador por defecto si lo abres en Excel Latino           
        });
    }

    confirm1(event: Event) {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: 'Are you sure that you want to proceed?',
            header: 'Confirmation',
            closable: true,
            closeOnEscape: true,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptButtonProps: {
                label: 'Save'
            },
            accept: () => {
                this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted' });
            },
            reject: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Rejected',
                    detail: 'You have rejected',
                    life: 3000
                });
            }
        });
    }

    confirm2() {
        this.confirmationService.confirm({
            //target: event.target as EventTarget,
            message: `Do you want to delete this record: ${this.currentRecordId}?`,
            header: 'Danger Zone',
            icon: 'pi pi-info-circle',
            rejectLabel: 'Cancel',
            rejectButtonProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptButtonProps: {
                label: 'Delete',
                severity: 'danger'
            },
        
            accept: () => {
                this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Record deleted' });
            },
            reject: () => {
                this.messageService.add({ severity: 'error', summary: 'Rejected', detail: 'You have rejected' });
            }
        });
    }    



}
