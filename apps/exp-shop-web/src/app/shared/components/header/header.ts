import { Component, computed, inject } from '@angular/core';
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

    protected readonly isAdmin = computed(
        () => this.auth.currentUser()?.roles.includes('admin') ?? false
    );

    protected readonly userProfile = toSignal(
        this.auth.getProfile().pipe(
            tap(data => console.log('¿Llegan datos del perfil?:', data)),
        ), { initialValue: null }
    );


    protected readonly items: MenuItem[] = [
        {
            label: 'My Account',
        },

        { separator: true },
        {

            items: [
                {
                    label: 'Actualizar perfil',
                    icon: 'user-edit',
                    command: () => {
                        this.router.navigate(['/auth-profile']);
                    }

                },
                { 
                    label: 'Cerrar sesión',
                    icon: 'sign-out',
                    command: () => {
                        this.auth.logout();
                        this.router.navigate(['/auth-login']);
                    }  
                }
            ],
        },
    ];    
    
}
