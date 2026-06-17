import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { PollaService, PollaCard } from '../../../core/polla.service';
import { PollaContextService } from '../../../core/polla-context.service';

/** Home: las pollas del usuario + accesos a crear y unirse. */
@Component({
  selector: 'app-mis-pollas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <div class="brand">
          <span class="logo"><i class="ti ti-ball-football"></i></span>
          <span class="word">La Pola Futbolera</span>
        </div>
        <a class="avatar" routerLink="/perfil" aria-label="Mi perfil">{{ auth.initials() }}</a>
      </header>

      <main class="content">
        <h1 class="h1">Mis pollas</h1>

        @if (loading()) {
          <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando tus pollas…</div>
        } @else if (error()) {
          <div class="state err">
            <i class="ti ti-alert-triangle"></i> {{ error() }}
            <button class="lp-btn lp-btn-ghost" (click)="load()">Reintentar</button>
          </div>
        } @else if (list().length === 0) {
          <div class="empty lp-card pitch-bg">
            <span class="ball"><i class="ti ti-ball-football"></i></span>
            <p class="t">Todavía no estás en ninguna polla</p>
            <p class="s">Creá una para tu grupo o entrá con el código que te pasaron.</p>
          </div>
        } @else {
          <div class="grid">
            @for (p of list(); track p.id) {
              <button class="pcard lp-card" type="button" (click)="open(p)">
                <span class="crest">
                  @if (p.competition?.logo_url) {
                    <img [src]="p.competition!.logo_url!" [alt]="p.competition!.name" loading="lazy" />
                  } @else {
                    <i class="ti ti-trophy"></i>
                  }
                </span>
                <span class="info">
                  <span class="nm">{{ p.name }}</span>
                  <span class="meta">
                    {{ p.competition?.name ?? 'Sin competición' }} · {{ membersCount(p) }} {{ membersCount(p) === 1 ? 'jugador' : 'jugadores' }}
                  </span>
                  <span class="tags">
                    <span class="lp-pill" [class.warn]="p.prize_type === 'pozo'" [class.info]="p.prize_type === 'fijo'" [class.neutral]="p.prize_type === 'sin'">
                      <i class="ti" [class.ti-coin]="p.prize_type !== 'sin'" [class.ti-mood-smile]="p.prize_type === 'sin'"></i>
                      {{ prizeLabel(p) }}
                    </span>
                    @if (isAdmin(p)) {
                      <span class="lp-pill ok"><i class="ti ti-shield-check"></i> Admin</span>
                    }
                  </span>
                </span>
                <i class="ti ti-chevron-right chev"></i>
              </button>
            }
          </div>
        }

        <button class="lp-btn lp-btn-primary create" routerLink="/pollas/crear">
          <i class="ti ti-plus"></i> Crear una polla
        </button>

        <div class="join lp-card">
          <label class="lp-label" for="code">¿Te invitaron? Entrá con el código</label>
          <div class="join-row">
            <input
              id="code"
              class="lp-input mono"
              placeholder="ej. a1b2c3d4e5"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              [value]="joinCode()"
              (input)="joinCode.set($any($event.target).value)"
              (keyup.enter)="go()"
            />
            <button class="lp-btn lp-btn-ghost" (click)="go()" [disabled]="!joinCode().trim()">
              <i class="ti ti-arrow-right"></i>
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
    }
    .appbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
    }
    .brand { display: flex; align-items: center; gap: 9px; }
    .logo {
      width: 34px; height: 34px; border-radius: 11px;
      background: var(--grad-brand); color: var(--color-brand-contrast);
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--glow-brand);
    }
    .logo i { font-size: 19px; }
    .word { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--color-background-info); color: var(--color-text-info);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; text-decoration: none;
    }
    .content { padding: 4px 14px 24px; }
    .h1 { font-size: 24px; font-weight: 700; margin: 6px 0 14px; }

    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 4px; flex-wrap: wrap; }
    .state.err { color: var(--color-text-danger); }
    .state .lp-btn { margin-left: auto; }

    .empty { padding: 30px 18px; text-align: center; }
    .empty .ball {
      width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      background: var(--color-background-success); color: var(--color-text-success); margin-bottom: 10px;
    }
    .empty .ball i { font-size: 34px; }
    .empty .t { font-family: var(--font-display); font-weight: 600; font-size: 16px; margin: 0; color: var(--color-text-primary); }
    .empty .s { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 0; }

    .grid { display: flex; flex-direction: column; gap: 10px; }
    .pcard {
      display: flex; align-items: center; gap: 12px; padding: 12px; text-decoration: none;
      width: 100%; text-align: left; font-family: inherit; color: inherit; cursor: pointer;
      transition: transform 150ms cubic-bezier(0,0,0.2,1), border-color 150ms cubic-bezier(0,0,0.2,1);
    }
    .pcard:active { transform: scale(0.99); }
    .crest {
      width: 46px; height: 46px; border-radius: var(--border-radius-md); flex-shrink: 0;
      background: var(--color-background-secondary); display: flex; align-items: center; justify-content: center;
      overflow: hidden; color: var(--color-text-warning);
    }
    .crest img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
    .crest i { font-size: 22px; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .nm { font-family: var(--font-display); font-weight: 600; font-size: 15.5px; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tags { display: flex; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
    .chev { color: var(--color-text-tertiary); font-size: 20px; }

    .create { width: 100%; margin: 16px 0 12px; padding: 14px; font-size: 15px; }

    .join { padding: 12px; }
    .join-row { display: flex; gap: 8px; }
    .join-row .lp-input { flex: 1; }
    .mono { font-family: var(--font-mono); letter-spacing: 0.04em; }
    .join-row .lp-btn { padding: 11px 14px; }
  `,
})
export class MisPollas {
  private readonly pollas = inject(PollaService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ctx = inject(PollaContextService);

  /** Abre una polla: la deja activa y va a Partidos. */
  open(p: PollaCard) {
    this.ctx.setActive(p.id);
    void this.router.navigate(['/partidos']);
  }

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly list = signal<PollaCard[]>([]);
  readonly joinCode = signal('');

  private readonly myId = computed(() => this.auth.user()?.id ?? '');

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.list.set(await this.pollas.myPollas());
      this.error.set(null);
    } catch {
      this.error.set('No pudimos cargar tus pollas.');
    } finally {
      this.loading.set(false);
    }
  }

  membersCount(p: PollaCard): number {
    return p.members?.[0]?.count ?? 0;
  }

  isAdmin(p: PollaCard): boolean {
    return p.created_by === this.myId();
  }

  prizeLabel(p: PollaCard): string {
    if (p.prize_type === 'sin') return 'Por el honor';
    if (p.prize_type === 'fijo') return p.fixed_prize ? p.fixed_prize : 'Premio fijo';
    const fee = Number(p.entry_fee ?? 0);
    const total = fee * Math.max(this.membersCount(p), 1);
    return total > 0 ? `Pozo $${total.toLocaleString('es-CO')}` : 'Pozo';
  }

  go() {
    const code = this.joinCode().trim();
    if (code) void this.router.navigate(['/unirse', code]);
  }
}
