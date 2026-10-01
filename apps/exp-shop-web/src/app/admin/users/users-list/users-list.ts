import { Component, inject, signal } from '@angular/core';
import { PrimeNgModule } from '../../../shared/imports/primeng';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';
import { rxResource } from '@angular/core/rxjs-interop';
import { Users } from '../../../core/services/users'
import { User } from '../../../core/models/users.model';
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { ActionButtonsCell } from '../../../shared/components/action-buttons-cell/action-buttons-cell';
import { EntityConfig } from '../../../core/models/entity-config.model';
import { UsersForm } from '../users-form/users-form';

@Component({
    selector: 'app-users-list',
    imports: [DataViewerTemplate, PrimeNgModule],
    templateUrl: './users-list.html',
    styleUrl: './users-list.scss',
})
export default class UsersList  {

    protected readonly userService = inject(Users);
    protected readonly usersResource = rxResource({
        stream: () => this.userService.getUsers(),
        defaultValue: [] as User[]   
    });
  
    config: EntityConfig<User> = {
        title: 'USUARIOS',
        form: UsersForm,
        load: () => this.userService.getUsers(),
        savedMsg: 'Usuario guardado'
    }

    colDefs = signal<ColDef[]>([

        {
            field: 'fullName', 
            headerName: 'Usuario',
            editable: true
           
        },
        {
            field: 'roles', 
            headerName: 'Rol'
        },
        {
            field: 'email', 
            headerName: 'Correo electrónico'
        },

        {
            field: 'createdAt', 
            headerName: 'Fecha de',
            cellDataType: 'date',
            valueFormatter: params => {
            if (!params.value) return '';            
                const date = new Date(params.value);                
                const year = date.getFullYear();// Extrae año, mes y día de forma local para evitar errores de zona horaria
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');                
                return `${year}-${month}-${day}`;
            },
            
        },
        {
            headerName: 'Acciones',
            field: 'acciones',
            cellRenderer: ActionButtonsCell, // Asignamos el componente de PrimeNG
            sortable: false,
            filter: false,
            width: 150
        }
    
    ])

    deleteRow(id: number) {

        console.log(`Fila con ID ${id} removida exitosamente.`);
        
    }    
}
