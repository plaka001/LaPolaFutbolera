import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Match, ScoringRules } from '../../core/models/models';
import { TeamBadge } from '../team-badge/team-badge';
import { ScoreStepper } from '../score-stepper/score-stepper';

/** Puntos según marcador (espejo en TS de score_prediction de la BD). */
function computePoints(
  hp: number, ap: number, h: number | null, a: number | null,
  rules: ScoringRules, knockout: boolean, joker: boolean,
): number {
  if (h === null || a === null) return 0;
  const k = knockout ? 'knockout' : 'group';
  let pts = 0;
  if (Math.sign(hp - ap) === Math.sign(h - a)) pts += rules.result[k];
  if (hp === h) pts += rules.home_goals[k];
  if (ap === a) pts += rules.away_goals[k];
  if (hp - ap === h - a) pts += rules.goal_diff[k];
  if (joker) pts *= rules.joker_multiplier;
  return pts;
}

export interface MatchRowState {
  home: number | null;
  away: number | null;
  isJoker: boolean;
  points: number | null;
  save: 'idle' | 'saving' | 'saved' | 'error';
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  let day: string;
  if (d.toDateString() === now.toDateString()) day = 'Hoy';
  else if (d.toDateString() === tomorrow.toDateString()) day = 'Mañana';
  else day = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  return `${day} · ${time}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Cerrado';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return 'Abierto';
  if (h > 0) return `Cierra en ${h}h ${m}m`;
  return `Cierra en ${m}m`;
}

/** Tarjeta de un partido con pronóstico (replica el mockup partidos.html). */
@Component({
  selector: 'app-match-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeamBadge, ScoreStepper, RouterLink],
  template: `
    <div class="card">
      <div class="cardtop">
        <span class="time">
          @if (mState() === 'live') { <i class="ti ti-ball-football"></i> En juego }
          @else if (mState() === 'finished') { <i class="ti ti-flag"></i> Final }
          @else { <i class="ti ti-clock"></i> {{ timeLabel() }} }
        </span>
        @switch (mState()) {
          @case ('open') {
            <span class="lp-pill" [class.warn]="closingSoon()" [class.ok]="!closingSoon()">
              <i class="ti" [class.ti-clock]="closingSoon()" [class.ti-lock-open]="!closingSoon()"></i>
              {{ closingSoon() ? closeLabel() : 'Abierto' }}
            </span>
          }
          @case ('live') {
            <span class="lp-pill live"><span class="dot"></span> En vivo @if (match().elapsed) { · {{ match().elapsed }}' }</span>
          }
          @case ('finished') { <span class="lp-pill neutral">Finalizado</span> }
          @case ('locked') { <span class="lp-pill neutral"><i class="ti ti-lock"></i> Bloqueado</span> }
        }
      </div>

      <div class="match">
        <app-team-badge [name]="match().home_team" [logo]="match().home_logo" />

        @if (mState() === 'open') {
          <div class="scorerow">
            <app-score-stepper [value]="state().home" (changed)="homeChange.emit($event)" />
            <span class="dash">-</span>
            <app-score-stepper [value]="state().away" (changed)="awayChange.emit($event)" />
          </div>
        } @else {
          <div class="scorerow">
            <div class="sbox" [class.live]="mState() === 'live'" [class.done]="mState() === 'finished'" [class.lock]="mState() === 'locked'">{{ leftScore() }}</div>
            <span class="dash">-</span>
            <div class="sbox" [class.live]="mState() === 'live'" [class.done]="mState() === 'finished'" [class.lock]="mState() === 'locked'">{{ rightScore() }}</div>
          </div>
        }

        <app-team-badge [name]="match().away_team" [logo]="match().away_logo" />
      </div>

      <div class="foot">
        @if (mState() === 'open') {
          @if (jokerEnabled()) {
            <button class="chip" type="button" [class.active]="state().isJoker" [disabled]="!hasPrediction()" (click)="jokerToggle.emit()">
              <i class="ti ti-bolt"></i> Comodín x2
            </button>
          } @else { <span></span> }
          @switch (state().save) {
            @case ('saving') { <span class="muted"><i class="ti ti-loader-2 spin"></i> Guardando…</span> }
            @case ('saved') { <span class="muted"><i class="ti ti-check ok"></i> Guardado</span> }
            @case ('error') { <span class="muted err"><i class="ti ti-alert-triangle"></i> No se guardó</span> }
            @default {
              @if (hasPrediction()) { <span class="muted"><i class="ti ti-check ok"></i> Guardado</span> }
              @else { <span class="muted"><i class="ti ti-hand-finger"></i> Tocá las flechas</span> }
            }
          }
        } @else {
          <span class="muted">
            @if (hasPrediction()) { Tu pronóstico: {{ state().home }} - {{ state().away }} }
            @else { Sin pronóstico }
          </span>
          <span class="footright">
            @if (mState() === 'finished' && state().points !== null) {
              <span class="badge ok"><i class="ti ti-trophy"></i> +{{ state().points }} pts</span>
            } @else if (mState() === 'live' && provisional() !== null) {
              <span class="badge prov"><i class="ti ti-bolt"></i> +{{ provisional() }} provisional</span>
            } @else if (state().isJoker) {
              <span class="badge warn"><i class="ti ti-bolt"></i> Comodín x2</span>
            }
            <a class="seeall" [routerLink]="['/partido', match().id]"><i class="ti ti-eye"></i> Ver</a>
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    .card { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 11px 12px; margin-bottom: 10px; box-shadow: var(--shadow-card); }
    .cardtop { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
    .time { font-size: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 5px; }
    .time i { font-size: 14px; }
    .lp-pill.live { background: var(--color-background-danger); color: var(--color-text-danger); }
    .lp-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-text-danger); display: inline-block; }
    .match { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
    .scorerow { display: flex; align-items: center; gap: 8px; }
    .dash { font-size: 18px; color: var(--color-text-tertiary); }
    .sbox { width: 44px; height: 44px; border-radius: var(--border-radius-md); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 22px; font-weight: 600; border: 1.5px solid var(--color-border-tertiary); color: var(--color-text-primary); }
    .sbox.live { border-color: var(--color-border-danger); }
    .sbox.done { background: var(--color-background-secondary); border-color: var(--color-border-secondary); }
    .sbox.lock { background: var(--color-background-tertiary); border-color: var(--color-border-tertiary); color: var(--color-text-tertiary); }
    .foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 0.5px solid var(--color-border-tertiary); padding-top: 8px; gap: 8px; }
    .footright { display: inline-flex; align-items: center; gap: 8px; }
    .seeall { font-size: 12px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px; border: 0.5px solid var(--color-border-tertiary); color: var(--color-text-secondary); text-decoration: none; }
    .seeall i { font-size: 14px; }
    .chip { font-size: 12px; display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; border: 0.5px solid var(--color-border-tertiary); color: var(--color-text-secondary); cursor: pointer; background: transparent; font-family: inherit; min-height: 32px; }
    .chip i { font-size: 14px; }
    .chip.active { background: var(--color-background-success); color: var(--color-text-success); border-color: var(--color-border-success); font-weight: 600; }
    .chip:disabled { opacity: 0.5; cursor: default; }
    .muted { font-size: 12px; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 6px; }
    .muted i { font-size: 14px; }
    .muted .ok { color: var(--color-text-success); }
    .muted.err { color: var(--color-text-danger); }
    .badge { font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; }
    .badge i { font-size: 14px; }
    .badge.ok { background: var(--color-background-success); color: var(--color-text-success); }
    .badge.warn { background: var(--color-background-warning); color: var(--color-text-warning); }
    .badge.prov { background: var(--color-background-info); color: var(--color-text-info); }
  `,
})
export class MatchCard {
  readonly match = input.required<Match>();
  readonly state = input.required<MatchRowState>();
  readonly jokerEnabled = input(false);
  readonly rules = input<ScoringRules | null>(null);

  readonly homeChange = output<number>();
  readonly awayChange = output<number>();
  readonly jokerToggle = output<void>();

  private readonly now = Date.now();

  readonly mState = computed<'open' | 'locked' | 'live' | 'finished'>(() => {
    const m = this.match();
    if (m.status === 'finished') return 'finished';
    if (m.status === 'live') return 'live';
    const locks = m.locks_at ? new Date(m.locks_at).getTime() : 0;
    return locks > this.now ? 'open' : 'locked';
  });

  readonly hasPrediction = computed(() => this.state().home !== null && this.state().away !== null);

  /** Puntos provisionales con el marcador en vivo. */
  readonly provisional = computed(() => {
    const r = this.rules();
    const s = this.state();
    const m = this.match();
    if (this.mState() !== 'live' || s.home === null || s.away === null || !r) return null;
    return computePoints(s.home, s.away, m.home_score_live, m.away_score_live, r, m.is_knockout, s.isJoker);
  });

  readonly closingSoon = computed(() => {
    const m = this.match();
    if (!m.locks_at) return false;
    const ms = new Date(m.locks_at).getTime() - this.now;
    return ms > 0 && ms < 6 * 3600 * 1000;
  });

  readonly timeLabel = computed(() => formatKickoff(this.match().kickoff_at));
  readonly closeLabel = computed(() =>
    this.match().locks_at ? formatCountdown(new Date(this.match().locks_at!).getTime() - this.now) : 'Abierto',
  );

  readonly leftScore = computed(() => this.sideScore('home'));
  readonly rightScore = computed(() => this.sideScore('away'));

  private sideScore(side: 'home' | 'away'): string {
    const m = this.match();
    const st = this.mState();
    if (st === 'live') return String((side === 'home' ? m.home_score_live : m.away_score_live) ?? 0);
    if (st === 'finished') return String((side === 'home' ? m.home_score : m.away_score) ?? 0);
    // locked: muestro mi pronóstico
    const pred = side === 'home' ? this.state().home : this.state().away;
    return pred === null ? '–' : String(pred);
  }
}
