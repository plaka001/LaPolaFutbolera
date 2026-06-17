import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback/callback').then((m) => m.Callback),
  },

  // Zona autenticada: shell global con nav inferior persistente.
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pollas' },
      {
        path: 'pollas',
        loadComponent: () => import('./features/pollas/mis-pollas/mis-pollas').then((m) => m.MisPollas),
      },
      {
        path: 'pollas/crear',
        loadComponent: () => import('./features/pollas/crear-polla/crear-polla').then((m) => m.CrearPolla),
      },
      {
        path: 'unirse/:code',
        loadComponent: () => import('./features/pollas/unirse/unirse').then((m) => m.Unirse),
      },
      {
        path: 'polla/:id',
        loadComponent: () => import('./features/pollas/polla-detail/polla-detail').then((m) => m.PollaDetail),
      },
      {
        path: 'partidos',
        loadComponent: () => import('./features/partidos/partidos').then((m) => m.Partidos),
      },
      {
        path: 'tabla',
        loadComponent: () => import('./features/tabla/tabla').then((m) => m.Tabla),
      },
      {
        path: 'pozo',
        loadComponent: () => import('./features/pozo/pozo').then((m) => m.Pozo),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
