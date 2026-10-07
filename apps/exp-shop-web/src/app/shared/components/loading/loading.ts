import { Component } from '@angular/core';
import { PrimeNgModule } from '../../imports/primeng';

@Component({
    selector: 'app-loading',
    imports: [PrimeNgModule],
    templateUrl: './loading.html',
    styleUrl: './loading.scss',
})
export class Loading {}
