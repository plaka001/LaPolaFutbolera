import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PollaService } from '../../../core/polla.service';

type Preview = Awaited<ReturnType<PollaService['preview']>>;

/** Unirse a una polla por código de invitación: preview + join. */
@Component({
  selector: 'app-unirse',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>Unirse a una polla</h1>
      </header>

      <main class="content">
        @if (loading()) {
          <div class="state"><i class="ti ti-loader-2 spin"></i> Buscando la polla…</div>
        } @else if (!preview()) {
          <div class="lp-card bad">
            <span class="ic"><i class="ti ti-ghost-2"></i></span>
            <p class="t">No encontramos esa polla</p>
            <p class="s">El código <b class="mono">{{ code() }}</b> no es válido o la polla ya no existe.</p>
            <button class="lp-btn lp-btn-ghost" routerLink="/pollas">Volver a mis pollas</button>
          </div>
        } @else {
          <div class="lp-card pitch-bg invite">
            <p class="kick">Te invitaron a</p>
            <p class="nm">{{ preview()!.name }}</p>
            <div class="crest">
              @if (preview()!.competition_logo) {
                <img [src]="preview()!.competition_logo!" [alt]="preview()!.competition_name ?? ''" />
              } @else {
                <i class="ti ti-trophy"></i>
              }
              <span>{{ preview()!.competition_name ?? 'Sin competición' }}</span>
            </div>
            <div class="facts">
              <span class="fact"><i class="ti ti-users"></i> {{ preview()!.members_count }} {{ preview()!.members_count === 1 ? 'jugador' : 'jugadores' }}</span>
              <span class="fact"><i class="ti" [class.ti-coins]="preview()!.prize_type !== 'sin'" [class.ti-mood-smile]="preview()!.prize_type === 'sin'"></i> {{ prizeLabel() }}</span>
            </div>
            @if (preview()!.admin_name) {
              <p class="by">Creada por {{ preview()!.admin_name }}</p>
            }
          </div>

          @if (preview()!.prize_type === 'pozo') {
            <div class="note"><i class="ti ti-info-circle"></i> Hay pozo: el admin te habilita para jugar cuando registres tu pago.</div>
          }

          @if (error()) { <p class="err"><i class="ti ti-alert-triangle"></i> {{ error() }}</p> }

          <button class="lp-btn lp-btn-primary join" (click)="join()" [disabled]="joining()">
            @if (joining()) { <i class="ti ti-loader-2 spin"></i> Entrando… }
            @else { <i class="ti ti-door-enter"></i> Unirme a la polla }
          </button>
        }
      </main>
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; }
    .appbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; }
    .appbar h1 { font-size: 19px; font-weight: 700; margin: 0; }
    .back { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; }
    .back i { font-size: 22px; }
    .content { padding: 8px 14px 28px; }

    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 30px 4px; }
    .mono { font-family: var(--font-mono); }

    .invite { padding: 26px 18px; text-align: center; }
    .kick { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--color-text-tertiary); margin: 0; }
    .invite .nm { font-family: var(--font-display); font-weight: 700; font-size: 24px; margin: 4px 0 12px; color: var(--color-text-primary); }
    .crest { display: inline-flex; align-items: center; gap: 8px; background: var(--color-background-secondary); padding: 6px 12px 6px 8px; border-radius: 999px; font-size: 13px; color: var(--color-text-primary); }
    .crest img { width: 22px; height: 22px; object-fit: contain; }
    .crest i { font-size: 18px; color: var(--color-text-warning); }
    .facts { display: flex; justify-content: center; gap: 16px; margin-top: 14px; }
    .fact { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); }
    .fact i { font-size: 16px; }
    .by { font-size: 12px; color: var(--color-text-tertiary); margin: 14px 0 0; }

    .bad { padding: 30px 18px; text-align: center; }
    .bad .ic { width: 58px; height: 58px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-secondary); color: var(--color-text-tertiary); margin-bottom: 8px; }
    .bad .ic i { font-size: 32px; }
    .bad .t { font-family: var(--font-display); font-weight: 700; font-size: 18px; margin: 0; }
    .bad .s { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 14px; }

    .note { font-size: 12.5px; color: var(--color-text-secondary); background: var(--color-background-info); color: var(--color-text-info); border-radius: var(--border-radius-md); padding: 10px 12px; margin-top: 12px; display: flex; align-items: center; gap: 8px; }
    .err { font-size: 12.5px; color: var(--color-text-danger); display: flex; align-items: center; gap: 6px; margin: 12px 0 0; }
    .join { width: 100%; padding: 14px; font-size: 15px; margin-top: 16px; }
  `,
})
export class Unirse {
  private readonly pollas = inject(PollaService);
  private readonly router = inject(Router);

  /** Bound desde la ruta /unirse/:code (withComponentInputBinding). */
  readonly code = input.required<string>();

  readonly loading = signal(true);
  readonly preview = signal<Preview | null>(null);
  readonly joining = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    let lookedUp = '';
    effect(() => {
      const c = this.code();
      if (c && c !== lookedUp) {
        lookedUp = c;
        void this.loadPreview(c);
      }
    });
  }

  private async loadPreview(code: string) {
    this.loading.set(true);
    try {
      this.preview.set(await this.pollas.preview(code));
    } catch {
      this.preview.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  prizeLabel(): string {
    const p = this.preview();
    if (!p) return '';
    if (p.prize_type === 'sin') return 'Por el honor';
    if (p.prize_type === 'fijo') return 'Premio fijo';
    const fee = Number(p.entry_fee ?? 0);
    return fee > 0 ? `Pozo · $${fee.toLocaleString('es-CO')} c/u` : 'Pozo';
  }

  async join() {
    if (this.joining()) return;
    this.joining.set(true);
    this.error.set(null);
    try {
      const id = await this.pollas.join(this.code());
      void this.router.navigate(['/polla', id]);
    } catch {
      this.error.set('No pudimos unirte. Probá de nuevo.');
      this.joining.set(false);
    }
  }
}
