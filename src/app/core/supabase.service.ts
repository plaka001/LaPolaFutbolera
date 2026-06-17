import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from './models/database.types';

/**
 * Punto único de acceso a Supabase (auth, db, realtime, storage).
 * El cliente se tipa con el esquema generado para autocompletado y chequeo.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database> = createClient<Database>(
    environment.supabaseUrl,
    environment.supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    },
  );

  /** Atajo al módulo de auth. */
  get auth() {
    return this.client.auth;
  }

  /** Atajo tipado a una tabla. */
  from<T extends keyof Database['public']['Tables']>(table: T) {
    return this.client.from(table);
  }
}
