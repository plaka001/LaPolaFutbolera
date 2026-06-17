import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/** Suscripción a Web Push (VAPID) vía el service worker de Angular.
 *  Solo funciona con el SW activo = build de producción/desplegado (no en `ng serve`). */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly sw = inject(SwPush);
  private readonly sb = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** El SW solo está habilitado en producción. */
  get available(): boolean {
    return this.sw.isEnabled;
  }

  readonly subscribed = signal(false);

  /** Pide permiso, se suscribe y guarda la subscription. */
  async enable(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.sw.isEnabled) {
      return { ok: false, reason: 'Las notificaciones se activan en la app instalada/desplegada (no en el server de desarrollo).' };
    }
    const uid = this.auth.user()?.id;
    if (!uid) return { ok: false, reason: 'Iniciá sesión primero.' };
    try {
      const sub = await this.sw.requestSubscription({ serverPublicKey: environment.vapidPublicKey });
      const keys = sub.toJSON().keys ?? {};
      const { error } = await this.sb.client.from('push_subscriptions').upsert(
        {
          user_id: uid,
          endpoint: sub.endpoint,
          p256dh: keys['p256dh'] ?? '',
          auth: keys['auth'] ?? '',
        },
        { onConflict: 'user_id,endpoint' },
      );
      if (error) return { ok: false, reason: error.message };
      this.subscribed.set(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e as Error)?.message ?? 'No se pudo activar (¿rechazaste el permiso?).' };
    }
  }
}
