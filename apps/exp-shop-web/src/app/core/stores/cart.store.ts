import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'
import { Product } from '../models/products.model'

const CART_LOCAL_STORAGE_KEY = 'pet-mart-cart'

type CartItem = Product & {
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
         if('localStorage' in globalThis) {
             return {
                 ...initialState,
                 items: JSON.parse(localStorage.getItem(CART_LOCAL_STORAGE_KEY) ?? '[]') as CartItem[],
             }
         }
         return initialState
     }),
     withComputed((store) => ({
         totalItems: () => store.items().reduce((acc, item) =>{ return acc + item.quantity}, 0),
         totalAmount: () => store.items().reduce((acc, item) => {return acc + (item.price * item.quantity)}, 0),
     })),
     withMethods((store) => ({
                 addToCart(product: Product, quantity = 1) {
             const currentItems = store.items();
             const existingItemIndex = currentItems.findIndex(cartItem => cartItem.id === product.id)
             if (existingItemIndex > -1) {
                 const updatedItems = store.items().map((cartItem) => {
                     if (cartItem.id === product.id) {
                         return { ...cartItem, quantity: cartItem.quantity + quantity }
                     }
                     return cartItem;
                 })
                 patchState(store, { items: updatedItems })
             } else {
                 patchState(store, {
                     items: [...currentItems, { ...product, quantity }]
                 })
             }

             localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(store.items()))

         },
         updateQuantity(productId: number, quantity: number) {
             const updatedItems = store.items().map((item) => (
                    item.id === productId ? { ...item, quantity } : item
             ))

             patchState(store, { items: updatedItems })
             localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(updatedItems))
         },
         removeFormCart(productId: number) {
             const updatedItems = store.items().filter((item) => item.id !== productId)
             patchState(store, { items: updatedItems })
             localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(updatedItems))
         },
         clearCart() {
             patchState(store, { items: [] })
             localStorage.removeItem(CART_LOCAL_STORAGE_KEY)
         }
     }))
 )