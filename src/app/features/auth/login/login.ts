import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth.service';

/** Login / onboarding: Google o enlace mágico por email. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <div class="hero">
        <span class="logo"><i class="ti ti-ball-football"></i></span>
        <h1>La Pola Futbolera</h1>
        <p class="tag">Pronosticá con tus amigos. El que sabe, sabe. ⚽</p>
      </div>

      <div class="card">
        @if (sent()) {
          <div class="sent">
            <i class="ti ti-mail-check"></i>
            <p>Te enviamos un enlace a <b>{{ email() }}</b>. Abrilo en este dispositivo para entrar.</p>
            <button class="btn-ghost" type="button" (click)="reset()">Usar otro correo</button>
          </div>
        } @else {
          <button class="btn-google" type="button" (click)="google()" [disabled]="busy()">
            <i class="ti ti-brand-google"></i> Entrar con Google
          </button>

          <div class="divider"><span>o con tu correo</span></div>

          <form (submit)="sendLink($event)">
            <input
              class="inp"
              type="email"
              name="email"
              placeholder="tu@correo.com"
              autocomplete="email"
              inputmode="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              required
            />
            <button class="btn-primary" type="submit" [disabled]="busy() || !email()">
              @if (busy()) {
                <i class="ti ti-loader-2 spin"></i> Enviando…
              } @else {
                <i class="ti ti-send"></i> Enviar enlace mágico
              }
            </button>
          </form>

          @if (error()) {
            <p class="err"><i class="ti ti-alert-triangle"></i> {{ error() }}</p>
          }
        }
      </div>

      <p class="legal"><i class="ti ti-lock"></i> Privada, solo por invitación.</p>
    </div>
  `,
  styles: `
    .login {
      height: 100dvh;
      overflow-y: auto;
      max-width: 480px;
      margin: 0 auto;
      padding: 24px 22px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 22px;
    }
    .hero { text-align: center; }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--color-background-success);
      color: var(--color-text-success);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .logo i { font-size: 36px; }
    h1 { margin: 0; font-size: 28px; font-weight: 600; color: var(--color-text-primary); }
    .tag { margin: 6px 0 0; font-size: 14px; color: var(--color-text-secondary); }
    .card {
      background: var(--color-background-primary);
      border: 0.5px solid var(--color-border-tertiary);
      border-radius: var(--border-radius-xl);
      padding: 18px;
    }
    button { font-family: inherit; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: default; }
    .btn-google,
    .btn-primary,
    .btn-ghost {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: var(--border-radius-md);
      padding: 12px;
      font-size: 14.5px;
      font-weight: 500;
    }
    .btn-google {
      background: var(--color-background-primary);
      border: 0.5px solid var(--color-border-secondary);
      color: var(--color-text-primary);
    }
    .btn-google i { font-size: 18px; color: var(--color-text-info); }
    .divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 14px 0;
      color: var(--color-text-tertiary);
      font-size: 12px;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 0.5px;
      background: var(--color-border-tertiary);
    }
    .inp {
      width: 100%;
      box-sizing: border-box;
      border: 0.5px solid var(--color-border-secondary);
      border-radius: var(--border-radius-md);
      padding: 11px;
      font-size: 14px;
      font-family: inherit;
      color: var(--color-text-primary);
      background: var(--color-background-primary);
      outline: none;
      margin-bottom: 10px;
    }
    .inp:focus { border-color: var(--color-border-success); }
    .btn-primary {
      border: none;
      background: var(--color-brand);
      color: var(--color-brand-contrast);
    }
    .btn-ghost {
      border: 0.5px solid var(--color-border-tertiary);
      background: transparent;
      color: var(--color-text-secondary);
      margin-top: 12px;
    }
    .sent { text-align: center; color: var(--color-text-secondary); font-size: 14px; }
    .sent i { font-size: 34px; color: var(--color-text-success); }
    .sent p { margin: 10px 0 0; }
    .err {
      margin: 12px 0 0;
      font-size: 12.5px;
      color: var(--color-text-danger);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legal {
      text-align: center;
      font-size: 12px;
      color: var(--color-text-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  async google() {
    this.busy.set(true);
    this.error.set(null);
    const { error } = await this.auth.signInWithGoogle();
    if (error) {
      this.error.set(error.message);
      this.busy.set(false);
    }
    // Si todo va bien, el navegador redirige a Google.
  }

  async sendLink(event: Event) {
    event.preventDefault();
    const email = this.email().trim();
    if (!email) return;
    this.busy.set(true);
    this.error.set(null);
    const { error } = await this.auth.signInWithEmail(email);
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
    } else {
      this.sent.set(true);
    }
  }

  reset() {
    this.sent.set(false);
    this.error.set(null);
  }
}
