-- Exercícios em content_items (mesmo settings.exam que atividades de sala) + entregas.
-- Aplicar após scripts/009_content_items.sql

-- Tipo 'exercise' além de 'article'
alter table public.content_items drop constraint if exists content_items_type_check;
alter table public.content_items
  add constraint content_items_type_check check (type in ('article', 'exercise'));

create table if not exists public.content_exercise_submissions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado')),
  answers jsonb not null default '{}'::jsonb,
  score_mcq numeric not null default 0,
  open_scores jsonb not null default '{}'::jsonb,
  score_total numeric,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (content_item_id, student_id)
);

create index if not exists idx_content_exercise_submissions_item
  on public.content_exercise_submissions (content_item_id);

create index if not exists idx_content_exercise_submissions_student
  on public.content_exercise_submissions (student_id);

alter table public.content_exercise_submissions enable row level security;

drop policy if exists "ces_select_own_or_author" on public.content_exercise_submissions;
drop policy if exists "ces_insert_student" on public.content_exercise_submissions;
drop policy if exists "ces_update_student_draft" on public.content_exercise_submissions;
drop policy if exists "ces_update_author_grade" on public.content_exercise_submissions;

-- Leitura: próprio aluno ou autor do content_item (professor)
create policy "ces_select_own_or_author"
  on public.content_exercise_submissions for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.author_id = auth.uid()
    )
  );

-- Inserir: aluno autenticado, não é o autor, exercício publicado e visível
create policy "ces_insert_student"
  on public.content_exercise_submissions for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.type = 'exercise'
        and ci.status = 'published'
        and ci.author_id <> auth.uid()
        and public.user_can_view_content_item(ci.id, auth.uid())
    )
  );

-- Atualizar rascunho: só o aluno, enquanto status rascunho
create policy "ces_update_student_draft"
  on public.content_exercise_submissions for update
  using (student_id = auth.uid() and status = 'rascunho')
  with check (
    student_id = auth.uid()
    and (status = 'rascunho' or status = 'enviado')
  );

-- Correção dissertativa: autor do exercício, só após envio
create policy "ces_update_author_grade"
  on public.content_exercise_submissions for update
  using (
    status = 'enviado'
    and exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.author_id = auth.uid()
    )
  )
  with check (
    status = 'enviado'
    and exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.author_id = auth.uid()
    )
  );

drop trigger if exists tr_content_exercise_submissions_updated_at on public.content_exercise_submissions;

create trigger tr_content_exercise_submissions_updated_at
  before update on public.content_exercise_submissions
  for each row execute function public.handle_updated_at();

-- Rascunho de exercício (INSERT com security definer)
create or replace function public.create_exercise_draft()
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
    raise exception 'Apenas professores podem criar exercicios';
  end if;

  insert into public.content_items (author_id, type, title, body_html, status, visibility, settings)
  values (uid, 'exercise', 'Rascunho (exercicio)', null, 'draft', 'private', '{}'::jsonb)
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_exercise_draft() is
  'Insere rascunho de exercicio (lista de questoes) como professor; privilegios elevados para INSERT.';

grant execute on function public.create_exercise_draft() to authenticated;
