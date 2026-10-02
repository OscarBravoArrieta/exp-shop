import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../imports/primeng';

import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import { GridReadyEvent, GridApi } from 'ag-grid-community';
import type { ColDef, GridOptions } from 'ag-grid-community'; // Column Definition Type Interface
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { CsvExportModule } from 'ag-grid-community'; // Para la versión gratuita

import { MessageService, ConfirmationService } from 'primeng/api';
import { EntityConfig } from '../../../core/models/entity-config.model';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule]);

@Component({
    selector: 'app-data-viewer-template',
    imports: [AgGridAngular, PrimeNgModule, CommonModule],
    templateUrl: './data-viewer-template.html',
    styleUrl: './data-viewer-template.scss',
    providers: [ConfirmationService, MessageService, DialogService],
})
export class DataViewerTemplate {
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    private dialogService = inject(DialogService);

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
            '640px': '90vw',
        },
    };

    dataSet = input<any[]>([]);
    config = input.required<EntityConfig>();
    columnDefs = input<any[]>([]);
    currentRecord = signal<any>(null);

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
            componentParent: this, // 'this' debe apuntar explícitamente a esta clase
        },
    };

    /**
     * Despachador de las acciones de fila que dispara ActionButtonsCell:
     * SHOW/EDIT abren el formulario (como diálogo) en modo lectura/edición;
     * DELETE dispara la confirmación de baja lógica (ver confirmDelete()).
     * Antes, cualquier acción llamaba siempre a una confirmación de borrado
     * que además no borraba nada de verdad — quedaba como demo.
     */
    setCurrentRecord(rowData: any, action: string): void {
        this.currentRecord.set(rowData);

        switch (action) {
            case 'EDIT':
                this.callDialog(rowData.id, 'edit');
                break;
            case 'SHOW':
                this.callDialog(rowData.id, 'view');
                break;
            case 'DELETE':
                this.confirmDelete(rowData);
                break;
        }
    }

    callDialog(id: string, mode: string) {
        const config = this.config();

        this.ref =
            this.dialogService.open(config.form, {
                ...this.baseDialog,
                header: 'Gestionando ' + config.title,
                ...config.dialog,
                data: {
                    id,
                    mode,
                },
            }) ?? undefined;
        this.ref?.onClose.subscribe((record: unknown) => {
            if (record) {
                this.reload(config.savedMsg);
            }
        });
    }

    csvExport() {
        this.gridApi.exportDataAsCsv({
            fileName: 'mi-reporte.csv',
            columnSeparator: ';', // Opcional: Cambia el separador por defecto si lo abres en Excel Latino
        });
    }

    /**
     * Pide confirmación y, si se acepta, llama a `config().remove()` (baja
     * lógica en el backend, p.ej. Users.softDeleteUser) y refresca la grilla.
     * Si el config no define `remove`, no hace nada — ver el comentario de
     * `EntityConfig.remove` (el botón de eliminar queda sin efecto en vez de
     * romper).
     */
    private confirmDelete(rowData: any): void {
        const config = this.config();
        const remove = config.remove;
        if (!remove) return;

        this.confirmationService.confirm({
            message: config.describe
                ? `¿Deseas eliminar ${config.describe(rowData)}?`
                : '¿Deseas eliminar este registro?',
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            closable: true,
            closeOnEscape: true,
            rejectButtonProps: {
                label: 'Cancelar',
                severity: 'secondary',
                outlined: true,
            },
            acceptButtonProps: {
                label: 'Eliminar',
                severity: 'danger',
            },
            accept: () => {
                remove(rowData).subscribe({
                    next: () => this.reload('Registro eliminado'),
                    error: () => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'No se pudo eliminar el registro',
                        });
                    },
                });
            },
        });
    }

    /**
     * Vuelve a pedir los datos con `config().load()` y refresca la grilla ya
     * renderizada vía la API de ag-Grid directamente — `dataSet` es un
     * `input()`, así que este componente no puede reasignarlo; actualizar
     * `rowData` por la API es el mismo patrón que ya usa `csvExport()`.
     */
    private reload(message: string): void {
        this.config()
            .load()
            .subscribe(data => {
                this.gridApi?.setGridOption('rowData', data);
                this.messageService.add({ severity: 'success', summary: 'Listo', detail: message });
            });
    }
}
