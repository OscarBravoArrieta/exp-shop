import { Component } from '@angular/core';
import { PrimeNgModule } from '../../imports/primeng';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    imports: [PrimeNgModule, RouterLink],
    templateUrl: './not-found.html',
    styleUrl: './not-found.scss',
})
export class NotFound {}
