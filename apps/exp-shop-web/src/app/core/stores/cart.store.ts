import { inject } from '@angular/core'
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals'
import { Product } from '../models/products.model'
import { LocalStorage } from '../services/local-storage'

const CART_LOCAL_STORAGE_KEY = 'exp-shop-cart'

export type CartItem = Product & {
    quantity: number
}

type CartState = {
    items: CartItem[]
}

const initialState: CartState = {
    items: []
}

export const cartStore = signalStore(
    {
        providedIn: 'root'
    },
    withState(() => {
        const storage = inject(LocalStorage)
        return {
            ...initialState,
            items: storage.getItem<CartItem[]>(CART_LOCAL_STORAGE_KEY) ?? initialState.items,
        }
    }),
    withComputed((store) => ({
        totalItems: () => store.items().reduce((acc, item) => { return acc + item.quantity }, 0),
        totalAmount: () => store.items().reduce((acc, item) => { return acc + (item.price * item.quantity) }, 0),
    })),
    withMethods((store) => {
        const storage = inject(LocalStorage)
        const persist = (items: CartItem[]) => storage.setItem(CART_LOCAL_STORAGE_KEY, items)

        return {
            addToCart(product: Product, quantity = 1) {
                const currentItems = store.items();
                const existingItemIndex = currentItems.findIndex(cartItem => cartItem.id === product.id)
                const updatedItems = existingItemIndex > -1
                    ? currentItems.map((cartItem) =>
                        cartItem.id === product.id
                            ? { ...cartItem, quantity: cartItem.quantity + quantity }
                            : cartItem
                    )
                    : [...currentItems, { ...product, quantity }]

                patchState(store, { items: updatedItems })
                persist(updatedItems)
            },
            updateQuantity(productId: string, quantity: number) {
                const updatedItems = store.items().map((item) => (
                    item.id === productId ? { ...item, quantity } : item
                ))

                patchState(store, { items: updatedItems })
                persist(updatedItems)
            },
            removeFromCart(productId: string) {
                const updatedItems = store.items().filter((item) => item.id !== productId)
                patchState(store, { items: updatedItems })
                persist(updatedItems)
            },
            clearCart() {
                patchState(store, { items: [] })
                storage.removeItem(CART_LOCAL_STORAGE_KEY)
            }
        }
    }),
    withHooks((store) => ({
        onInit() {
            if (typeof window === 'undefined') return

            window.addEventListener('storage', (event) => {
                if (event.key !== CART_LOCAL_STORAGE_KEY) return

                const items = event.newValue ? (JSON.parse(event.newValue) as CartItem[]) : []
                patchState(store, { items })
            })
        },
    }))
)
