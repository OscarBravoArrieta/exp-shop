import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { LeftPanel } from '../left-panel/left-panel';


@Component({
    selector: 'app-layout',
    imports: [RouterOutlet, Footer, Header, LeftPanel],
    templateUrl: './layout.html',
    styleUrl: './layout.scss',
})
export class Layout {
    
    loggedIn = signal<boolean>(true);

}
