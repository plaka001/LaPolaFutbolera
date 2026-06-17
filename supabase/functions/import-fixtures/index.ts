// La Pola Futbolera — Edge Function: import-fixtures (football-data.org v4)
// Trae partidos de una competición y hace upsert en `matches`. Token en el secret
// FOOTBALL_DATA_TOKEN (prueba varios nombres). Escribe con service role.
//
// Invocar (POST): { "competition_id": "<uuid>" }  // o sin body = todas las soportadas
import { createClient } from 'npm:@supabase/supabase-js@2';

const FD_BASE = 'https://api.football-data.org/v4';

// Nuestro competitions.api_league_id -> código de competición de football-data.org.
// (free: WC=Mundial, CL=Champions, PL/PD/SA/BL1/FL1/BSA/... ligas top. Libertadores y
//  Liga BetPlay NO están en football-data.org.)
const FD_CODE: Record<number, string | undefined> = {
  1: 'WC', // Copa Mundial FIFA
  2: 'CL', // UEFA Champions League
};

function getToken(): string | undefined {
  const names = [
    'FOOTBALL_DATA_TOKEN', 'FOOTBALL_DATA_API_KEY', 'FOOTBALL_DATA_KEY',
    'FOOTBALL_DATA_ORG_TOKEN', 'FOOTBALLDATA_TOKEN', 'FOOTBALL_DATA',
    'FOOTBALL_DATA_ORG', 'FD_TOKEN', 'FD_API_KEY', 'API_FOOTBALL_KEY',
    'FOOTBALL_API_KEY',
  ];
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return undefined;
}

function mapStatus(s: string): string {
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'live';
  if (s === 'FINISHED') return 'finished';
  if (s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED') return 'postponed';
  return 'scheduled'; // SCHEDULED, TIMED
}

const KO_STAGES = ['LAST_16', 'LAST_32', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL', 'THIRD_PLACE', 'PLAYOFFS'];

function stageEs(s: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'Fase de grupos',
    LEAGUE_STAGE: 'Liga',
    LAST_32: 'Dieciseisavos',
    LAST_16: 'Octavos',
    QUARTER_FINALS: 'Cuartos',
    SEMI_FINALS: 'Semifinal',
    FINAL: 'Final',
    THIRD_PLACE: '3er puesto',
  };
  return map[s] ?? s ?? 'Fecha';
}

function roundLabel(m: any): string {
  const groupish = m.stage === 'GROUP_STAGE' || m.stage === 'LEAGUE_STAGE' || m.stage === 'REGULAR_SEASON';
  if (groupish && m.matchday) return `Fecha ${m.matchday}`;
  if (m.group) return m.group;
  return stageEs(m.stage);
}

function mapMatch(m: any, competitionId: string) {
  const status = mapStatus(m.status);
  const ft = m.score?.fullTime ?? { home: null, away: null };
  return {
    api_fixture_id: m.id,
    competition_id: competitionId,
    round: roundLabel(m),
    is_knockout: KO_STAGES.includes(m.stage),
    home_team: m.homeTeam?.name ?? m.homeTeam?.shortName ?? '?',
    away_team: m.awayTeam?.name ?? m.awayTeam?.shortName ?? '?',
    home_logo: m.homeTeam?.crest ?? null,
    away_logo: m.awayTeam?.crest ?? null,
    kickoff_at: m.utcDate,
    status,
    home_score: status === 'finished' ? ft.home : null,
    away_score: status === 'finished' ? ft.away : null,
    home_score_live: status === 'live' ? ft.home : null,
    away_score_live: status === 'live' ? ft.away : null,
    elapsed: status === 'live' ? (m.minute ?? null) : null,
    updated_at: new Date().toISOString(),
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  try {
    const token = getToken();
    if (!token) {
      return json({ error: 'Falta el token de football-data.org. Nombrá el secret FOOTBALL_DATA_TOKEN.' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const q = supabase.from('competitions').select('*');
    const { data: comps, error: compErr } = body?.competition_id ? await q.eq('id', body.competition_id) : await q;
    if (compErr) throw compErr;

    const results: unknown[] = [];
    for (const c of comps ?? []) {
      const code = FD_CODE[c.api_league_id as number];
      if (!code) {
        results.push({ competition: c.name, skipped: 'no está en football-data.org' });
        continue;
      }
      const res = await fetch(`${FD_BASE}/competitions/${code}/matches`, {
        headers: { 'X-Auth-Token': token },
      });
      const payload = await res.json();
      const fdMatches: any[] = payload.matches ?? [];
      const rows = fdMatches.map((m) => mapMatch(m, c.id));
      if (rows.length) {
        const { error } = await supabase.from('matches').upsert(rows, { onConflict: 'api_fixture_id' });
        if (error) throw error;
      }
      results.push({
        competition: c.name,
        code,
        fixtures: rows.length,
        httpStatus: res.status,
        apiMessage: payload.message ?? payload.error ?? null,
      });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
