import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../../shared/avatar/avatar';
import { AuthService } from '../../core/auth.service';
import { PollaContextService } from '../../core/polla-context.service';
import { PollaService, PollaCard, PollaMemberRow } from '../../core/polla.service';

type StandingRow = { user_id: string; display_name: string | null; nickname: string | null; avatar_url: string | null; points: number };

/** Pozo, pagos y reparto del pozo de la polla activa. Admin sube QR, marca pagos y cierra. */
@Component({
  selector: 'app-pozo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar],
  template: `
    @if (!ctx.activePollaId()) {
      <section class="px-4 pt-3">
        <div class="lp-card pitch-bg empty">
          <span class="ball"><i class="ti ti-coin"></i></span>
          <p class="t">Elegí una polla para ver el pozo</p>
          <a class="lp-btn lp-btn-primary" routerLink="/pollas"><i class="ti ti-trophy"></i> Mis pollas</a>
        </div>
      </section>
    } @else if (loading()) {
      <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando pozo…</div>
    } @else if (error()) {
      <div class="state err"><i class="ti ti-alert-triangle"></i> {{ error() }}</div>
    } @else if (polla()?.prize_type === 'sin') {
      <section class="px-4 pt-3">
        <div class="lp-card pitch-bg empty">
          <span class="ball"><i class="ti ti-mood-smile"></i></span>
          <p class="t">Esta polla es por el honor</p>
          <p class="s">No hay pozo ni pagos. Solo el pique. 🌶️</p>
        </div>
      </section>
    } @else {
      <header class="phead"><h1>Pozo</h1><p class="sub">{{ polla()?.name }}</p></header>

      <section class="body">
        <!-- resumen -->
        <div class="lp-card sum">
          @if (polla()?.prize_type === 'pozo') {
            <div class="big tnum">&#36;{{ recaudado().toLocaleString('es-CO') }}</div>
            <div class="of">recaudado de &#36;{{ total().toLocaleString('es-CO') }}</div>
            <div class="bar"><span [style.width.%]="pct()"></span></div>
          } @else {
            <div class="big2"><i class="ti ti-trophy"></i> {{ polla()?.fixed_prize || 'Premio fijo' }}</div>
          }
          <div class="counts">
            <span class="ok"><i class="ti ti-check"></i> {{ paidCount() }} {{ polla()?.prize_type === 'pozo' ? 'pagaron' : 'confirmados' }}</span>
            <span class="pend"><i class="ti ti-clock"></i> {{ pendingCount() }} pendientes</span>
          </div>
        </div>

        <!-- reparto del pozo -->
        @if (reparto().length) {
          <div class="lp-card reparto">
            <div class="rhead">
              <span class="rt"><i class="ti ti-coins"></i> {{ isFinished() ? 'Ganadores' : 'Reparto del pozo' }}</span>
              <span class="rtag" [class.fin]="isFinished()">{{ isFinished() ? 'Final' : 'Proyección' }}</span>
            </div>
            @for (r of reparto(); track r.pos) {
              <div class="prow" [class.gold]="r.pos === 1">
                <span class="medal">{{ medal(r.pos) }}</span>
                <app-avatar class="rav" [url]="r.avatar" [name]="r.name" />
                <div class="rinfo">
                  <span class="rn">{{ r.name }}</span>
                  <span class="rp">{{ r.pos }}° puesto · {{ r.pct }}%</span>
                </div>
                <span class="rprize">
                  @if (r.amount !== null) { &#36;{{ r.amount.toLocaleString('es-CO') }} } @else { {{ r.prize }} }
                </span>
              </div>
            }
            @if (!isFinished()) {
              <p class="rnote">Así va el reparto si la polla terminara hoy.</p>
            }
            @if (isAdmin() && !isFinished()) {
              @if (!confirmClose()) {
                <button class="lp-btn lp-btn-ghost closebtn" type="button" (click)="confirmClose.set(true)">
                  <i class="ti ti-flag-checkered"></i> Cerrar polla y premiar
                </button>
              } @else {
                <div class="confirm">
                  <p>¿Seguro? Esto cierra la polla y le avisa a los ganadores. No se puede deshacer.</p>
                  <div class="cbtns">
                    <button class="lp-btn lp-btn-ghost" type="button" (click)="confirmClose.set(false)" [disabled]="closing()">Cancelar</button>
                    <button class="lp-btn lp-btn-primary" type="button" (click)="closePolla()" [disabled]="closing()">
                      @if (closing()) { <i class="ti ti-loader-2 spin"></i> } @else { Sí, cerrar }
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- tu estado (no admin) -->
        @if (!isAdmin() && myMember(); as me) {
          <div class="mystatus" [class.paid]="me.paid">
            @if (me.paid) {
              <i class="ti ti-circle-check"></i> Estás habilitado para jugar.
            } @else {
              <i class="ti ti-alert-triangle"></i> Pagá {{ polla()?.prize_type === 'pozo' ? 'al QR de abajo' : 'tu cupo' }} para poder pronosticar. El admin te habilita.
            }
          </div>
        }

        <!-- QR (solo pozo) -->
        @if (polla()?.prize_type === 'pozo') {
          <div class="lp-card qrcard">
            @if (polla()?.payment_qr_url) {
              <img class="qr" [src]="polla()!.payment_qr_url!" alt="QR de pago" />
            } @else {
              <div class="noqr"><i class="ti ti-qrcode"></i> {{ isAdmin() ? 'Subí el QR de Nequi/Daviplata' : 'El admin todavía no subió el QR' }}</div>
            }
            @if (isAdmin()) {
              <label class="lp-btn lp-btn-ghost qrbtn">
                <i class="ti" [class.ti-upload]="!busy()" [class.ti-loader-2]="busy()" [class.spin]="busy()"></i>
                {{ polla()?.payment_qr_url ? 'Reemplazar QR' : 'Subir QR' }}
                <input type="file" accept="image/*" hidden (change)="onQrFile($event)" />
              </label>
            }
          </div>
        }

        <!-- miembros -->
        <div class="seclab"><i class="ti ti-users"></i> Jugadores</div>
        <div class="members">
          @for (m of members(); track m.id) {
            <div class="mrow" [class.me]="isMe(m)">
              <app-avatar class="av" [url]="m.profile?.avatar_url ?? null" [name]="name(m)" />
              <div class="info">
                <div class="nm">{{ name(m) }} @if (m.role === 'admin') { <span class="adm">admin</span> }</div>
                <div class="msub">{{ m.paid ? (polla()?.prize_type === 'pozo' ? 'Pagó' : 'Confirmado') : 'Pendiente' }}</div>
              </div>
              @if (isAdmin()) {
                <button class="toggle" [class.on]="m.paid" (click)="togglePaid(m)" [attr.aria-pressed]="m.paid">
                  {{ m.paid ? 'Pagó' : 'Marcar' }}
                </button>
              } @else {
                <span class="lp-pill" [class.ok]="m.paid" [class.neutral]="!m.paid">
                  <i class="ti" [class.ti-check]="m.paid" [class.ti-clock]="!m.paid"></i>
                  {{ m.paid ? 'Sí' : 'No' }}
                </span>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .state { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; padding: 24px 18px; }
    .state.err { color: var(--color-text-danger); }
    .empty { padding: 30px 18px; text-align: center; }
    .empty .ball { width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-warning); color: var(--color-text-warning); margin-bottom: 10px; }
    .empty .ball i { font-size: 34px; }
    .empty .t { font-family: var(--font-display); font-weight: 700; font-size: 16px; margin: 0; }
    .empty .s { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 0; }

    .phead { padding: 14px 14px 4px; }
    .phead h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .phead .sub { font-size: 12.5px; color: var(--color-text-secondary); margin: 2px 0 0; }
    .body { padding: 10px 14px 16px; }

    .sum { padding: 18px; text-align: center; margin-bottom: 12px; }
    .big { font-family: var(--font-display); font-size: 32px; font-weight: 700; color: var(--color-text-warning); line-height: 1; }
    .big2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--color-text-warning); display: flex; align-items: center; justify-content: center; gap: 8px; }
    .of { font-size: 12.5px; color: var(--color-text-secondary); margin-top: 4px; }
    .bar { height: 7px; border-radius: 999px; background: var(--color-background-secondary); margin: 12px 0 4px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--color-text-warning); border-radius: 999px; transition: width 300ms cubic-bezier(0,0,0.2,1); }
    .counts { display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 12.5px; }
    .counts .ok { color: var(--color-text-success); }
    .counts .pend { color: var(--color-text-secondary); }
    .counts i { font-size: 14px; }

    .reparto { padding: 14px; margin-bottom: 12px; }
    .rhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .rt { font-family: var(--font-display); font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 7px; }
    .rt i { color: var(--color-text-warning); font-size: 18px; }
    .rtag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--color-background-info); color: var(--color-text-info); }
    .rtag.fin { background: var(--color-background-success); color: var(--color-text-success); }
    .prow { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 0.5px solid var(--color-border-tertiary); }
    .prow:first-of-type { border-top: 0; }
    .medal { font-size: 20px; width: 24px; text-align: center; flex-shrink: 0; }
    .rav { width: 34px; height: 34px; }
    .rinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .rn { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rp { font-size: 11px; color: var(--color-text-secondary); }
    .rprize { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--color-text-warning); flex-shrink: 0; }
    .rnote { font-size: 11px; color: var(--color-text-tertiary); margin: 8px 0 0; }
    .closebtn { width: 100%; margin-top: 12px; }
    .confirm { margin-top: 12px; padding: 12px; border-radius: var(--border-radius-md); background: var(--color-background-warning); }
    .confirm p { font-size: 12.5px; color: var(--color-text-warning); margin: 0 0 10px; }
    .cbtns { display: flex; gap: 8px; }
    .cbtns .lp-btn { flex: 1; }

    .mystatus { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 11px 12px; border-radius: var(--border-radius-md); margin-bottom: 12px; background: var(--color-background-warning); color: var(--color-text-warning); }
    .mystatus.paid { background: var(--color-background-success); color: var(--color-text-success); }
    .mystatus i { font-size: 18px; }

    .qrcard { padding: 16px; text-align: center; margin-bottom: 14px; }
    .qr { width: 200px; max-width: 80%; aspect-ratio: 1; object-fit: contain; border-radius: var(--border-radius-md); background: #fff; padding: 8px; }
    .noqr { color: var(--color-text-secondary); font-size: 13px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .noqr i { font-size: 34px; }
    .qrbtn { margin-top: 12px; cursor: pointer; }

    .seclab { font-size: 12px; color: var(--color-text-secondary); margin: 4px 2px 8px; display: flex; align-items: center; gap: 6px; }
    .members { display: flex; flex-direction: column; gap: 6px; }
    .mrow { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: var(--border-radius-md); background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); }
    .mrow.me { background: var(--color-background-info); border-color: var(--color-border-info); }
    .av { width: 34px; height: 34px; }
    .info { flex: 1; min-width: 0; }
    .nm { font-size: 13.5px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; }
    .adm { font-size: 10px; font-weight: 600; background: var(--color-background-secondary); color: var(--color-text-secondary); padding: 1px 6px; border-radius: 999px; }
    .msub { font-size: 11px; color: var(--color-text-secondary); }
    .toggle { font-size: 12.5px; font-weight: 600; font-family: inherit; padding: 7px 12px; border-radius: 999px; cursor: pointer; border: 0.5px solid var(--color-border-secondary); background: var(--color-background-primary); color: var(--color-text-secondary); min-height: 34px; }
    .toggle.on { background: var(--color-brand); color: var(--color-brand-contrast); border-color: transparent; }
  `,
})
export class Pozo {
  protected readonly ctx = inject(PollaContextService);
  private readonly pollas = inject(PollaService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly polla = signal<PollaCard | null>(null);
  readonly members = signal<PollaMemberRow[]>([]);
  readonly standings = signal<StandingRow[]>([]);
  readonly closing = signal(false);
  readonly confirmClose = signal(false);

  private readonly myId = computed(() => this.auth.user()?.id ?? '');
  readonly isAdmin = computed(() => this.polla()?.created_by === this.myId());
  readonly myMember = computed(() => this.members().find((m) => m.user_id === this.myId()) ?? null);

  private readonly entryFee = computed(() => Number(this.polla()?.entry_fee ?? 0));
  readonly paidCount = computed(() => this.members().filter((m) => m.paid).length);
  readonly pendingCount = computed(() => this.members().filter((m) => !m.paid).length);
  readonly recaudado = computed(() =>
    this.members().reduce((sum, m) => sum + (m.paid ? Number(m.paid_amount ?? this.entryFee()) : 0), 0),
  );
  readonly total = computed(() => this.members().length * this.entryFee());
  readonly pct = computed(() => {
    const t = this.total();
    return t > 0 ? Math.min(100, Math.round((this.recaudado() / t) * 100)) : 0;
  });
  readonly isFinished = computed(() => this.polla()?.status === 'finished');

  /** Reparto del pozo por puesto (winner = todo al 1°; top3 = 60/30/10). */
  readonly reparto = computed(() => {
    const p = this.polla();
    if (!p || p.prize_type === 'sin') return [];
    const pcts = p.prize_distribution === 'top3' ? [60, 30, 10] : [100];
    const pot = this.recaudado();
    const rows = this.standings();
    return pcts
      .map((pct, i) => {
        const s = rows[i];
        return {
          pos: i + 1,
          name: s ? s.nickname || s.display_name || 'Jugador' : '—',
          avatar: s?.avatar_url ?? null,
          amount: p.prize_type === 'pozo' ? Math.round((pot * pct) / 100) : null,
          prize: p.prize_type === 'fijo' && i === 0 ? p.fixed_prize || 'Premio' : null,
          pct,
        };
      })
      .filter((r) => p.prize_type !== 'fijo' || r.pos === 1);
  });

  constructor() {
    void this.load();
  }

  async load() {
    const pid = this.ctx.activePollaId();
    if (!pid) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const [polla, members, standings] = await Promise.all([
        this.pollas.getPolla(pid),
        this.pollas.members(pid),
        this.pollas.standings(pid),
      ]);
      this.polla.set(polla);
      this.members.set(members);
      this.standings.set(standings as StandingRow[]);
      this.error.set(null);
    } catch {
      this.error.set('No pudimos cargar el pozo.');
    } finally {
      this.loading.set(false);
    }
  }

  name(m: PollaMemberRow): string {
    return m.nickname || m.profile?.nickname || m.profile?.display_name || 'Jugador';
  }

  isMe(m: PollaMemberRow): boolean {
    return m.user_id === this.myId();
  }

  medal(pos: number): string {
    return pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
  }

  async closePolla() {
    const p = this.polla();
    if (!p || !this.isAdmin()) return;
    this.closing.set(true);
    try {
      await this.pollas.closePolla(p.id);
      await this.load();
      this.confirmClose.set(false);
    } catch {
      this.error.set('No se pudo cerrar la polla.');
    } finally {
      this.closing.set(false);
    }
  }

  async togglePaid(m: PollaMemberRow) {
    if (!this.isAdmin()) return;
    const next = !m.paid;
    try {
      await this.pollas.setPaid(m.id, next, this.entryFee() || null);
      this.members.set(this.members().map((x) => (x.id === m.id ? { ...x, paid: next } : x)));
    } catch {
      this.error.set('No se pudo actualizar el pago.');
    }
  }

  async onQrFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.polla()) return;
    this.busy.set(true);
    try {
      await this.pollas.uploadQr(this.polla()!.id, file);
      await this.load();
    } catch {
      this.error.set('No se pudo subir el QR.');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }
}
