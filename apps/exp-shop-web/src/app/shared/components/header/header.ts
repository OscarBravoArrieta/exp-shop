import { Component, inject, OnInit } from '@angular/core';
import { PrimeNgModule } from '../../imports/primeng';
import { ImageModule } from 'primeng/image';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
    selector: 'app-header',
    imports: [PrimeNgModule, ImageModule],
    templateUrl: './header.html',
    styleUrl: './header.scss',
})
export class Header implements OnInit {
     readonly router = inject(Router);
     items: MenuItem[] | undefined;
     
     ngOnInit() {

         //console.log(this.userProfile());
        this.items = [
            {
                label: 'My Account',
                items: [
                    { label: 'Actualizar perfil' },
                    { label: 'Billing' },
                    { label: 'Settings' },
                ],
            },
            { separator: true },
            {
                label: 'Notifications',
                items: [{ label: 'Enable notifications' }, { label: 'Play sound' }],
            },
            { separator: true },
            {
                label: 'Appearance',
                items: [{ label: 'Light' }, { label: 'Dark' }, { label: 'System' }],
            },
        ];
    }

    callLogin() {
       // this.router.navigate(['/login']);
       console.log('callLogin');
    }
}
