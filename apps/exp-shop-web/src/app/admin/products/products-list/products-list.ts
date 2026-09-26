import { Component } from '@angular/core';
import { DataViewerTemplate } from '../../../shared/components/data-viewer-template/data-viewer-template';

@Component({
    selector: 'app-products-list',
    imports: [DataViewerTemplate],
    templateUrl: './products-list.html',
    styleUrl: './products-list.scss',
})
export default class ProductsList {

}
