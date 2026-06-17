-- La Pola Futbolera — Fase 4: bucket de Storage para los QR de pago.
-- Público (la imagen del QR no es secreta; se comparte para pagar). Sube cualquier
-- autenticado; el admin es el único que puede pegar la URL en la polla (RLS de pollas).
insert into storage.buckets (id, name, public) values ('qr', 'qr', true)
on conflict (id) do nothing;

create policy "qr_read"   on storage.objects for select
  using (bucket_id = 'qr');
create policy "qr_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'qr');
create policy "qr_update" on storage.objects for update to authenticated
  using (bucket_id = 'qr') with check (bucket_id = 'qr');
