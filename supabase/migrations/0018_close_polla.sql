-- La Pola Futbolera — cierre de polla + reparto del pozo.
-- El admin cierra la polla (status='finished') y se notifica a los ganadores según
-- prize_distribution (winner = 100% al 1°; top3 = 60/30/10). No mueve plata real:
-- el monto es informativo. El trigger notifications_push (0012) manda el push.
create or replace function close_polla(p_polla uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v pollas;
  v_pot numeric;
  v_pcts int[];
begin
  select * into v from pollas where id = p_polla;
  if v.id is null then raise exception 'La polla no existe'; end if;
  if v.created_by <> auth.uid() then raise exception 'Solo el admin puede cerrar la polla'; end if;
  if v.status = 'finished' then return; end if;

  update pollas set status = 'finished' where id = p_polla;

  select coalesce(sum(case when paid then coalesce(paid_amount, v.entry_fee) else 0 end), 0)
    into v_pot from polla_members where polla_id = p_polla;

  v_pcts := case when v.prize_distribution = 'top3' then array[60,30,10] else array[100] end;

  insert into notifications (user_id, type, title, body, data)
  with rank as (
    select m.user_id,
           row_number() over (
             order by coalesce(sum(p.points),0) desc,
               count(*) filter (where p.points is not null and p.home_pred=mt.home_score and p.away_pred=mt.away_score) desc,
               count(*) filter (where p.points is not null and sign(p.home_pred-p.away_pred)=sign(mt.home_score-mt.away_score)) desc
           ) as pos
    from polla_members m
    left join predictions p on p.polla_id = m.polla_id and p.user_id = m.user_id
    left join matches mt on mt.id = p.match_id
    where m.polla_id = p_polla
    group by m.user_id
  )
  select r.user_id, 'winner',
         case r.pos when 1 then '🏆 ¡Ganaste la polla!' when 2 then '🥈 ¡Quedaste 2°!' else '🥉 ¡Quedaste 3°!' end,
         case
           when v.prize_type = 'pozo' then 'En "'||v.name||'" te llevás $'||replace(to_char(round(v_pot * v_pcts[r.pos] / 100.0), 'FM999,999,999'), ',', '.')
           when v.prize_type = 'fijo' then 'En "'||v.name||'" ganás: '||coalesce(v.fixed_prize, 'el premio')
           else 'Terminaste '||r.pos||'° en "'||v.name||'". ¡Crack! 🌶️'
         end,
         jsonb_build_object('polla_id', p_polla, 'position', r.pos)
  from rank r
  where r.pos <= array_length(v_pcts, 1)
    and (v.prize_type <> 'fijo' or r.pos = 1);
end;
$$;

revoke execute on function public.close_polla(uuid) from public, anon;
grant  execute on function public.close_polla(uuid) to authenticated;
