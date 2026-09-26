import { Component, inject, signal } from '@angular/core';
import { PrimeNgModule } from '../../../shared/imports/primeng';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';
import { rxResource } from '@angular/core/rxjs-interop';
import { Users } from '../../../core/services/users'
import { User } from '../../../core/models/users.model';
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface

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

    colDefs = signal<ColDef[]>([

        {
            field: 'fullName', 
            headerName: 'Name',
            editable: true
           
        },
        {
            field: 'roles', 
            headerName: 'Role'
        },
        {
            field: 'email', 
            headerName: 'Email'
        },
        {
            field: 'avatar', 
            headerName: 'Avatar'
        },
        {
            field: 'createdAt', 
            headerName: 'Creation Date',
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

    ])
}
