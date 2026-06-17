import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from './models/models';

/**
 * Estado de sesión y perfil basado en signals (la app es zoneless).
 * El perfil lo crea automáticamente el trigger `handle_new_user` en la BD
 * al registrarse; acá solo lo cargamos.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  /** Nombre a mostrar: apodo > display_name > parte local del email. */
  readonly displayName = computed(() => {
    const p = this.profile();
    const u = this.user();
    return p?.nickname || p?.display_name || u?.email?.split('@')[0] || 'Jugador';
  });
  /** Iniciales para el avatar (1–2 letras). */
  readonly initials = computed(() => {
    const parts = this.displayName().trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
    return (first + second).toUpperCase() || 'JU';
  });

  /** Resuelve cuando ya se leyó la sesión inicial (lo usan los guards). */
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();

    // Cambios posteriores (login, logout, refresh de token).
    this.sb.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      if (session?.user) {
        // Diferido: Supabase desaconseja llamar funciones async dentro del callback.
        const uid = session.user.id;
        setTimeout(() => void this.loadProfile(uid), 0);
      } else {
        this.profile.set(null);
      }
    });
  }

  private async init(): Promise<void> {
    const { data } = await this.sb.auth.getSession();
    this.session.set(data.session);
    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }
    this.loading.set(false);
  }

  /** Para los route guards: espera la resolución de la sesión inicial. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  async loadProfile(userId: string): Promise<void> {
    const { data } = await this.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    this.profile.set(data ?? null);
  }

  /** OAuth con Google → vuelve a /auth/callback. */
  signInWithGoogle() {
    return this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  /** Login por email sin contraseña (magic link / OTP). */
  signInWithEmail(email: string) {
    return this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  signOut() {
    return this.sb.auth.signOut();
  }
}
