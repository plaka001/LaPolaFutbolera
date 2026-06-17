import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { PollaService, PollaCard } from '../../../core/polla.service';
import { PollaContextService } from '../../../core/polla-context.service';

/** Detalle de una polla: info + link de invitación + qué viene. */
@Component({
  selector: 'app-polla-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>{{ polla()?.name ?? 'Polla' }}</h1>
      </header>

      <main class="content">
        @if (loading()) {
          <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando…</div>
        } @else if (!polla()) {
          <div class="state err">
            <i class="ti ti-alert-triangle"></i> No se pudo cargar la polla.
            <button class="lp-btn lp-btn-ghost" routerLink="/pollas">Volver</button>
          </div>
        } @else {
          <div class="lp-card pitch-bg head">
            <span class="crest">
              @if (polla()!.competition?.logo_url) {
                <img [src]="polla()!.competition!.logo_url!" alt="" />
              } @else {
                <i class="ti ti-trophy"></i>
              }
            </span>
            <p class="nm">{{ polla()!.name }}</p>
            <p class="sub">{{ polla()!.competition?.name ?? 'Sin competición' }}</p>
            <div class="facts">
              <span class="fact"><i class="ti ti-users"></i> {{ membersCount() }} {{ membersCount() === 1 ? 'jugador' : 'jugadores' }}</span>
              <span class="fact"><i class="ti" [class.ti-coins]="polla()!.prize_type !== 'sin'" [class.ti-mood-smile]="polla()!.prize_type === 'sin'"></i> {{ prizeLabel() }}</span>
              @if (isAdmin()) { <span class="fact admin"><i class="ti ti-shield-check"></i> Admin</span> }
            </div>
          </div>

          <button class="lp-btn lp-btn-primary pronost" (click)="pronosticar()">
            <i class="ti ti-ball-football"></i> Pronosticar partidos
          </button>

          <label class="lp-label" style="margin-top:14px">Invitá a tu gente</label>
          <div class="invite">
            <span class="url mono">{{ inviteUrl() }}</span>
            <button class="lp-btn lp-btn-ghost" (click)="copy()">
              <i class="ti" [class.ti-copy]="!copied()" [class.ti-check]="copied()"></i>
              {{ copied() ? '¡Copiado!' : 'Copiar' }}
            </button>
          </div>
          <a class="lp-btn lp-btn-ghost wa" [href]="waUrl()" target="_blank" rel="noopener">
            <i class="ti ti-brand-whatsapp"></i> Compartir por WhatsApp
          </a>

          <div class="next lp-card">
            <p class="nt">Lo que viene en esta polla</p>
            <div class="row"><i class="ti ti-ball-football"></i> Partidos y pronósticos <span class="soon">Fase 2</span></div>
            <div class="row"><i class="ti ti-list-numbers"></i> Tabla de posiciones <span class="soon">Fase 3</span></div>
            <div class="row"><i class="ti ti-coin"></i> Pozo y pagos <span class="soon">Fase 4</span></div>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; }
    .appbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; }
    .appbar h1 {
      font-size: 18px; font-weight: 700; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .back { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; flex-shrink: 0; }
    .back i { font-size: 22px; }
    .content { padding: 4px 14px 24px; }

    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 4px; flex-wrap: wrap; }
    .state.err { color: var(--color-text-danger); }
    .state .lp-btn { margin-left: auto; }

    .head { padding: 24px 18px; text-align: center; }
    .crest { width: 56px; height: 56px; border-radius: var(--border-radius-md); display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-secondary); color: var(--color-text-warning); overflow: hidden; }
    .crest img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
    .crest i { font-size: 28px; }
    .nm { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 10px 0 2px; color: var(--color-text-primary); }
    .sub { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
    .facts { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; margin-top: 14px; }
    .fact { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); }
    .fact.admin { color: var(--color-text-success); }
    .fact i { font-size: 16px; }

    .pronost { width: 100%; margin-top: 16px; padding: 14px; font-size: 15px; }
    .invite { display: flex; gap: 8px; align-items: center; }
    .url { flex: 1; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); padding: 11px; font-size: 12.5px; color: var(--color-text-secondary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; background: var(--color-background-primary); }
    .mono { font-family: var(--font-mono); }
    .wa { width: 100%; margin-top: 8px; }

    .next { margin-top: 16px; padding: 14px; }
    .nt { font-family: var(--font-display); font-weight: 600; font-size: 14px; margin: 0 0 10px; }
    .row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--color-text-secondary); padding: 7px 0; }
    .row i { font-size: 18px; color: var(--color-text-tertiary); }
    .soon { margin-left: auto; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; background: var(--color-background-secondary); color: var(--color-text-tertiary); padding: 2px 8px; border-radius: 999px; }
  `,
})
export class PollaDetail {
  private readonly pollas = inject(PollaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ctx = inject(PollaContextService);

  pronosticar() {
    this.ctx.setActive(this.id());
    void this.router.navigate(['/partidos']);
  }

  readonly id = input<string>('');
  readonly polla = signal<PollaCard | null>(null);
  readonly loading = signal(true);
  readonly copied = signal(false);

  readonly membersCount = computed(() => this.polla()?.members?.[0]?.count ?? 0);
  readonly isAdmin = computed(() => this.polla()?.created_by === this.auth.user()?.id);
  readonly inviteUrl = computed(() => {
    const p = this.polla();
    return p ? this.pollas.inviteUrl(p.invite_code) : '';
  });
  readonly waUrl = computed(() => {
    const p = this.polla();
    if (!p) return '';
    const text = `¡Sumate a mi polla "${p.name}" en La Pola Futbolera! ${this.pollas.inviteUrl(p.invite_code)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  constructor() {
    let loadedFor = '';
    effect(() => {
      const pid = this.id();
      if (pid && pid !== loadedFor) {
        loadedFor = pid;
        void this.load(pid);
      }
    });
  }

  private async load(pid: string) {
    this.loading.set(true);
    try {
      this.polla.set(await this.pollas.getPolla(pid));
    } catch {
      this.polla.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  prizeLabel(): string {
    const p = this.polla();
    if (!p) return '';
    if (p.prize_type === 'sin') return 'Por el honor';
    if (p.prize_type === 'fijo') return p.fixed_prize ? p.fixed_prize : 'Premio fijo';
    const fee = Number(p.entry_fee ?? 0);
    const total = fee * Math.max(this.membersCount(), 1);
    return total > 0 ? `Pozo $${total.toLocaleString('es-CO')}` : 'Pozo';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.inviteUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* sin clipboard */
    }
  }
}
