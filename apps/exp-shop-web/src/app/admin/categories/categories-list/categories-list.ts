import { Component } from '@angular/core';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';
//import { rxResource } from '@angular/core/rxjs-interop';
//import { Categories } from '../../../core/services/categories';
//import { Category } from '../../../core/models/category.model';
//import { DataSchema } from '../../../core/models/data-schema.model';

@Component({
    selector: 'app-categories-list',
    imports: [DataViewerTemplate],
    templateUrl: './categories-list.html',
    styleUrl: './categories-list.scss',
})
export default class CategoriesList {

    //protected readonly categotyService = inject(Categories)

}
