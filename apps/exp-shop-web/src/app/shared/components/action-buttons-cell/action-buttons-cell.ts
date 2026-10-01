import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { PrimeNgModule } from '../../imports/primeng';

@Component({
    selector: 'app-action-buttons-cell',
    imports: [PrimeNgModule],
    templateUrl: './action-buttons-cell.html',
    styleUrl: './action-buttons-cell.scss',
})
export class ActionButtonsCell implements ICellRendererAngularComp {

    private params!: ICellRendererParams;

    // Se ejecuta al inicializar la celda de ag-Grid
    agInit(params: ICellRendererParams): void {
        this.params = params;
    }

    // Permite refrescar la celda si los datos cambian sin re-renderizar todo
    refresh(params: ICellRendererParams): boolean {
        this.params = params;
        return true;
    }

    get rowName(): string {
        return this.params?.data?.fullName || 'Usuario';
    }

    onClick(event: MouseEvent, action: string): void {
        
        const rowData = this.params.data;
        
        //alert(`Acción ejecutada para: ${rowData.nombre} (ID: ${rowData.id})`);
        
        // Si necesitas llamar a una función del componente principal:
        if (this.params.context?.componentParent?.setCurrentRecord) {
            this.params.context.componentParent.setCurrentRecord(rowData, action);
        }
    }
}
