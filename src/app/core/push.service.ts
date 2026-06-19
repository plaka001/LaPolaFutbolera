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

    // Permiso ya bloqueado: requestSubscription fallaría con "permission denied"
    // sin poder revertirlo desde acá; hay que reactivarlo en la config del sitio.
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return {
        ok: false,
        reason: 'Las notificaciones están bloqueadas. Activalas en Chrome: tocá el candado (o ⋮) → Configuración del sitio → Notificaciones → Permitir, y volvé a intentar.',
      };
    }

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
      return { ok: false, reason: this.explain(e) };
    }
  }

  /** Traduce los errores crípticos del navegador en algo accionable. */
  private explain(e: unknown): string {
    const msg = (e as Error)?.message ?? '';
    if (/permission|denied|NotAllowed/i.test(msg)) {
      return 'Rechazaste el permiso o está bloqueado. Activá las notificaciones para este sitio en Chrome (candado/⋮ → Configuración del sitio → Notificaciones).';
    }
    if (/push service|AbortError|registration failed|Service/i.test(msg)) {
      return 'No se pudo registrar. Si abriste el link desde WhatsApp/Instagram, abrilo en Chrome (⋮ → Abrir en Chrome) o instalá la app (⋮ → Agregar a pantalla de inicio) y reintentá.';
    }
    return msg || 'No se pudo activar.';
  }
}
