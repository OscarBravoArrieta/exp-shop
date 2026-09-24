import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Pública, sin guard, mismo contenido para todos: segura de prerenderizar.
    path: 'auth-login',
    renderMode: RenderMode.Prerender,
  },
  {
    // Todo lo demás pasa por authGuard, que depende de localStorage — y
    // localStorage NO EXISTE en Node bajo ningún escenario, ni siquiera en
    // SSR "por request real": LocalStorage (ver local-storage.ts) chequea
    // isPlatformBrowser y devuelve null en el servidor sin importar qué
    // token tenga guardado el navegador real que hizo la petición. Con
    // RenderMode.Server, authGuard SIEMPRE veía "sin token" del lado del
    // servidor y redirigía a /auth-login — por eso F5 o abrir en otra
    // pestaña mandaba al login aunque hubiera una sesión válida en el
    // navegador: el HTML ya venía con esa redirección "horneada" desde el
    // servidor, y la hidratación solo continuaba desde ahí.
    //
    // RenderMode.Client evita el problema de raíz: el servidor devuelve un
    // shell vacío sin evaluar rutas/guards, y checkAuthStatus()/authGuard
    // corren únicamente en el navegador, donde sí existe el localStorage
    // real. auth-login sigue siendo la única ruta prerenderizable (no
    // depende de sesión).
    path: '**',
    renderMode: RenderMode.Client,
  },
];
