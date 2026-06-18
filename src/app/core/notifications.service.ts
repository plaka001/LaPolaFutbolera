import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AppNotification } from './models/models';

/** Notificaciones in-app (la tabla `notifications`). El push lo dispara la BD. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly sb = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  readonly unread = signal(0);

  async list(): Promise<AppNotification[]> {
    const { data, error } = await this.sb
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  async refreshUnread(): Promise<void> {
    if (!this.auth.user()) {
      this.unread.set(0);
      return;
    }
    const { count } = await this.sb.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false);
    this.unread.set(count ?? 0);
  }

  async markAllRead(): Promise<void> {
    if (!this.auth.user()) return;
    await this.sb.from('notifications').update({ read: true }).eq('read', false);
    this.unread.set(0);
  }
}
