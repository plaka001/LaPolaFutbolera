-- La Pola Futbolera — Fase 3 (ops): cron de resultados.
-- Cada 15 min refresca fixtures desde football-data.org llamando a import-fixtures.
-- Cuando un partido pasa a 'finished', el trigger matches_settle_on_finish liquida
-- los puntos automáticamente. Flujo: cron → import-fixtures → matches → trigger → puntos.
-- (anon key = pública; solo pasa verify_jwt. import-fixtures escribe con service role.)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'refresh-fixtures',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://seqcwsszqxmuzcordkgn.supabase.co/functions/v1/import-fixtures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWN3c3N6cXhtdXpjb3Jka2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODY0NzYsImV4cCI6MjA5NzE2MjQ3Nn0.UoF8ELewryaUrpIHlxXAchoffirEhTi0zHTVzWi49WE'
    ),
    body := '{}'::jsonb
  );
  $job$
);
