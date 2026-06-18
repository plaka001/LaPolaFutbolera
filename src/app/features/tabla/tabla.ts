import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PollaContextService } from '../../core/polla-context.service';
import { PollaService, PollaCard } from '../../core/polla.service';
import { SupabaseService } from '../../core/supabase.service';

type Standing = {
  user_id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  points: number;
  exacts: number;
  results: number;
  played: number;
};

/** Tabla de posiciones de la polla activa. */
@Component({
  selector: 'app-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (!ctx.activePollaId()) {
      <section class="px-4 pt-3">
        <div class="lp-card pitch-bg empty">
          <span class="ball"><i class="ti ti-list-numbers"></i></span>
          <p class="t">Elegí una polla para ver la tabla</p>
          <a class="lp-btn lp-btn-primary" routerLink="/pollas"><i class="ti ti-trophy"></i> Mis pollas</a>
        </div>
      </section>
    } @else if (loading()) {
      <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando tabla…</div>
    } @else if (error()) {
      <div class="state err"><i class="ti ti-alert-triangle"></i> {{ error() }}</div>
    } @else {
      <header class="phead">
        <h1>Tabla</h1>
        <p class="sub">{{ polla()?.name }} · {{ rows().length }} {{ rows().length === 1 ? 'jugador' : 'jugadores' }}</p>
      </header>

      <section class="list">
        @for (s of rows(); track s.user_id; let i = $index) {
          <div class="row" [class.me]="isMe(s)">
            <span class="rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
              @if (i === 0) { <i class="ti ti-crown"></i> } @else { {{ i + 1 }} }
            </span>
            <div class="av">{{ initials(name(s)) }}</div>
            <div class="info">
              <div class="nm">{{ name(s) }} @if (isMe(s)) { <span class="you">Vos</span> }</div>
              <div class="rsub">{{ s.played }} jugados · {{ s.exacts }} exactos</div>
            </div>
            <div class="pts"><span class="tnum">{{ s.points }}</span><span class="lbl">pts</span></div>
          </div>
        } @empty {
          <div class="state">Todavía no hay jugadores.</div>
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

    .phead { padding: 14px 14px 4px; }
    .phead h1 { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin: 0; }
    .phead .sub { font-size: 12.5px; color: var(--color-text-secondary); margin: 2px 0 0; }

    .list { padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 6px; }
    .row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: var(--border-radius-md); background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); }
    .row.me { background: var(--color-background-info); border-color: var(--color-border-info); }
    .rank { width: 22px; text-align: center; font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--color-text-secondary); }
    .rank i { font-size: 16px; }
    .rank.gold { color: var(--color-text-warning); }
    .rank.silver { color: var(--color-text-tertiary); }
    .rank.bronze { color: #b3702a; }
    .av { width: 34px; height: 34px; border-radius: 50%; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-secondary); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--color-text-primary); flex-shrink: 0; }
    .info { flex: 1; min-width: 0; }
    .nm { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; }
    .you { font-size: 10px; font-weight: 600; background: var(--color-text-info); color: #fff; padding: 1px 6px; border-radius: 999px; }
    .rsub { font-size: 11px; color: var(--color-text-secondary); }
    .pts { text-align: right; display: flex; flex-direction: column; line-height: 1; }
    .pts .tnum { font-size: 17px; font-weight: 700; color: var(--color-text-primary); }
    .pts .lbl { font-size: 10px; color: var(--color-text-tertiary); }
  `,
})
export class Tabla {
  protected readonly ctx = inject(PollaContextService);
  private readonly pollas = inject(PollaService);
  private readonly auth = inject(AuthService);
  private readonly sb = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private reloadTimer?: ReturnType<typeof setTimeout>;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly polla = signal<PollaCard | null>(null);
  readonly rows = signal<Standing[]>([]);

  private readonly myId = computed(() => this.auth.user()?.id ?? '');

  constructor() {
    void this.load();
    // Realtime: cuando se liquidan puntos (predictions) o cambia un partido, recargar.
    const ch = this.sb.client
      .channel('tabla-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => this.scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => this.scheduleReload())
      .subscribe();
    this.destroyRef.onDestroy(() => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      void this.sb.client.removeChannel(ch);
    });
  }

  private scheduleReload() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void this.load(), 1500);
  }

  async load() {
    const pid = this.ctx.activePollaId();
    if (!pid) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const [polla, standings] = await Promise.all([
        this.pollas.getPolla(pid),
        this.pollas.standings(pid),
      ]);
      this.polla.set(polla);
      this.rows.set(standings as Standing[]);
      this.error.set(null);
    } catch {
      this.error.set('No pudimos cargar la tabla.');
    } finally {
      this.loading.set(false);
    }
  }

  name(s: Standing): string {
    return s.nickname || s.display_name || 'Jugador';
  }

  isMe(s: Standing): boolean {
    return s.user_id === this.myId();
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
    return (a + b).toUpperCase() || 'JU';
  }
}
