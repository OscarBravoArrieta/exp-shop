import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PayPalNamespace } from '../models/paypal.model';

@Injectable({ providedIn: 'root' })
export class PaypalSdkLoader {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private loadPromise: Promise<PayPalNamespace> | null = null;

    load(clientId: string): Promise<PayPalNamespace> {
        if (!this.isBrowser) {
            return Promise.reject(new Error('El SDK de PayPal solo puede cargarse en el navegador.'));
        }

        if (window.paypal) {
            return Promise.resolve(window.paypal);
        }

        if (!this.loadPromise) {
            this.loadPromise = new Promise<PayPalNamespace>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
                script.onload = () => {
                    if (window.paypal) {
                        resolve(window.paypal);
                    } else {
                        reject(new Error('El SDK de PayPal no se inicializó correctamente.'));
                    }
                };
                script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal.'));
                document.head.appendChild(script);
            });
        }

        return this.loadPromise;
    }
}
