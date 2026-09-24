import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Wrapper de `localStorage` seguro para SSR. La app tiene hidratación/SSR
 * activa (ver apps/exp-shop-web/src/server.ts) y `localStorage` no existe en
 * Node — cada método chequea `isBrowser` antes de tocarlo, no solo `getItem`
 * como en la versión de referencia (ahí `setItem`/`removeItem`/`clearAllStorage`
 * no tenían el guard y habrían roto el render del servidor).
 */
@Injectable({ providedIn: 'root' })
export class LocalStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  setItem(key: string, value: unknown): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error guardando en localStorage la clave "${key}"`, error);
    }
  }

  getItem<T>(key: string): T | null {
    if (!this.isBrowser) return null;

    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      console.error(`Error leyendo de localStorage la clave "${key}"`, error);
      return null;
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error eliminando de localStorage la clave "${key}"`, error);
    }
  }

  clearAllStorage(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error limpiando localStorage', error);
    }
  }
}
