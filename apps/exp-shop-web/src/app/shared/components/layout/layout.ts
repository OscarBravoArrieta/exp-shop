import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { LeftPanel } from '../left-panel/left-panel';
import { Auth } from '../../../core/services/auth';

@Component({
    selector: 'app-layout',
    imports: [RouterOutlet, Footer, Header, LeftPanel],
    templateUrl: './layout.html',
    styleUrl: './layout.scss',
})
export class Layout {
    private readonly auth = inject(Auth);

    protected readonly loggedIn = this.auth.isAuthenticated;
}
