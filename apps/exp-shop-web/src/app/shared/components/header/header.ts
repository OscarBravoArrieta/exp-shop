import { Component, inject } from '@angular/core';
import { PrimeNgModule } from '../../imports/primeng';
import { ImageModule } from 'primeng/image';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';



@Component({
    selector: 'app-header',
    imports: [PrimeNgModule, ImageModule],
    templateUrl: './header.html',
    styleUrl: './header.scss',
})
export class Header  {
    readonly router = inject(Router);
    private readonly auth = inject(Auth);

    protected readonly userProfile = toSignal(
        this.auth.getProfile().pipe(
            tap(data => console.log('¿Llegan datos del perfil?:', data)),
        ), { initialValue: null }
    );
    //const perfilLabel = user ? `Actualizar perfil de ${user.fullName}` : 'Actualizar perfil';

    protected readonly items: MenuItem[] = [
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
            items: [{ label: 'Cerrar sesión' }],
        },
    ];    
    
}
