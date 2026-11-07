import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimeNgModule } from '../../imports/primeng';
import { cartStore, CartItem } from '../../../core/stores/cart.store';
import { PaypalSdkLoader } from '../../../core/services/paypal-sdk-loader';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-cart',
    imports: [PrimeNgModule, CurrencyPipe],
    providers: [MessageService, ConfirmationService],
    templateUrl: './cart.html',
    styleUrl: './cart.scss',
})
export default class Cart {
    private readonly router = inject(Router);
    private readonly cartStore = inject(cartStore);
    private readonly paypalSdkLoader = inject(PaypalSdkLoader);
    protected readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    protected readonly items = this.cartStore.items;
    protected readonly totalAmount = this.cartStore.totalAmount;

    protected readonly checkoutStarted = signal(false);
    protected readonly paypalContainer = viewChild<ElementRef<HTMLDivElement>>('paypalContainer');
    private paypalButtonsRendered = false;

    protected readonly summaryLabel = computed(() => {
        const units = this.cartStore.totalItems();
        const products = this.items().length;
        return `${units} artículo${units === 1 ? '' : 's'} · ${products} producto${products === 1 ? '' : 's'}`;
    });

    constructor() {
        effect(() => {
            const container = this.paypalContainer();
            if (!this.checkoutStarted() || !container || this.paypalButtonsRendered) return;

            this.paypalButtonsRendered = true;
            this.paypalSdkLoader
                .load(environment.clientId)
                .then((paypal) => {
                    paypal
                        .Buttons({
                            createOrder: (_data, actions) =>
                                actions.order.create({
                                    purchase_units: [{ amount: { value: this.totalAmount().toFixed(2) } }],
                                }),
                            onApprove: (_data, actions) =>
                                actions.order.capture().then((details) => {
                                    console.log('PayPal capture response:', details);
                                    if (details?.status !== 'COMPLETED') {
                                        this.messageService.add({
                                            severity: 'warn',
                                            summary: 'Pago en revisión',
                                            detail: `PayPal devolvió el estado "${details?.status}" en vez de completar el pago. No se vació el carrito.`,
                                        });
                                        return;
                                    }

                                    this.cartStore.clearCart();
                                    this.messageService.add({
                                        severity: 'success',
                                        summary: 'Listo',
                                        detail: 'Pago completado, gracias por tu compra.',
                                    });
                                    this.router.navigate(['/dashboard']);
                                }),
                            onError: (error) => {
                                console.error('PayPal onError:', error);
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail: 'No se pudo procesar el pago con PayPal.',
                                });
                                this.paypalButtonsRendered = false;
                                this.checkoutStarted.set(false);
                            },
                        })
                        .render(container.nativeElement);
                })
                .catch(() => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo cargar PayPal.',
                    });
                    this.paypalButtonsRendered = false;
                    this.checkoutStarted.set(false);
                });
        });
    }

    protected onQuantityChange(productId: string, value: string): void {
        const quantity = Math.max(1, Math.min(99, parseInt(value, 10) || 1));
        this.cartStore.updateQuantity(productId, quantity);
    }

    protected onRemove(item: CartItem): void {
        this.confirmationService.confirm({
            message: `¿Deseas eliminar "${item.title}" del carrito?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            closable: true,
            closeOnEscape: true,
            rejectButtonProps: {
                label: 'Cancelar',
                severity: 'secondary',
                outlined: true,
            },
            acceptButtonProps: {
                label: 'Eliminar',
                severity: 'danger',
            },
            accept: () => {
                this.cartStore.removeFromCart(item.id);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Listo',
                    detail: 'Se eliminó el producto.',
                });
            },
        });
    }

    protected goToCatalog(): void {
        this.router.navigate(['/dashboard']);
    }

    protected onCheckout(): void {
        this.checkoutStarted.set(true);
    }

    protected cancelCheckout(): void {
        this.checkoutStarted.set(false);
    }
}
