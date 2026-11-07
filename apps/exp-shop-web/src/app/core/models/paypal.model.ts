// Tipado mínimo del SDK de PayPal — solo lo que efectivamente se usa
// (Buttons/createOrder/onApprove/onError/render), no el SDK completo.

export interface PayPalOrderAmount {
    value: string;
}

export interface PayPalPurchaseUnit {
    amount: PayPalOrderAmount;
}

export interface PayPalCreateOrderActions {
    order: {
        create(options: { purchase_units: PayPalPurchaseUnit[] }): Promise<string>;
    };
}

export interface PayPalCaptureDetails {
    status: string;
}

export interface PayPalApproveActions {
    order: {
        capture(): Promise<PayPalCaptureDetails>;
    };
}

export interface PayPalButtonsConfig {
    createOrder: (data: unknown, actions: PayPalCreateOrderActions) => Promise<string>;
    onApprove: (data: unknown, actions: PayPalApproveActions) => Promise<void>;
    onError?: (error: unknown) => void;
}

export interface PayPalButtonsInstance {
    render(container: HTMLElement): void;
}

export interface PayPalNamespace {
    Buttons(config: PayPalButtonsConfig): PayPalButtonsInstance;
}

declare global {
    interface Window {
        paypal?: PayPalNamespace;
    }
}
