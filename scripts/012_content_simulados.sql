-- Simulados em conteudo (type simulado; mesmas entregas que exercicio/avaliacao).
-- Aplicar apos scripts/011_content_assessments.sql

alter table public.content_items drop constraint if exists content_items_type_check;
alter table public.content_items
  add constraint content_items_type_check check (type in ('article', 'exercise', 'assessment', 'simulado'));

drop policy if exists "ces_insert_student" on public.content_exercise_submissions;

create policy "ces_insert_student"
  on public.content_exercise_submissions for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.type in ('exercise', 'assessment', 'simulado')
        and ci.status = 'published'
        and ci.author_id <> auth.uid()
        and public.user_can_view_content_item(ci.id, auth.uid())
    )
  );

create or replace function public.create_simulado_draft()
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
    raise exception 'Apenas professores podem criar simulados';
  end if;

  insert into public.content_items (author_id, type, title, body_html, status, visibility, settings)
  values (uid, 'simulado', 'Rascunho (simulado)', null, 'draft', 'private', '{}'::jsonb)
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_simulado_draft() is
  'Insere rascunho de simulado (prova multidisciplinar com prazo) como professor; privilegios elevados para INSERT.';

grant execute on function public.create_simulado_draft() to authenticated;
