import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PollaContextService } from '../../core/polla-context.service';
import { PredictionService, MatchPrediction } from '../../core/prediction.service';
import { Match } from '../../core/models/models';
import { TeamBadge } from '../../shared/team-badge/team-badge';
import { Avatar } from '../../shared/avatar/avatar';

/** Pronósticos de todos los participantes en un partido (revelados tras el cierre). */
@Component({
  selector: 'app-match-preds',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TeamBadge, Avatar],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/partidos" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>Pronósticos</h1>
      </header>

      <main class="content">
        @if (loading()) {
          <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando…</div>
        } @else if (!match()) {
          <div class="state err"><i class="ti ti-alert-triangle"></i> No se encontró el partido.</div>
        } @else {
          <div class="lp-card scoreline">
            <app-team-badge [name]="match()!.home_team" [logo]="match()!.home_logo" />
            <div class="sc">
              <span class="tnum">{{ scoreText() }}</span>
              <span class="st">{{ statusText() }}</span>
            </div>
            <app-team-badge [name]="match()!.away_team" [logo]="match()!.away_logo" />
          </div>

          @if (locked()) {
            @for (p of preds(); track p.id) {
              <div class="prow lp-card" [class.me]="isMe(p)">
                <app-avatar class="av" [url]="p.profile?.avatar_url ?? null" [name]="name(p)" />
                <div class="info">
                  <span class="nm">{{ name(p) }}</span>
                  @if (isMe(p)) { <span class="tag you">Vos</span> }
                  @if (p.is_joker) { <span class="tag jk"><i class="ti ti-bolt"></i> x2</span> }
                </div>
                <div class="pred tnum">{{ p.home_pred }}-{{ p.away_pred }}</div>
                @if (p.points !== null) {
                  <span class="pts" [class.zero]="p.points === 0">+{{ p.points }}</span>
                }
              </div>
            } @empty {
              <div class="state">Nadie pronosticó este partido.</div>
            }
          } @else {
            <div class="lp-card lockcard">
              <i class="ti ti-lock"></i>
              <p>Los pronósticos de los demás se revelan cuando <b>cierra el partido</b> (10 min antes del inicio). Anti-copia 😉</p>
            </div>
          }
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
    .content { padding: 8px 14px 24px; display: flex; flex-direction: column; gap: 8px; }
    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 4px; }
    .state.err { color: var(--color-text-danger); }

    .scoreline { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 16px 12px; margin-bottom: 6px; }
    .sc { display: flex; flex-direction: column; align-items: center; }
    .sc .tnum { font-size: 26px; font-weight: 700; color: var(--color-text-primary); }
    .sc .st { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }

    .prow { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
    .prow.me { border-color: var(--color-border-info); background: var(--color-background-info); }
    .av { width: 32px; height: 32px; --av-fs: 11px; }
    .info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .nm { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); }
    .tag { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; display: inline-flex; align-items: center; gap: 2px; }
    .tag.you { background: var(--color-text-info); color: #fff; }
    .tag.jk { background: var(--color-background-warning); color: var(--color-text-warning); }
    .pred { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
    .pts { font-size: 13px; font-weight: 700; color: var(--color-text-success); min-width: 34px; text-align: right; }
    .pts.zero { color: var(--color-text-tertiary); }

    .lockcard { display: flex; gap: 10px; align-items: flex-start; padding: 16px; color: var(--color-text-secondary); font-size: 13px; }
    .lockcard i { font-size: 22px; color: var(--color-text-tertiary); flex-shrink: 0; }
    .lockcard p { margin: 0; }
  `,
})
export class MatchPreds {
  private readonly predSvc = inject(PredictionService);
  private readonly ctx = inject(PollaContextService);
  private readonly auth = inject(AuthService);

  readonly matchId = input.required<string>();
  readonly loading = signal(true);
  readonly match = signal<Match | null>(null);
  readonly preds = signal<MatchPrediction[]>([]);

  readonly locked = computed(() => {
    const m = this.match();
    if (!m) return false;
    if (m.status === 'finished' || m.status === 'live') return true;
    return !!m.locks_at && new Date(m.locks_at).getTime() <= Date.now();
  });

  constructor() {
    let loadedFor = '';
    effect(() => {
      const id = this.matchId();
      if (id && id !== loadedFor) {
        loadedFor = id;
        void this.load(id);
      }
    });
  }

  private async load(matchId: string) {
    this.loading.set(true);
    const pid = this.ctx.activePollaId();
    try {
      const [m, ps] = await Promise.all([
        this.predSvc.getMatch(matchId),
        pid ? this.predSvc.matchPredictions(pid, matchId) : Promise.resolve([]),
      ]);
      this.match.set(m);
      this.preds.set(ps);
    } catch {
      this.match.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  scoreText(): string {
    const m = this.match();
    if (!m) return '–';
    if (m.status === 'finished') return `${m.home_score ?? 0} - ${m.away_score ?? 0}`;
    if (m.status === 'live') return `${m.home_score_live ?? 0} - ${m.away_score_live ?? 0}`;
    return 'vs';
  }

  statusText(): string {
    const m = this.match();
    if (!m) return '';
    if (m.status === 'finished') return 'Final';
    if (m.status === 'live') return 'En vivo · ' + (m.elapsed ?? 0) + "'";
    return new Date(m.kickoff_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
  }

  name(p: MatchPrediction): string {
    return p.profile?.nickname || p.profile?.display_name || 'Jugador';
  }
  isMe(p: MatchPrediction): boolean {
    return p.user_id === this.auth.user()?.id;
  }
}
