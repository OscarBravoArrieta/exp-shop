import { Component } from '@angular/core';
import { PrimeNgModule } from '../../shared/imports/primeng';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';

@Component({
    selector: 'app-add-to-cart',
    imports: [
        PrimeNgModule,
        FormsModule,
        ReactiveFormsModule,
        CurrencyPipe
    ],
    templateUrl: './add-to-cart.html',
    styleUrl: './add-to-cart.scss',
})
export class AddToCart {}
