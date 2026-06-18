import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../../shared/avatar/avatar';
import { AuthService } from '../../core/auth.service';
import { PollaContextService } from '../../core/polla-context.service';
import { PredictionService, HistRow } from '../../core/prediction.service';

interface UserAgg {
  user_id: string;
  name: string;
  avatar: string | null;
  points: number;
  played: number;
  exacts: number;
  results: number;
  jokerPoints: number;
  bestStreak: number;
  currentStreak: number;
}

type Tab = 'fama' | 'rachas' | 'duelos';

/** Salón de la fama, rachas y duelos de la polla activa.
 *  Todo se calcula en el cliente desde el historial puntuado (una sola consulta). */
@Component({
  selector: 'app-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar],
  template: `
    <header class="appbar">
      <a class="back" routerLink="/tabla" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
      <h1>Salón de la fama</h1>
    </header>

    @if (!ctx.activePollaId()) {
      <section class="px-4 pt-3">
        <div class="lp-card empty">
          <span class="ball"><i class="ti ti-award"></i></span>
          <p class="t">Elegí una polla para ver sus records</p>
          <a class="lp-btn lp-btn-primary" routerLink="/pollas"><i class="ti ti-trophy"></i> Mis pollas</a>
        </div>
      </section>
    } @else if (loading()) {
      <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando…</div>
    } @else if (history().length === 0) {
      <div class="lp-card empty">
        <span class="ball"><i class="ti ti-hourglass"></i></span>
        <p class="t">Todavía no hay partidos finalizados</p>
        <p class="sub">Cuando se jueguen los primeros partidos aparecen acá los records, rachas y duelos.</p>
      </div>
    } @else {
      <nav class="seg">
        <button type="button" [class.on]="tab() === 'fama'" (click)="tab.set('fama')"><i class="ti ti-award"></i> Records</button>
        <button type="button" [class.on]="tab() === 'rachas'" (click)="tab.set('rachas')"><i class="ti ti-flame"></i> Rachas</button>
        <button type="button" [class.on]="tab() === 'duelos'" (click)="tab.set('duelos')"><i class="ti ti-swords"></i> Duelos</button>
      </nav>

      @switch (tab()) {
        @case ('fama') {
          <section class="records">
            @for (r of records(); track r.title) {
              <div class="lp-card rec">
                <span class="ico" [style.color]="r.color"><i class="ti {{ r.icon }}"></i></span>
                <div class="rinfo">
                  <span class="rt">{{ r.title }}</span>
                  <span class="rn">{{ r.name }}</span>
                </div>
                <span class="rv">{{ r.value }}</span>
              </div>
            }
          </section>
        }
        @case ('rachas') {
          <section class="list">
            @for (u of streaks(); track u.user_id) {
              <div class="lp-card srow" [class.me]="u.user_id === meId()">
                <app-avatar class="av" [url]="u.avatar" [name]="u.name" />
                <div class="info">
                  <span class="nm">{{ u.name }} @if (u.user_id === meId()) { <span class="you">Vos</span> }</span>
                  <span class="rsub">Mejor racha: {{ u.bestStreak }}</span>
                </div>
                @if (u.currentStreak > 0) {
                  <span class="flames">
                    @for (f of flameArr(u.currentStreak); track $index) { <i class="ti ti-flame"></i> }
                    <b>{{ u.currentStreak }}</b>
                  </span>
                } @else {
                  <span class="cold"><i class="ti ti-snowflake"></i></span>
                }
              </div>
            }
          </section>
          <p class="hint">Una racha suma cada partido seguido en el que acertás (al menos el resultado).</p>
        }
        @case ('duelos') {
          @if (users().length < 2) {
            <div class="state">Se necesitan al menos 2 jugadores con partidos jugados.</div>
          } @else {
            <div class="duelpick">
              <div class="pickside">
                <app-avatar class="av big" [url]="meAgg()?.avatar ?? null" [name]="meAgg()?.name ?? 'Vos'" />
                <span class="pn">{{ meAgg()?.name ?? 'Vos' }}</span>
              </div>
              <span class="vs">VS</span>
              <div class="pickside">
                <app-avatar class="av big" [url]="oppAgg()?.avatar ?? null" [name]="oppAgg()?.name ?? ''" />
                <select class="lp-input osel" [value]="opponentId()" (change)="onOpp($event)">
                  @for (u of opponents(); track u.user_id) {
                    <option [value]="u.user_id">{{ u.name }}</option>
                  }
                </select>
              </div>
            </div>

            @if (duel(); as d) {
              <div class="lp-card scorecard">
                <span class="big" [class.win]="d.h2h.w > d.h2h.l">{{ d.h2h.w }}</span>
                <div class="mid"><span class="ml">Duelos ganados</span><span class="me">{{ d.h2h.d }} empates</span></div>
                <span class="big" [class.win]="d.h2h.l > d.h2h.w">{{ d.h2h.l }}</span>
              </div>

              <div class="cmp">
                @for (c of d.metrics; track c.label) {
                  <div class="crow">
                    <span class="cv" [class.lead]="c.a > c.b">{{ c.a }}</span>
                    <span class="cl">{{ c.label }}</span>
                    <span class="cv" [class.lead]="c.b > c.a">{{ c.b }}</span>
                  </div>
                }
              </div>

              @if (d.shared.length) {
                <p class="hint">Partidos en común</p>
                <section class="list">
                  @for (s of d.shared; track s.match_id) {
                    <div class="lp-card hrow">
                      <span class="teams">{{ s.label }}</span>
                      <span class="cell" [class.win]="s.mePts > s.oppPts">{{ s.mePred }} <b>+{{ s.mePts }}</b></span>
                      <span class="res">{{ s.result }}</span>
                      <span class="cell" [class.win]="s.oppPts > s.mePts">{{ s.oppPred }} <b>+{{ s.oppPts }}</b></span>
                    </div>
                  }
                </section>
              }
            }
          }
        }
      }
    }
  `,
  styles: `
    .appbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; }
    .appbar h1 { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin: 0; }
    .back { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); text-decoration: none; }
    .back i { font-size: 22px; }
    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 18px; }
    .empty { margin: 8px 14px; padding: 28px 18px; text-align: center; }
    .empty .ball { width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-warning); color: var(--color-text-warning); margin-bottom: 10px; }
    .empty .ball i { font-size: 30px; }
    .empty .t { font-family: var(--font-display); font-weight: 600; font-size: 16px; margin: 0 0 6px; }
    .empty .sub { font-size: 13px; color: var(--color-text-secondary); margin: 0 0 12px; }

    .seg { display: flex; gap: 6px; padding: 4px; margin: 4px 14px 10px; background: var(--color-background-secondary); border-radius: 999px; }
    .seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 0; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--color-text-secondary); padding: 8px 4px; border-radius: 999px; cursor: pointer; }
    .seg button i { font-size: 15px; }
    .seg button.on { background: var(--color-background-primary); color: var(--color-text-primary); box-shadow: var(--shadow-card); }

    .records { padding: 0 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .rec { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .ico { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--color-background-secondary); flex-shrink: 0; }
    .ico i { font-size: 22px; }
    .rinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .rt { font-size: 12px; color: var(--color-text-secondary); }
    .rn { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
    .rv { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--color-text-primary); }

    .list { padding: 0 14px 8px; display: flex; flex-direction: column; gap: 6px; }
    .srow { display: flex; align-items: center; gap: 10px; padding: 9px 11px; }
    .srow.me { border-color: var(--color-border-info); background: var(--color-background-info); }
    .av { width: 34px; height: 34px; }
    .av.big { width: 52px; height: 52px; --av-fs: 17px; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .nm { font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .you { font-size: 10px; font-weight: 600; background: var(--color-text-info); color: #fff; padding: 1px 6px; border-radius: 999px; }
    .rsub { font-size: 11px; color: var(--color-text-secondary); }
    .flames { display: inline-flex; align-items: center; gap: 1px; color: var(--color-text-danger); font-family: var(--font-display); }
    .flames i { font-size: 16px; }
    .flames b { margin-left: 3px; font-size: 14px; }
    .cold { color: var(--color-text-tertiary); }
    .cold i { font-size: 18px; }
    .hint { font-size: 12px; color: var(--color-text-secondary); padding: 4px 16px 14px; margin: 0; }

    .duelpick { display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 10px; padding: 6px 14px 12px; }
    .pickside { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .pn { font-size: 13px; font-weight: 600; }
    .osel { width: 100%; max-width: 150px; padding: 6px 8px; font-size: 13px; }
    .vs { align-self: center; font-family: var(--font-display); font-weight: 700; color: var(--color-text-tertiary); }

    .scorecard { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 0 14px 10px; padding: 14px; text-align: center; }
    .scorecard .big { font-family: var(--font-display); font-size: 32px; font-weight: 700; color: var(--color-text-tertiary); }
    .scorecard .big.win { color: var(--color-text-success); }
    .mid { display: flex; flex-direction: column; gap: 2px; }
    .ml { font-size: 12px; color: var(--color-text-secondary); }
    .me { font-size: 11px; color: var(--color-text-tertiary); }

    .cmp { margin: 0 14px 12px; display: flex; flex-direction: column; gap: 2px; }
    .crow { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 8px 12px; border-radius: var(--border-radius-md); background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); }
    .cv { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--color-text-secondary); }
    .crow .cv:first-child { text-align: left; }
    .crow .cv:last-child { text-align: right; }
    .cv.lead { color: var(--color-text-success); font-weight: 700; }
    .cl { font-size: 11.5px; color: var(--color-text-tertiary); text-align: center; }

    .hrow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 8px; padding: 8px 10px; }
    .teams { font-size: 11.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cell { font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; }
    .hrow .cell:last-child { text-align: right; }
    .cell b { color: var(--color-text-primary); }
    .cell.win { color: var(--color-text-success); }
    .cell.win b { color: var(--color-text-success); }
    .res { font-family: var(--font-display); font-size: 12px; font-weight: 700; color: var(--color-text-primary); padding: 0 2px; }
  `,
})
export class Stats {
  protected readonly ctx = inject(PollaContextService);
  private readonly predSvc = inject(PredictionService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly history = signal<HistRow[]>([]);
  readonly tab = signal<Tab>('fama');
  readonly meId = computed(() => this.auth.user()?.id ?? '');
  readonly opponentId = signal<string>('');

  constructor() {
    void this.load();
    // Elegir rival por defecto cuando hay datos: el primer jugador que no soy yo.
    effect(() => {
      const us = this.users();
      if (!this.opponentId() && us.length) {
        const first = us.find((u) => u.user_id !== this.meId()) ?? us[0];
        this.opponentId.set(first.user_id);
      }
    });
  }

  private async load() {
    const pid = this.ctx.activePollaId();
    if (!pid) {
      this.loading.set(false);
      return;
    }
    try {
      this.history.set(await this.predSvc.pollaHistory(pid));
    } catch {
      this.history.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  /** Agregados por jugador. */
  readonly aggs = computed<UserAgg[]>(() => {
    const byUser = new Map<string, HistRow[]>();
    for (const r of this.history()) {
      const arr = byUser.get(r.user_id);
      if (arr) arr.push(r);
      else byUser.set(r.user_id, [r]);
    }
    const out: UserAgg[] = [];
    for (const [uid, rs] of byUser) {
      let points = 0, exacts = 0, results = 0, jokerPoints = 0, best = 0, cur = 0;
      for (const r of rs) {
        points += r.points;
        if (r.is_joker) jokerPoints += r.points;
        if (r.home_pred === r.home_score && r.away_pred === r.away_score) exacts++;
        if (Math.sign(r.home_pred - r.away_pred) === Math.sign(r.home_score - r.away_score)) results++;
        if (r.points > 0) { cur++; best = Math.max(best, cur); } else cur = 0;
      }
      let trail = 0;
      for (let i = rs.length - 1; i >= 0; i--) { if (rs[i].points > 0) trail++; else break; }
      out.push({ user_id: uid, name: rs[0].name, avatar: rs[0].avatar, points, played: rs.length, exacts, results, jokerPoints, bestStreak: best, currentStreak: trail });
    }
    return out;
  });

  readonly users = computed(() => [...this.aggs()].sort((a, b) => b.points - a.points));
  readonly streaks = computed(() =>
    [...this.aggs()].sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak),
  );

  readonly records = computed(() => {
    const us = this.aggs();
    if (!us.length) return [];
    const top = (key: keyof UserAgg) => us.reduce((m, u) => ((u[key] as number) > (m[key] as number) ? u : m));
    const recs = [
      { icon: 'ti-crown', color: 'var(--color-text-warning)', title: 'Líder de la polla', key: 'points' as const, suffix: ' pts' },
      { icon: 'ti-target-arrow', color: 'var(--color-text-success)', title: 'Francotirador (exactos)', key: 'exacts' as const, suffix: '' },
      { icon: 'ti-flame', color: 'var(--color-text-danger)', title: 'Racha más larga', key: 'bestStreak' as const, suffix: ' 🔥' },
      { icon: 'ti-bolt', color: 'var(--color-text-info)', title: 'Comodín más rentable', key: 'jokerPoints' as const, suffix: ' pts' },
    ];
    return recs
      .map((r) => {
        const w = top(r.key);
        return { icon: r.icon, color: r.color, title: r.title, name: w.name, value: (w[r.key] as number) + r.suffix };
      })
      .filter((r) => parseInt(r.value, 10) > 0);
  });

  readonly meAgg = computed(() => this.aggs().find((u) => u.user_id === this.meId()) ?? null);
  readonly oppAgg = computed(() => this.aggs().find((u) => u.user_id === this.opponentId()) ?? null);
  readonly opponents = computed(() => this.users().filter((u) => u.user_id !== this.meId()));

  readonly duel = computed(() => {
    const me = this.meId();
    const opp = this.opponentId();
    if (!opp || me === opp) return null;
    const mine = new Map(this.history().filter((r) => r.user_id === me).map((r) => [r.match_id, r]));
    const theirs = this.history().filter((r) => r.user_id === opp);
    let w = 0, d = 0, l = 0;
    const shared: { match_id: string; label: string; result: string; mePred: string; oppPred: string; mePts: number; oppPts: number }[] = [];
    for (const t of theirs) {
      const m = mine.get(t.match_id);
      if (!m) continue;
      if (m.points > t.points) w++;
      else if (m.points < t.points) l++;
      else d++;
      shared.push({
        match_id: t.match_id,
        label: short(t.home_team) + ' v ' + short(t.away_team),
        result: t.home_score + '-' + t.away_score,
        mePred: m.home_pred + '-' + m.away_pred,
        oppPred: t.home_pred + '-' + t.away_pred,
        mePts: m.points,
        oppPts: t.points,
      });
    }
    shared.reverse(); // más recientes primero
    const ma = this.meAgg();
    const oa = this.oppAgg();
    const metrics = [
      { label: 'Puntos', a: ma?.points ?? 0, b: oa?.points ?? 0 },
      { label: 'Exactos', a: ma?.exacts ?? 0, b: oa?.exacts ?? 0 },
      { label: 'Resultados', a: ma?.results ?? 0, b: oa?.results ?? 0 },
      { label: 'Mejor racha', a: ma?.bestStreak ?? 0, b: oa?.bestStreak ?? 0 },
    ];
    return { h2h: { w, d, l }, shared, metrics };
  });

  onOpp(e: Event) {
    this.opponentId.set((e.target as HTMLSelectElement).value);
  }

  flameArr(n: number): number[] {
    return Array.from({ length: Math.min(n, 5) });
  }
}

function short(team: string): string {
  return team.length > 10 ? team.slice(0, 9) + '…' : team;
}
