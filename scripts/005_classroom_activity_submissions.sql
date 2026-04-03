-- Entregas de atividades com prova (questoes em settings.exam — ver app)
-- Aplicar apos scripts/003_classroom_activities.sql

create table if not exists public.classroom_activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.classroom_activities(id) on delete cascade,
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
  unique (activity_id, student_id)
);

create index if not exists idx_activity_submissions_activity
  on public.classroom_activity_submissions (activity_id);

create index if not exists idx_activity_submissions_student
  on public.classroom_activity_submissions (student_id);

alter table public.classroom_activity_submissions enable row level security;

-- Leitura: proprio aluno ou professor da sala da atividade
create policy "activity_submissions_select_own_or_professor"
  on public.classroom_activity_submissions for select
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.classroom_activities ca
      where ca.id = activity_id
        and public.is_classroom_professor(ca.classroom_id, auth.uid())
    )
  );

-- Inserir: aluno membro da sala da atividade, apenas como proprio student_id
create policy "activity_submissions_insert_student_member"
  on public.classroom_activity_submissions for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.classroom_activities ca
      inner join public.classroom_members cm
        on cm.classroom_id = ca.classroom_id
        and cm.student_id = auth.uid()
      where ca.id = activity_id
    )
  );

-- Atualizar: aluno em rascunho (salvar ou enviar) ou professor (correcao)
create policy "activity_submissions_update_student_draft"
  on public.classroom_activity_submissions for update
  using (student_id = auth.uid() and status = 'rascunho')
  with check (
    student_id = auth.uid()
    and (status = 'rascunho' or status = 'enviado')
  );

-- Correcao apenas apos envio (evita professor alterar rascunho do aluno)
create policy "activity_submissions_update_professor"
  on public.classroom_activity_submissions for update
  using (
    status = 'enviado'
    and exists (
      select 1
      from public.classroom_activities ca
      where ca.id = activity_id
        and public.is_classroom_professor(ca.classroom_id, auth.uid())
    )
  )
  with check (
    status = 'enviado'
    and exists (
      select 1
      from public.classroom_activities ca
      where ca.id = activity_id
        and public.is_classroom_professor(ca.classroom_id, auth.uid())
    )
  );

drop trigger if exists handle_activity_submissions_updated_at on public.classroom_activity_submissions;

create trigger handle_activity_submissions_updated_at
  before update on public.classroom_activity_submissions
  for each row execute function public.handle_updated_at();
