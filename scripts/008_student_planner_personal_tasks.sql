-- Tarefas pessoais do plano de estudos (aluno) — EduConnect
-- Ordem: aplicar após scripts/001_create_profiles.sql

create table if not exists public.student_planner_personal_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  scheduled_on date not null,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_planner_personal_student_date
  on public.student_planner_personal_tasks (student_id, scheduled_on);

alter table public.student_planner_personal_tasks enable row level security;

create policy "planner_personal_select_own"
  on public.student_planner_personal_tasks for select
  using (student_id = auth.uid());

create policy "planner_personal_insert_own"
  on public.student_planner_personal_tasks for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'aluno'
    )
  );

create policy "planner_personal_update_own"
  on public.student_planner_personal_tasks for update
  using (student_id = auth.uid());

create policy "planner_personal_delete_own"
  on public.student_planner_personal_tasks for delete
  using (student_id = auth.uid());

drop trigger if exists handle_student_planner_personal_tasks_updated_at
  on public.student_planner_personal_tasks;

create trigger handle_student_planner_personal_tasks_updated_at
  before update on public.student_planner_personal_tasks
  for each row execute function public.handle_updated_at();

comment on table public.student_planner_personal_tasks is
  'Tarefas criadas pelo aluno no plano de estudos; independente de classroom_activities.';
