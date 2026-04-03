-- Material extra por sala (EduConnect) — nao avaliativo (sem nota / entrega)
-- Aplicar apos scripts/002_classrooms.sql e 003_classroom_activities.sql
-- (precisa de is_classroom_professor / is_classroom_member, handle_updated_at).

create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  title text not null,
  description text,
  external_url text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicado')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_classroom_materials_classroom_created
  on public.classroom_materials (classroom_id, created_at desc);

alter table public.classroom_materials enable row level security;

create policy "classroom_materials_select_professor"
  on public.classroom_materials for select
  using (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_materials_insert_professor"
  on public.classroom_materials for insert
  with check (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_materials_update_professor"
  on public.classroom_materials for update
  using (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_materials_delete_professor"
  on public.classroom_materials for delete
  using (public.is_classroom_professor(classroom_id, auth.uid()));

create policy "classroom_materials_select_student"
  on public.classroom_materials for select
  using (
    public.is_classroom_member(classroom_id, auth.uid())
    and status = 'publicado'
  );

drop trigger if exists handle_classroom_materials_updated_at on public.classroom_materials;

create trigger handle_classroom_materials_updated_at
  before update on public.classroom_materials
  for each row execute function public.handle_updated_at();
