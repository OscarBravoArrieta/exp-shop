import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PrimeNgModule } from '../../imports/primeng';

@Component({
    selector: 'app-left-panel',
    imports: [RouterLink, RouterLinkActive, PrimeNgModule],
    templateUrl: './left-panel.html',
    styleUrl: './left-panel.scss',
})
export class LeftPanel {}
