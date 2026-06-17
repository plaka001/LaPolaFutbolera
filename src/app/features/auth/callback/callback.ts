import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

/**
 * Destino del redirect de OAuth / enlace mágico. El cliente de Supabase
 * (detectSessionInUrl) canjea el código y dispara la sesión; acá esperamos
 * y enrutamos.
 */
@Component({
  selector: 'app-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cb">
      <i class="ti ti-loader-2 spin"></i>
      <p>Entrando…</p>
    </div>
  `,
  styles: `
    .cb {
      height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--color-text-secondary);
    }
    .cb i { font-size: 34px; color: var(--color-text-success); }
    .spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class Callback {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private navigated = false;

  constructor() {
    // Cuando la sesión queda lista, al home.
    effect(() => {
      if (this.auth.isAuthenticated() && !this.navigated) {
        this.navigated = true;
        void this.router.navigateByUrl('/pollas');
      }
    });

    // Fallback: si tras resolver no hubo sesión, volver al login.
    void this.auth.whenReady().then(() => {
      setTimeout(() => {
        if (!this.navigated && !this.auth.isAuthenticated()) {
          void this.router.navigateByUrl('/login');
        }
      }, 2500);
    });
  }
}
