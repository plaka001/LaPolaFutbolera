import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PollaContextService } from '../../core/polla-context.service';
import { PollaService, PollaCard } from '../../core/polla.service';
import { PredictionService } from '../../core/prediction.service';
import { Match } from '../../core/models/models';
import { MatchCard, MatchRowState } from '../../shared/match-card/match-card';

/** Partidos por fecha de la polla activa: pronosticar con autosave + comodín. */
@Component({
  selector: 'app-partidos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatchCard],
  template: `
    @if (!ctx.activePollaId()) {
      <section class="px-4 pt-3">
        <div class="lp-card pitch-bg empty">
          <span class="ball"><i class="ti ti-ball-football"></i></span>
          <p class="t">Elegí una polla para pronosticar</p>
          <a class="lp-btn lp-btn-primary" routerLink="/pollas"><i class="ti ti-trophy"></i> Mis pollas</a>
        </div>
      </section>
    } @else if (loading()) {
      <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando partidos…</div>
    } @else if (error()) {
      <div class="state err"><i class="ti ti-alert-triangle"></i> {{ error() }}</div>
    } @else {
      <header class="phead">
        <div class="ptitle">
          <span class="logo"><i class="ti ti-trophy"></i></span>
          <div class="meta">
            <div class="nm">{{ polla()?.name }}</div>
            <div class="sub">{{ polla()?.competition?.name ?? 'Sin competición' }} · {{ myPoints() }} pts</div>
          </div>
          <a class="info" [routerLink]="['/polla', polla()!.id]" aria-label="Info de la polla"><i class="ti ti-info-circle"></i></a>
        </div>

        <div class="filters">
          <input
            class="lp-input fdate"
            type="date"
            [value]="selectedDate()"
            [min]="minDate()"
            [max]="maxDate()"
            (input)="selectedDate.set($any($event.target).value)"
            aria-label="Día"
          />
          @if (stages().length > 1) {
            <select class="lp-input fstage" (change)="selectedStage.set($any($event.target).value)" aria-label="Etapa">
              <option value="" [selected]="selectedStage() === ''">Todas las etapas</option>
              @for (s of stages(); track s) {
                <option [value]="s" [selected]="selectedStage() === s">{{ s }}</option>
              }
            </select>
          }
        </div>
        @if (selectedDate() || selectedStage()) {
          <button class="vertodos" type="button" (click)="clearFilters()"><i class="ti ti-x"></i> Ver todos</button>
        }
      </header>

      <section class="list">
        @if (visibleMatches().length === 0) {
          <div class="state">Todavía no hay partidos cargados.</div>
        } @else {
          @for (m of visibleMatches(); track m.id) {
            <app-match-card
              [match]="m"
              [state]="rowOf(m.id)"
              [jokerEnabled]="!!polla()?.joker_enabled"
              (homeChange)="onScore(m, 'home', $event)"
              (awayChange)="onScore(m, 'away', $event)"
              (jokerToggle)="onJoker(m)"
            />
          }
        }
      </section>
    }
  `,
  styles: `
    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 18px; }
    .state.err { color: var(--color-text-danger); }

    .empty { padding: 30px 18px; text-align: center; }
    .empty .ball { width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-success); color: var(--color-text-success); margin-bottom: 10px; }
    .empty .ball i { font-size: 34px; }
    .empty .t { font-family: var(--font-display); font-weight: 600; font-size: 16px; margin: 0 0 14px; }

    .phead { padding: 12px 14px 10px; }
    .ptitle { display: flex; align-items: center; gap: 10px; }
    .logo { width: 36px; height: 36px; border-radius: var(--border-radius-md); background: var(--color-background-warning); color: var(--color-text-warning); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .logo i { font-size: 20px; }
    .meta { flex: 1; min-width: 0; }
    .nm { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: 12px; color: var(--color-text-secondary); }
    .info { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; flex-shrink: 0; }
    .info i { font-size: 20px; }

    .filters { display: flex; gap: 8px; margin: 12px 0 0; }
    .fdate { flex: 0 0 auto; width: auto; max-width: 48%; min-height: 40px; }
    .fstage { flex: 1 1 auto; min-width: 0; width: auto; min-height: 40px; }
    .vertodos { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; background: none; border: none; color: var(--color-text-info); font-size: 12.5px; font-family: inherit; cursor: pointer; padding: 4px 2px; }
    .vertodos i { font-size: 14px; }
    .seg.on { background: var(--color-background-success); color: var(--color-text-success); font-weight: 600; }

    .list { padding: 12px 14px 16px; }
  `,
})
export class Partidos {
  protected readonly ctx = inject(PollaContextService);
  private readonly pollas = inject(PollaService);
  private readonly preds = inject(PredictionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly polla = signal<PollaCard | null>(null);
  readonly matches = signal<Match[]>([]);
  readonly rows = signal<Map<string, MatchRowState>>(new Map());
  readonly selectedDate = signal<string>('');
  readonly selectedStage = signal<string>('');

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly days = computed(() => {
    const set = new Set<string>();
    for (const m of this.matches()) set.add(this.dayKey(m.kickoff_at));
    return [...set].sort();
  });
  readonly stages = computed(() => {
    const seen: string[] = [];
    for (const m of this.matches()) {
      const r = m.round ?? '';
      if (r && !seen.includes(r)) seen.push(r);
    }
    return seen;
  });
  readonly minDate = computed(() => this.days()[0] ?? '');
  readonly maxDate = computed(() => {
    const d = this.days();
    return d[d.length - 1] ?? '';
  });

  readonly visibleMatches = computed(() => {
    const date = this.selectedDate();
    const stage = this.selectedStage();
    return this.matches().filter(
      (m) => (!date || this.dayKey(m.kickoff_at) === date) && (!stage || (m.round ?? '') === stage),
    );
  });

  dayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  clearFilters() {
    this.selectedDate.set('');
    this.selectedStage.set('');
  }

  readonly myPoints = computed(() => {
    let total = 0;
    for (const r of this.rows().values()) total += r.points ?? 0;
    return total;
  });

  constructor() {
    void this.load();
  }

  rowOf(id: string): MatchRowState {
    return this.rows().get(id) ?? { home: null, away: null, isJoker: false, points: null, save: 'idle' };
  }

  private patchRow(id: string, partial: Partial<MatchRowState>) {
    const map = new Map(this.rows());
    const current = map.get(id) ?? { home: null, away: null, isJoker: false, points: null, save: 'idle' };
    map.set(id, { ...current, ...partial });
    this.rows.set(map);
  }

  async load() {
    const pid = this.ctx.activePollaId();
    if (!pid) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const polla = await this.pollas.getPolla(pid);
      this.polla.set(polla);
      if (!polla.competition_id) {
        this.matches.set([]);
        this.loading.set(false);
        return;
      }
      const ms = await this.preds.matches(polla.competition_id);
      this.matches.set(ms);
      const mine = await this.preds.myPredictions(pid);
      const map = new Map<string, MatchRowState>();
      for (const m of ms) {
        const p = mine.find((x) => x.match_id === m.id);
        map.set(m.id, {
          home: p?.home_pred ?? null,
          away: p?.away_pred ?? null,
          isJoker: p?.is_joker ?? false,
          points: p?.points ?? null,
          save: 'idle',
        });
      }
      this.rows.set(map);
      const ds = this.days();
      const today = this.dayKey(new Date().toISOString());
      this.selectedDate.set(ds.find((d) => d >= today) ?? ds[ds.length - 1] ?? '');
      this.error.set(null);
    } catch {
      this.error.set('No pudimos cargar los partidos.');
    } finally {
      this.loading.set(false);
    }
  }

