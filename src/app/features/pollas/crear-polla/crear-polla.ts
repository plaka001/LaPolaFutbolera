import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PollaService } from '../../../core/polla.service';
import { Competition, Polla, PrizeType } from '../../../core/models/models';

/** Crear una polla (admin). Replica el mockup crear-polla.html. */
@Component({
  selector: 'app-crear-polla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>{{ created() ? '¡Polla creada!' : 'Crear polla' }}</h1>
      </header>

      <main class="content">
        @if (created(); as p) {
          <!-- Éxito: compartir invitación -->
          <div class="lp-card pitch-bg done">
            <span class="check"><i class="ti ti-circle-check"></i></span>
            <p class="dt">{{ p.name }}</p>
            <p class="ds">Ya está lista. Invitá a tu gente con este link 👇</p>
          </div>

          <label class="lp-label" style="margin-top:14px">Link de invitación</label>
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
          <button class="lp-btn lp-btn-primary go" (click)="goToPolla()">
            <i class="ti ti-arrow-right"></i> Ir a la polla
          </button>
        } @else {
          <!-- Datos -->
          <div class="sec">
            <div class="seclab"><i class="ti ti-ball-football"></i> Datos de la polla</div>
            <div class="lp-card pad">
              <label class="lp-label" for="nm">Nombre</label>
              <input id="nm" class="lp-input" placeholder="ej. Polla Mundial del barrio"
                     [value]="name()" (input)="name.set($any($event.target).value)" maxlength="60" />

              <label class="lp-label" style="margin-top:12px">Competición</label>
              @if (competitions().length === 0) {
                <div class="hint"><i class="ti ti-loader-2 spin"></i> Cargando competiciones…</div>
              } @else {
                <div class="chips">
                  @for (c of competitions(); track c.id) {
                    <button type="button" class="chip" [class.on]="competitionId() === c.id" (click)="competitionId.set(c.id)">
                      @if (c.logo_url) { <img [src]="c.logo_url" [alt]="c.name" /> }
                      {{ c.name }}
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Premio -->
          <div class="sec">
            <div class="seclab"><i class="ti ti-gift"></i> Premio</div>
            <div class="lp-card pad">
              <div class="opts">
                <button type="button" class="opt" [class.on]="prizeType() === 'pozo'" (click)="prizeType.set('pozo')">
                  <i class="ti ti-coins"></i><span>Pozo entre todos</span>
                </button>
                <button type="button" class="opt" [class.on]="prizeType() === 'fijo'" (click)="prizeType.set('fijo')">
                  <i class="ti ti-trophy"></i><span>Premio fijo</span>
                </button>
                <button type="button" class="opt" [class.on]="prizeType() === 'sin'" (click)="prizeType.set('sin')">
                  <i class="ti ti-mood-smile"></i><span>Sin premio</span>
                </button>
              </div>

              @if (prizeType() === 'pozo') {
                <label class="lp-label" style="margin-top:14px">Valor de entrada por persona</label>
                <div class="money">
                  <span>$</span>
                  <input class="lp-input bare" inputmode="numeric" [value]="feeDisplay()"
                         (input)="setFee($any($event.target).value)" />
                </div>
                <label class="lp-label" style="margin-top:12px">Reparto del pozo</label>
                <div class="reparto">
                  <button type="button" class="rep" [class.on]="prizeDistribution() === 'winner'" (click)="prizeDistribution.set('winner')">Todo al 1°</button>
                  <button type="button" class="rep" [class.on]="prizeDistribution() === 'top3'" (click)="prizeDistribution.set('top3')">Top 3 · 70/20/10</button>
                </div>
                <div class="prevpozo"><i class="ti ti-coins"></i> &#36;{{ feeDisplay() }} por persona · el pozo crece con cada jugador</div>
                <div class="hint" style="margin-top:8px"><i class="ti ti-qrcode"></i> El QR de pago lo subís en <b>Pozo</b> (Fase 4).</div>
              } @else if (prizeType() === 'fijo') {
                <label class="lp-label" style="margin-top:14px">¿Cuál es el premio?</label>
                <input class="lp-input" placeholder="ej. Una caja de cervezas 🍺"
                       [value]="fixedPrize()" (input)="fixedPrize.set($any($event.target).value)" maxlength="80" />
              } @else {
                <div class="hint" style="margin-top:12px"><i class="ti ti-mood-smile"></i> Se juega por el honor y el pique. Igual de divertido.</div>
              }
            </div>
          </div>

          <!-- Puntaje -->
          <div class="sec">
            <div class="seclab"><i class="ti ti-calculator"></i> Puntaje</div>
            <div class="lp-card pad">
              <div class="pick on">
                <div class="pt">Sistema clásico <i class="ti ti-check"></i></div>
                <div class="pd">5 acierto · 2 marcador exacto · 1 diferencia · doble en finales</div>
              </div>
              <div class="pick disabled">
                <div class="pt">Personalizar <span class="soon">pronto</span></div>
                <div class="pd">Definí tus propios puntos por acierto</div>
              </div>
              <div class="swrow">
                <div>
                  <div class="swt">Comodín x2 por fecha</div>
                  <div class="sws">Cada jugador dobla 1 partido</div>
                </div>
                <button type="button" class="sw" [class.on]="jokerEnabled()" (click)="jokerEnabled.set(!jokerEnabled())" role="switch" [attr.aria-checked]="jokerEnabled()" aria-label="Comodín x2">
                  <span class="k"></span>
                </button>
              </div>
            </div>
          </div>

          @if (error()) { <p class="err"><i class="ti ti-alert-triangle"></i> {{ error() }}</p> }

          <button class="lp-btn lp-btn-primary submit" (click)="create()" [disabled]="busy() || !canSubmit()">
            @if (busy()) { <i class="ti ti-loader-2 spin"></i> Creando… }
            @else { <i class="ti ti-check"></i> Crear polla }
          </button>
        }
      </main>
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; }
    .appbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; position: sticky; top: 0; z-index: 5; background: var(--color-background-tertiary); }
    .appbar h1 { font-size: 19px; font-weight: 700; margin: 0; }
    .back { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; }
    .back i { font-size: 22px; }
    .content { padding: 4px 14px 28px; }

    .sec { margin-bottom: 14px; }
    .seclab { font-size: 12px; color: var(--color-text-secondary); margin: 0 2px 7px; display: flex; align-items: center; gap: 6px; }
    .seclab i { font-size: 15px; }
    .pad { padding: 12px; }
    .hint { font-size: 11.5px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; }

    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px;
      padding: 7px 11px; border-radius: 999px; cursor: pointer; font-family: inherit;
      border: 0.5px solid var(--color-border-tertiary); background: var(--color-background-primary); color: var(--color-text-secondary);
      transition: all 150ms cubic-bezier(0,0,0.2,1); min-height: 36px;
    }
    .chip img { width: 18px; height: 18px; object-fit: contain; }
    .chip.on { background: var(--color-background-success); color: var(--color-text-success); border-color: var(--color-border-success); font-weight: 600; }

    .opts { display: flex; gap: 8px; }
    .opt {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; font-family: inherit;
      background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md);
      padding: 11px 4px; color: var(--color-text-secondary); transition: all 150ms cubic-bezier(0,0,0.2,1);
    }
    .opt i { font-size: 20px; }
    .opt span { font-size: 11px; line-height: 1.2; text-align: center; color: var(--color-text-primary); }
    .opt.on { border: 1.5px solid var(--color-border-success); background: var(--color-background-success); color: var(--color-text-success); }
    .opt.on span { color: var(--color-text-success); font-weight: 600; }

    .money { display: flex; align-items: center; gap: 4px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); padding: 0 11px; background: var(--color-background-primary); }
    .money > span { font-size: 14px; color: var(--color-text-secondary); }
    .bare { border: none !important; padding-left: 4px; background: transparent; }
    .reparto { display: flex; gap: 8px; }
    .rep { flex: 1; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 9px; text-align: center; font-size: 12px; cursor: pointer; color: var(--color-text-secondary); font-family: inherit; background: var(--color-background-primary); }
    .rep.on { border: 1.5px solid var(--color-border-success); background: var(--color-background-success); color: var(--color-text-success); font-weight: 600; }
    .prevpozo { margin-top: 10px; font-size: 12px; color: var(--color-text-success); background: var(--color-background-success); border-radius: var(--border-radius-md); padding: 8px 10px; display: flex; align-items: center; gap: 6px; }

    .pick { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 10px 11px; margin-bottom: 8px; }
    .pick.on { border: 1.5px solid var(--color-border-success); background: var(--color-background-success); }
    .pick.disabled { opacity: 0.6; }
    .pt { font-size: 13px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; justify-content: space-between; }
    .pick.on .pt { color: var(--color-text-success); }
    .pd { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 3px; }
    .soon { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; background: var(--color-background-secondary); color: var(--color-text-tertiary); padding: 2px 7px; border-radius: 999px; }

    .swrow { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .swt { font-size: 13px; color: var(--color-text-primary); }
    .sws { font-size: 11.5px; color: var(--color-text-secondary); }
    .sw { width: 42px; height: 24px; border-radius: 999px; background: var(--color-border-secondary); position: relative; cursor: pointer; border: none; flex-shrink: 0; transition: background-color 150ms cubic-bezier(0,0,0.2,1); }
    .sw.on { background: var(--color-brand); }
    .sw .k { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 150ms cubic-bezier(0,0,0.2,1); }
    .sw.on .k { transform: translateX(18px); }

    .err { font-size: 12.5px; color: var(--color-text-danger); display: flex; align-items: center; gap: 6px; margin: 0 0 10px; }
    .submit, .go { width: 100%; padding: 14px; font-size: 15px; margin-top: 4px; }

    /* éxito */
    .done { padding: 26px 18px; text-align: center; }
    .check { width: 58px; height: 58px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-success); color: var(--color-text-success); margin-bottom: 8px; }
    .check i { font-size: 34px; }
    .dt { font-family: var(--font-display); font-weight: 700; font-size: 18px; margin: 0; }
    .ds { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 0; }
    .invite { display: flex; gap: 8px; align-items: center; }
    .url { flex: 1; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); padding: 11px; font-size: 12.5px; color: var(--color-text-secondary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; background: var(--color-background-primary); }
    .mono { font-family: var(--font-mono); }
    .wa { width: 100%; margin-top: 8px; }
    .go { margin-top: 14px; }
  `,
})
export class CrearPolla {
  private readonly pollas = inject(PollaService);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly competitions = signal<Competition[]>([]);
  readonly competitionId = signal<string | null>(null);
  readonly prizeType = signal<PrizeType>('pozo');
  readonly entryFee = signal(20000);
  readonly prizeDistribution = signal<'winner' | 'top3'>('winner');
  readonly fixedPrize = signal('');
  readonly jokerEnabled = signal(true);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly created = signal<Polla | null>(null);
  readonly copied = signal(false);

  readonly feeDisplay = computed(() => this.entryFee().toLocaleString('es-CO'));
  readonly inviteUrl = computed(() => {
    const p = this.created();
    return p ? this.pollas.inviteUrl(p.invite_code) : '';
  });
  readonly waUrl = computed(() => {
    const p = this.created();
    if (!p) return '';
    const text = `¡Sumate a mi polla "${p.name}" en La Pola Futbolera! ${this.pollas.inviteUrl(p.invite_code)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });
  readonly canSubmit = computed(() => this.name().trim().length > 0 && !!this.competitionId());

  constructor() {
    void this.loadCompetitions();
  }

  private async loadCompetitions() {
    try {
      const comps = await this.pollas.listCompetitions();
      this.competitions.set(comps);
      if (comps.length && !this.competitionId()) this.competitionId.set(comps[0].id);
    } catch {
      this.error.set('No pudimos cargar las competiciones.');
    }
  }

  setFee(value: string) {
    const n = parseInt(value.replace(/\D/g, '') || '0', 10);
    this.entryFee.set(n);
  }

  async create() {
    if (!this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const polla = await this.pollas.createPolla({
        name: this.name().trim(),
        competitionId: this.competitionId(),
        prizeType: this.prizeType(),
        entryFee: this.entryFee(),
        prizeDistribution: this.prizeDistribution(),
        fixedPrize: this.fixedPrize().trim() || null,
        jokerEnabled: this.jokerEnabled(),
      });
      this.created.set(polla);
    } catch {
      this.error.set('No se pudo crear la polla. Probá de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.inviteUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* clipboard no disponible */
    }
  }

  goToPolla() {
    const p = this.created();
    if (p) void this.router.navigate(['/polla', p.id]);
  }
}
