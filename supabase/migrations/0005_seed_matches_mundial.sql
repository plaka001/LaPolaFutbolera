-- La Pola Futbolera — Fase 2 (dev): partidos de prueba para Copa Mundial 2026.
-- Mientras no esté la Edge Function import-fixtures con la API key, esto da datos
-- reales para construir/probar la pantalla de Partidos. Kickoffs relativos a now()
-- para tener estados variados (abiertos, cierra pronto, en vivo, finalizado).
-- locks_at lo setea el trigger (kickoff - 10 min).
with comp as (
  select id from competitions where api_league_id = 1 and season = 2026
)
insert into matches
  (competition_id, round, is_knockout, home_team, away_team, kickoff_at, status,
   home_score, away_score, home_score_live, away_score_live, elapsed)
select c.id, v.round, false, v.home, v.away, v.kickoff, v.status::match_status,
       v.hs, v.asc_, v.hsl, v.asl, v.elapsed
from comp c, (values
  ('Fecha 1','Colombia','Brasil',          now() + interval '3 hours',                    'scheduled', null::int, null::int, null::int, null::int, null::int),
  ('Fecha 1','Argentina','Francia',        now() + interval '5 hours',                    'scheduled', null, null, null, null, null),
  ('Fecha 1','Alemania','Japón',           now() - interval '40 minutes',                 'live',      null, null, 1, 1, 58),
  ('Fecha 1','España','Portugal',          now() - interval '3 hours',                    'finished',  1, 2, null, null, null),
  ('Fecha 2','México','Catar',             now() + interval '1 day',                      'scheduled', null, null, null, null, null),
  ('Fecha 2','Inglaterra','Estados Unidos',now() + interval '1 day' + interval '2 hours', 'scheduled', null, null, null, null, null),
  ('Fecha 2','Uruguay','Ghana',            now() + interval '2 days',                     'scheduled', null, null, null, null, null),
  ('Fecha 2','Países Bajos','Croacia',     now() + interval '2 days' + interval '2 hours','scheduled', null, null, null, null, null)
) as v(round, home, away, kickoff, status, hs, asc_, hsl, asl, elapsed);
