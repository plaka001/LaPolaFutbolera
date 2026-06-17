-- =====================================================================
-- La Pola Futbolera — Endurecimiento de seguridad (resuelve advisors de Supabase)
-- =====================================================================
-- Contexto: get_advisors(security) marcó funciones SECURITY DEFINER
-- invocables por anon/authenticated vía /rest/v1/rpc, y score_prediction
-- sin search_path fijo. Acá bloqueamos lo que el cliente no debe llamar.
-- (Verificado: revocar EXECUTE NO rompe los helpers usados en políticas RLS,
--  porque la política los corre en el contexto del definer.)

-- 1) search_path fijo en la función de cálculo (no referencia tablas).
alter function public.score_prediction(int,int,int,int,jsonb,boolean,boolean)
  set search_path = '';

-- 2) Triggers internos: nunca se invocan por RPC.
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.set_match_locks_at() from public, anon, authenticated;

-- 3) Helpers de RLS: solo los usan las políticas, no el cliente.
revoke execute on function public.is_polla_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_polla_admin(uuid)  from public, anon, authenticated;
revoke execute on function public.score_prediction(int,int,int,int,jsonb,boolean,boolean)
  from public, anon, authenticated;

-- 4) settle_match: solo backend (Edge Functions / cron con service_role).
revoke execute on function public.settle_match(uuid) from public, anon, authenticated;
grant  execute on function public.settle_match(uuid) to service_role;

-- 5) join_polla: lo invoca el usuario autenticado al unirse por link.
--    (Sigue siendo SECURITY DEFINER a propósito: necesita resolver la polla
--     por invite_code saltándose la RLS de pollas. El advisor lo seguirá
--     listando para authenticated, y es intencional.)
revoke execute on function public.join_polla(text) from public, anon;
grant  execute on function public.join_polla(text) to authenticated;
