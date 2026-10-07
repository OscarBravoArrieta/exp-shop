import { Component, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { PrimeNgModule } from '../../../shared/imports/primeng';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';
import { rxResource } from '@angular/core/rxjs-interop';
import { Categories } from '../../../core/services/categories';
import { Category } from '../../../core/models/category.model';
import type { ColDef } from 'ag-grid-community'; // Column Definition Type Interface
import { ActionButtonsCell } from '../../../shared/components/action-buttons-cell/action-buttons-cell';
import { EntityConfig } from '../../../core/models/entity-config.model';
import { CategoriesForm } from '../categories-form/categories-form';
import { Loading } from '../../../../app/shared/components/loading/loading';

@Component({
    selector: 'app-categories-list',
    imports: [DataViewerTemplate, PrimeNgModule, Loading],
    templateUrl: './categories-list.html',
    styleUrl: './categories-list.scss',
})
export default class CategoriesList {
    protected readonly categoriesService = inject(Categories);
    protected readonly categoriesResource = rxResource({
        stream: () => this.categoriesService.getCategories(),
        defaultValue: [] as Category[],
    });

    config: EntityConfig<Category> = {
        title: 'CATEGORÍAS',
        form: CategoriesForm,
        load: () => this.categoriesService.getCategories(),
        // Baja lógica (softDeleteCategory marca isActive en false, no borra el registro).
        remove: category => this.categoriesService.softDeleteCategory(category.id).pipe(map(() => true)),
        describe: category => `la categoría "${category.name}"`,
        savedMsg: 'Categoría guardada',
    };

    colDefs = signal<ColDef[]>([
        {
            field: 'name',
            headerName: 'Nombre',
            editable: false,
        },
        {
            field: 'slug',
            headerName: 'Slug',
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
