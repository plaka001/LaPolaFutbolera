import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PushService } from '../../core/push.service';

/** Perfil del usuario. Apodo/foto/push llegan en fases próximas. */
@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>Perfil</h1>
      </header>

      <main class="content">
        <div class="lp-card prof">
          <div class="pav">{{ auth.initials() }}</div>
          <div class="pinfo">
            <div class="pn">{{ auth.displayName() }}</div>
            <div class="pe">{{ auth.user()?.email }}</div>
          </div>
        </div>

        <button class="lp-btn lp-btn-ghost notif" (click)="enableNotifs()">
          <i class="ti ti-bell"></i> Activar notificaciones
        </button>
        @if (notifMsg()) { <p class="notifmsg" [class.ok]="notifOk()">{{ notifMsg() }}</p> }

        <button class="lp-btn lp-btn-ghost out" (click)="signOut()">
          <i class="ti ti-logout"></i> Cerrar sesión
        </button>

        <p class="hint">Apodo y foto llegan en próximas fases.</p>
      </main>
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; }
    .appbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; }
    .appbar h1 { font-size: 19px; font-weight: 700; margin: 0; }
    .back { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; }
    .back i { font-size: 22px; }
    .content { padding: 8px 14px 24px; }
    .prof { display: flex; align-items: center; gap: 14px; padding: 16px; }
    .pav {
      width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-background-info); color: var(--color-text-info);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-size: 17px; font-weight: 600;
    }
    .pinfo { min-width: 0; }
    .pn { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pe { font-size: 12.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif { width: 100%; margin-top: 14px; }
    .notifmsg { font-size: 12px; text-align: center; margin: 8px 0 0; color: var(--color-text-secondary); }
    .notifmsg.ok { color: var(--color-text-success); }
    .out { width: 100%; margin-top: 10px; color: var(--color-text-danger); }
    .hint { font-size: 12px; color: var(--color-text-tertiary); text-align: center; margin-top: 14px; }
  `,
})
export class Perfil {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly push = inject(PushService);

  readonly notifMsg = signal<string | null>(null);
  readonly notifOk = signal(false);

  async enableNotifs() {
    const r = await this.push.enable();
    this.notifOk.set(r.ok);
    this.notifMsg.set(r.ok ? '¡Listo! Vas a recibir notificaciones.' : (r.reason ?? 'No se pudo activar.'));
  }

  async signOut() {
    await this.auth.signOut();
    void this.router.navigateByUrl('/login');
  }
}
