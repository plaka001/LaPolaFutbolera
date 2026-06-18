import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PushService } from '../../core/push.service';
import { SupabaseService } from '../../core/supabase.service';
import { Avatar } from '../../shared/avatar/avatar';

/** Perfil del usuario: foto, apodo y notificaciones. */
@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>Perfil</h1>
      </header>

      <main class="content">
        <div class="lp-card prof">
          <label class="pavwrap" [class.busy]="avatarBusy()">
            <app-avatar class="pav" [url]="auth.avatarUrl()" [name]="auth.displayName()" />
            <span class="cam"><i class="ti" [class.ti-camera]="!avatarBusy()" [class.ti-loader-2]="avatarBusy()" [class.spin]="avatarBusy()"></i></span>
            <input type="file" accept="image/*" hidden (change)="onAvatarFile($event)" />
          </label>
          <div class="pinfo">
            <div class="pn">{{ auth.displayName() }}</div>
            <div class="pe">{{ auth.user()?.email }}</div>
          </div>
        </div>
        @if (avatarMsg()) { <p class="okmsg avc">{{ avatarMsg() }}</p> }

        <div class="lp-card apodo">
          <label class="lp-label" for="nick">Tu apodo (lo ven en la polla)</label>
          <div class="apodo-row">
            <input id="nick" class="lp-input" maxlength="24" placeholder="ej. El Profeta"
                   [value]="nick()" (input)="nick.set($any($event.target).value)" />
            <button class="lp-btn lp-btn-primary" (click)="saveNick()" [disabled]="nickBusy()">
              @if (nickBusy()) { <i class="ti ti-loader-2 spin"></i> } @else { Guardar }
            </button>
          </div>
          @if (nickMsg()) { <p class="okmsg">{{ nickMsg() }}</p> }
        </div>

        <button class="lp-btn lp-btn-ghost notif" (click)="enableNotifs()">
          <i class="ti ti-bell"></i> Activar notificaciones
        </button>
        @if (notifMsg()) { <p class="notifmsg" [class.ok]="notifOk()">{{ notifMsg() }}</p> }

        <button class="lp-btn lp-btn-ghost out" (click)="signOut()">
          <i class="ti ti-logout"></i> Cerrar sesión
        </button>
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
    .pavwrap { position: relative; cursor: pointer; flex-shrink: 0; line-height: 0; }
    .pavwrap.busy { opacity: 0.6; }
    .pav { width: 56px; height: 56px; --av-fs: 18px; --av-bg: var(--color-background-info); --av-fg: var(--color-text-info); }
    .cam { position: absolute; right: -2px; bottom: -2px; width: 22px; height: 22px; border-radius: 50%; background: var(--color-brand); color: var(--color-brand-contrast); display: flex; align-items: center; justify-content: center; border: 2px solid var(--color-background-primary); }
    .cam i { font-size: 12px; }
    .avc { text-align: center; }
    .pinfo { min-width: 0; }
    .pn { font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pe { font-size: 12.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .apodo { padding: 14px; margin-top: 12px; }
    .apodo-row { display: flex; gap: 8px; }
    .apodo-row .lp-input { flex: 1; min-width: 0; }
    .apodo-row .lp-btn { flex: 0 0 auto; }
    .okmsg { font-size: 12px; color: var(--color-text-success); margin: 8px 0 0; }
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
  private readonly sb = inject(SupabaseService);

  readonly notifMsg = signal<string | null>(null);
  readonly notifOk = signal(false);
  readonly nick = signal('');
  readonly nickBusy = signal(false);
  readonly nickMsg = signal<string | null>(null);
  readonly avatarBusy = signal(false);
  readonly avatarMsg = signal<string | null>(null);

  constructor() {
    this.nick.set(this.auth.profile()?.nickname ?? '');
  }

  async saveNick() {
    const uid = this.auth.user()?.id;
    if (!uid) return;
    this.nickBusy.set(true);
    this.nickMsg.set(null);
    try {
      await this.sb.from('profiles').update({ nickname: this.nick().trim() || null }).eq('id', uid);
      await this.auth.loadProfile(uid);
      this.nickMsg.set('Apodo guardado.');
    } catch {
      this.nickMsg.set('No se pudo guardar.');
    } finally {
      this.nickBusy.set(false);
    }
  }

  async onAvatarFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarBusy.set(true);
    this.avatarMsg.set(null);
    try {
      await this.auth.uploadAvatar(file);
      this.avatarMsg.set('Foto actualizada.');
    } catch {
      this.avatarMsg.set('No se pudo subir la foto.');
    } finally {
      this.avatarBusy.set(false);
      input.value = '';
    }
  }

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
