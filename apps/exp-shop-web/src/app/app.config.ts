import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
        providePrimeNG({
            theme: {
                preset: Aura,
                options: {
                    prefix: 'p',
                    darkModeSelector: 'none',
                    cssLayer: false,
                    cssVariables: true,
                },
            },
            license:
                'eyJpZCI6ImIwYjIwNDQ1LTlmODctNDJkMS04MjgzLTEwMmViOWQ3ZjVlMSIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODc1MjkxNzcsImV4cCI6MTgxOTA2NTE3N30.jKu-Gt7tFQEoT3qSPvxrI_tR0Xg8GbM_LjF7I6Gd7OXTWNKzPnLT8XHCndWwI3nDypOWaiB-qAN7DWo1t3FtBw',
        }),    
  ],
};
