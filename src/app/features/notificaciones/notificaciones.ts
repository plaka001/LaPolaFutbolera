import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '../../core/notifications.service';
import { AppNotification } from '../../core/models/models';

/** Lista de notificaciones in-app. Marca todo como leído al abrir. */
@Component({
  selector: 'app-notificaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="appbar">
        <a class="back" routerLink="/pollas" aria-label="Volver"><i class="ti ti-chevron-left"></i></a>
        <h1>Notificaciones</h1>
      </header>

      <main class="content">
        @if (loading()) {
          <div class="state"><i class="ti ti-loader-2 spin"></i> Cargando…</div>
        } @else if (items().length === 0) {
          <div class="lp-card empty">
            <span class="ic"><i class="ti ti-bell"></i></span>
            <p class="t">Sin notificaciones</p>
            <p class="s">Acá te llegan los resultados y el pique cuando termina cada partido.</p>
          </div>
        } @else {
          @for (n of items(); track n.id) {
            <div class="lp-card nrow" [class.unread]="!n.read">
              <span class="ic2" [class.warn]="n.type === 'reminder' || n.type === 'leader'" [class.danger]="n.type === 'overtaken'">
                <i class="ti {{ icon(n.type) }}"></i>
              </span>
              <div class="ninfo">
                <div class="nt">{{ n.title }}</div>
                <div class="nb">{{ n.body }}</div>
                <div class="ntime">{{ when(n.created_at) }}</div>
              </div>
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
    .empty { padding: 30px 18px; text-align: center; }
    .empty .ic { width: 58px; height: 58px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-background-secondary); color: var(--color-text-tertiary); margin-bottom: 8px; }
    .empty .ic i { font-size: 30px; }
    .empty .t { font-family: var(--font-display); font-weight: 700; font-size: 16px; margin: 0; }
    .empty .s { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 0; }
    .nrow { display: flex; gap: 11px; align-items: flex-start; padding: 12px; }
    .nrow.unread { border-color: var(--color-border-success); }
    .ic2 { width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; background: var(--color-background-success); color: var(--color-text-success); display: flex; align-items: center; justify-content: center; }
    .ic2.warn { background: var(--color-background-warning); color: var(--color-text-warning); }
    .ic2.danger { background: var(--color-background-danger); color: var(--color-text-danger); }
    .ic2 i { font-size: 19px; }
    .ninfo { min-width: 0; }
    .nt { font-family: var(--font-display); font-weight: 600; font-size: 14px; color: var(--color-text-primary); }
    .nb { font-size: 13px; color: var(--color-text-secondary); margin-top: 1px; }
    .ntime { font-size: 11px; color: var(--color-text-tertiary); margin-top: 4px; }
  `,
})
export class Notificaciones {
  private readonly notif = inject(NotificationsService);

  readonly loading = signal(true);
  readonly items = signal<AppNotification[]>([]);

  constructor() {
    void this.load();
  }

  private async load() {
    this.loading.set(true);
    try {
      this.items.set(await this.notif.list());
      await this.notif.markAllRead();
    } catch {
      /* ignore */
    } finally {
      this.loading.set(false);
    }
  }

  icon(type: string): string {
    return type === 'reminder'
      ? 'ti-clock-hour-4'
      : type === 'overtaken'
        ? 'ti-trending-down'
        : type === 'leader'
          ? 'ti-crown'
          : 'ti-ball-football';
  }

  when(iso: string): string {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
  }
}
