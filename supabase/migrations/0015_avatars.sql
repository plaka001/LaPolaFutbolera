-- La Pola Futbolera — Fase 6: foto de perfil.
-- 1) handle_new_user ahora copia la foto que trae Google (avatar_url / picture).
-- 2) Backfill de los perfiles ya creados (su foto está en auth.users.raw_user_meta_data).
-- 3) Bucket `avatars` público; cada usuario solo escribe su propio archivo ({uid}.ext).

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$;

update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') is not null;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);
