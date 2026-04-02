-- Salas de aula e matrículas (EduConnect)
-- Aplicar no Supabase SQL Editor ou via supabase db push

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  subject text not null,
  education_level text not null,
  description text,
  invite_code text not null unique,
  max_students int,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_classrooms_professor on public.classrooms (professor_id);
create index if not exists idx_classrooms_invite on public.classrooms (invite_code);

create table if not exists public.classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc'::text, now()),
  unique (classroom_id, student_id)
);

create index if not exists idx_classroom_members_classroom on public.classroom_members (classroom_id);
create index if not exists idx_classroom_members_student on public.classroom_members (student_id);

alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;

-- Professores: CRUD próprias salas
create policy "classrooms_select_own_or_member"
  on public.classrooms for select
  using (
    professor_id = auth.uid()
    or exists (
      select 1 from public.classroom_members m
      where m.classroom_id = classrooms.id and m.student_id = auth.uid()
    )
  );

create policy "classrooms_insert_professor"
  on public.classrooms for insert
  with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'professor'
    )
  );

create policy "classrooms_update_own"
  on public.classrooms for update
  using (professor_id = auth.uid());

create policy "classrooms_delete_own"
  on public.classrooms for delete
  using (professor_id = auth.uid());

-- Membros: leitura para professor da sala ou próprio aluno
create policy "classroom_members_select"
  on public.classroom_members for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.classrooms c
      where c.id = classroom_members.classroom_id and c.professor_id = auth.uid()
    )
  );

-- Sem insert direto por clientes: apenas via função join_classroom_by_invite (security definer)

create policy "classroom_members_delete_professor"
  on public.classroom_members for delete
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.professor_id = auth.uid()
    )
  );

create policy "classroom_members_delete_self"
  on public.classroom_members for delete
  using (student_id = auth.uid());

-- Pré-visualização pública do convite (código) — sem expor dados sensíveis
create or replace function public.get_classroom_by_invite_code(p_code text)
returns table (
  id uuid,
  name text,
  subject text,
  education_level text,
  professor_name text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.subject,
    c.education_level,
    coalesce(p.full_name, '')::text as professor_name,
    c.status::text
  from public.classrooms c
  join public.profiles p on p.id = c.professor_id
  where upper(trim(c.invite_code)) = upper(trim(p_code));
$$;

grant execute on function public.get_classroom_by_invite_code(text) to anon, authenticated;

-- Entrada na sala por código (valida aluno, vaga, sala ativa)
create or replace function public.join_classroom_by_invite(p_invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_classroom_id uuid;
  v_max int;
  v_count int;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not exists (
    select 1 from public.profiles where id = v_uid and user_type = 'aluno'
  ) then
    return json_build_object('ok', false, 'error', 'only_students');
  end if;

  select c.id, c.max_students
    into v_classroom_id, v_max
  from public.classrooms c
  where upper(trim(c.invite_code)) = upper(trim(p_invite_code))
    and c.status = 'ativa';

  if v_classroom_id is null then
    return json_build_object('ok', false, 'error', 'invalid_or_closed');
  end if;

  select count(*)::int into v_count
  from public.classroom_members
  where classroom_id = v_classroom_id;

  if v_max is not null and v_count >= v_max then
    return json_build_object('ok', false, 'error', 'full');
  end if;

  insert into public.classroom_members (classroom_id, student_id)
  values (v_classroom_id, v_uid)
  on conflict (classroom_id, student_id) do nothing;

  return json_build_object('ok', true, 'classroom_id', v_classroom_id);
end;
$$;

grant execute on function public.join_classroom_by_invite(text) to authenticated;
