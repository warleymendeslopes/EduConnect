-- Dicas rapidas em conteudo (type dica; post estilo Instagram com midia).
-- Aplicar apos scripts/012_content_simulados.sql

alter table public.content_items drop constraint if exists content_items_type_check;
alter table public.content_items
  add constraint content_items_type_check check (type in ('article', 'exercise', 'assessment', 'simulado', 'dica'));

create or replace function public.create_dica_draft()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = uid and p.user_type = 'professor'
  ) then
    raise exception 'Apenas professores podem criar dicas';
  end if;

  insert into public.content_items (author_id, type, title, body_html, status, visibility, settings)
  values (uid, 'dica', 'Rascunho (dica)', null, 'draft', 'private', '{}'::jsonb)
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_dica_draft() is
  'Insere rascunho de dica rapida (midia + legenda) como professor; privilegios elevados para INSERT.';

grant execute on function public.create_dica_draft() to authenticated;
