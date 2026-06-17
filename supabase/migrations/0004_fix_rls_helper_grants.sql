-- La Pola Futbolera — Fix crítico de RLS.
-- Las políticas de pollas/polla_members/predictions/round_standings llaman a
-- is_polla_member()/is_polla_admin(). En 0002 les revocamos EXECUTE a
-- `authenticated` por un advisor, pero eso rompe la evaluación de esas policies
-- (PostgREST devuelve 403 al leer/insertar pollas). Se re-otorga: son helpers
-- SECURITY DEFINER usados POR la RLS y el rol authenticated debe poder ejecutarlos.
-- (El advisor los listará como "ejecutables por authenticated"; es intencional,
--  igual que join_polla/polla_preview.)
grant execute on function public.is_polla_member(uuid) to authenticated;
grant execute on function public.is_polla_admin(uuid)  to authenticated;
