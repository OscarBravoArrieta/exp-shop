import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PrimeNgModule } from '../../imports/primeng';
import { Auth } from '../../../core/services/auth';
import { Categories } from '../../../core/services/categories';
import { rxResource } from '@angular/core/rxjs-interop';
import { Category } from '../../../core/models/category.model';

@Component({
    selector: 'app-left-panel',
    imports: [RouterLink, RouterLinkActive, PrimeNgModule],
    templateUrl: './left-panel.html',
    styleUrl: './left-panel.scss',
})
export class LeftPanel {
    private readonly auth = inject(Auth);
    private readonly categories = inject(Categories);

    /** Admin ve el panel de administración; cualquier otro usuario ve categorías. */
    protected readonly isAdmin = computed(
        () => this.auth.currentUser()?.roles.includes('admin') ?? false
    );

    protected readonly categoriesResource = rxResource({
        stream: () => this.categories.getCategories(),
        defaultValue: [] as Category[],
    });
}
