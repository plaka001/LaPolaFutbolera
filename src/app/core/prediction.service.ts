import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Match, Prediction } from './models/models';

/** Pronóstico de un participante (para la vista de "ver pronósticos" tras el cierre). */
export interface MatchPrediction {
  id: string;
  user_id: string;
  home_pred: number;
  away_pred: number;
  is_joker: boolean;
  points: number | null;
  profile: { display_name: string | null; nickname: string | null; avatar_url: string | null } | null;
}

/** Fila de historial: un pronóstico ya puntuado + datos del partido (para stats). */
export interface HistRow {
  user_id: string;
  name: string;
  avatar: string | null;
  points: number;
  is_joker: boolean;
  home_pred: number;
  away_pred: number;
  match_id: string;
  kickoff_at: string;
  home_score: number;
  away_score: number;
  home_team: string;
  away_team: string;
}

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

  /** Un partido por id. */
  async getMatch(matchId: string): Promise<Match | null> {
    const { data, error } = await this.sb.from('matches').select('*').eq('id', matchId).single();
    if (error) throw error;
    return data;
  }

  /** Pronósticos de todos los participantes en un partido (la RLS solo los revela
   *  tras el cierre; antes del cierre devuelve solo el propio). */
  async matchPredictions(pollaId: string, matchId: string): Promise<MatchPrediction[]> {
    const { data, error } = await this.sb.client
      .from('predictions')
      .select('id, user_id, home_pred, away_pred, is_joker, points, profile:profiles(display_name, nickname, avatar_url)')
      .eq('polla_id', pollaId)
      .eq('match_id', matchId)
      .order('points', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as MatchPrediction[];
  }

  /** Historial puntuado de toda la polla (para salón de la fama, rachas y duelos).
   *  La RLS solo entrega los ajenos de partidos ya cerrados; `points not null` ⟹ liquidado. */
  async pollaHistory(pollaId: string): Promise<HistRow[]> {
    const { data, error } = await this.sb.client
      .from('predictions')
      .select(
        'user_id, points, is_joker, home_pred, away_pred, match_id, ' +
          'profile:profiles(display_name, nickname, avatar_url), ' +
          'match:matches(kickoff_at, home_score, away_score, home_team, away_team)',
      )
      .eq('polla_id', pollaId)
      .not('points', 'is', null);
    if (error) throw error;
    const rows = (data ?? []).map((r: any) => ({
      user_id: r.user_id,
      name: r.profile?.nickname || r.profile?.display_name || 'Jugador',
      avatar: r.profile?.avatar_url ?? null,
      points: r.points ?? 0,
      is_joker: r.is_joker,
      home_pred: r.home_pred,
      away_pred: r.away_pred,
      match_id: r.match_id,
      kickoff_at: r.match?.kickoff_at ?? '',
      home_score: r.match?.home_score ?? 0,
      away_score: r.match?.away_score ?? 0,
      home_team: r.match?.home_team ?? '',
      away_team: r.match?.away_team ?? '',
    })) as HistRow[];
    rows.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    return rows;
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
