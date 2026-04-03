-- Atividades por sala (EduConnect)
-- Aplicar apos scripts/002_classrooms.sql (precisa de is_classroom_professor / is_classroom_member).

create table if not exists public.classroom_activities (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  type text not null
    check (type in ('trabalho', 'prova_objetiva', 'lista_exercicios', 'simulado')),
  title text not null,
  description text,
  starts_at timestamptz,
  due_at timestamptz,
  max_score numeric,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'aberta', 'encerrada')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_classroom_activities_classroom_due
  on public.classroom_activities (classroom_id, due_at desc nulls last);

alter table public.classroom_activities enable row level security;

-- Professor: ver e gerir todas as atividades das suas salas
create policy "classroom_activities_select_professor"
  on public.classroom_activities for select
  using (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_activities_insert_professor"
  on public.classroom_activities for insert
  with check (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_activities_update_professor"
  on public.classroom_activities for update
  using (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_activities_delete_professor"
  on public.classroom_activities for delete
  using (public.is_classroom_professor(classroom_id, auth.uid()));

-- Aluno: apenas atividades publicadas (nao rascunho) da sala em que esta matriculado
create policy "classroom_activities_select_student"
  on public.classroom_activities for select
  using (
    public.is_classroom_member(classroom_id, auth.uid())
    and status <> 'rascunho'
  );

drop trigger if exists handle_classroom_activities_updated_at on public.classroom_activities;

create trigger handle_classroom_activities_updated_at
  before update on public.classroom_activities
  for each row execute function public.handle_updated_at();
