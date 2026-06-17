import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Match, Prediction } from './models/models';

/** Carga de partidos y gestión de pronósticos (autosave + comodín). */
@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly sb = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Partidos de una competición, ordenados por fecha de inicio. */
  async matches(competitionId: string): Promise<Match[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*')
      .eq('competition_id', competitionId)
      .order('kickoff_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  /** Mis pronósticos en una polla. */
  async myPredictions(pollaId: string): Promise<Prediction[]> {
    const uid = this.auth.user()?.id;
    if (!uid) return [];
    const { data, error } = await this.sb
      .from('predictions')
      .select('*')
      .eq('polla_id', pollaId)
      .eq('user_id', uid);
    if (error) throw error;
    return data ?? [];
  }

  /** Crea/actualiza mi pronóstico de un partido (la RLS bloquea tras el cierre). */
  async save(pollaId: string, matchId: string, home: number, away: number): Promise<Prediction> {
    const uid = this.auth.user()?.id;
    if (!uid) throw new Error('No hay sesión activa.');
    const { data, error } = await this.sb.client
      .from('predictions')
      .upsert(
        {
          polla_id: pollaId,
          match_id: matchId,
          user_id: uid,
          home_pred: home,
          away_pred: away,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'polla_id,match_id,user_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /** Comodín: máximo 1 por fecha. Marca este y desmarca los demás de la fecha. */
  async setJoker(pollaId: string, matchId: string, roundMatchIds: string[]): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) throw new Error('No hay sesión activa.');
    const others = roundMatchIds.filter((id) => id !== matchId);
    if (others.length) {
      const { error } = await this.sb.client
        .from('predictions')
        .update({ is_joker: false })
        .eq('polla_id', pollaId)
        .eq('user_id', uid)
        .in('match_id', others);
      if (error) throw error;
    }
    const { error: e2 } = await this.sb.client
      .from('predictions')
      .update({ is_joker: true })
      .eq('polla_id', pollaId)
      .eq('user_id', uid)
      .eq('match_id', matchId);
    if (e2) throw e2;
  }

  /** Quita el comodín de un partido. */
  async clearJoker(pollaId: string, matchId: string): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) return;
    const { error } = await this.sb.client
      .from('predictions')
      .update({ is_joker: false })
      .eq('polla_id', pollaId)
      .eq('user_id', uid)
      .eq('match_id', matchId);
    if (error) throw error;
  }
}