  onScore(m: Match, side: 'home' | 'away', value: number) {
    const row = this.rowOf(m.id);
    const patch: Partial<MatchRowState> =
      side === 'home'
        ? { home: value, away: row.away ?? 0 }
        : { away: value, home: row.home ?? 0 };
    this.patchRow(m.id, { ...patch, save: 'idle' });
    this.scheduleSave(m.id);
  }

  private scheduleSave(id: string) {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    this.timers.set(
      id,
      setTimeout(() => void this.doSave(id), 600),
    );
  }

  private async doSave(id: string) {
    const row = this.rowOf(id);
    const pollaId = this.polla()?.id;
    if (!pollaId || row.home === null || row.away === null) return;
    this.patchRow(id, { save: 'saving' });
    try {
      await this.preds.save(pollaId, id, row.home, row.away);
      this.patchRow(id, { save: 'saved' });
    } catch {
      this.patchRow(id, { save: 'error' });
    }
  }

  async onJoker(m: Match) {
    const row = this.rowOf(m.id);
    const pollaId = this.polla()?.id;
    if (!pollaId || row.home === null || row.away === null) return;
    try {
      if (row.isJoker) {
        await this.preds.clearJoker(pollaId, m.id);
        this.patchRow(m.id, { isJoker: false });
      } else {
        const roundIds = this.matches().filter((x) => (x.round ?? '') === (m.round ?? '')).map((x) => x.id);
        await this.preds.setJoker(pollaId, m.id, roundIds);
        const map = new Map(this.rows());
        for (const id of roundIds) {
          const r = map.get(id);
          if (r) map.set(id, { ...r, isJoker: id === m.id });
        }
        this.rows.set(map);
      }
    } catch {
      /* sin cambio si falla */
    }
  }
}
