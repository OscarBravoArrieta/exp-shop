import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Product } from '@exp-shop/shared/interfaces';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'exp-shop-web';
  protected products: Product[] = [];
}
