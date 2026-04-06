-- Conteúdo global (artigos, extensível): visibilidade, engajamento e contagens.
-- Ordem: após scripts/001 e 002 (profiles, classrooms).

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'article' check (type in ('article')),
  title text not null,
  body_html text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  visibility text not null check (visibility in ('public', 'classrooms', 'private')),
  published_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  like_count integer not null default 0 check (like_count >= 0),
  share_count integer not null default 0 check (share_count >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_content_items_author_published
  on public.content_items (author_id, published_at desc nulls last);

create index if not exists idx_content_items_feed
  on public.content_items (status, visibility, published_at desc nulls last)
  where status = 'published';

create table if not exists public.content_item_classrooms (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  primary key (content_item_id, classroom_id)
);

create index if not exists idx_content_item_classrooms_room
  on public.content_item_classrooms (classroom_id);

create table if not exists public.content_reactions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (content_item_id, user_id, reaction_type)
);

create index if not exists idx_content_reactions_item on public.content_reactions (content_item_id);
create index if not exists idx_content_reactions_user on public.content_reactions (user_id);

create table if not exists public.content_share_events (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  share_method text not null check (share_method in ('copy_link', 'native_share')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_content_share_events_item on public.content_share_events (content_item_id);
create index if not exists idx_content_share_events_created on public.content_share_events (created_at desc);

-- Contadores desnormalizados
create or replace function public.content_reactions_adjust_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.reaction_type = 'like' then
    update public.content_items
      set like_count = like_count + 1, updated_at = timezone('utc'::text, now())
      where id = new.content_item_id;
  elsif tg_op = 'DELETE' and old.reaction_type = 'like' then
    update public.content_items
      set like_count = greatest(0, like_count - 1), updated_at = timezone('utc'::text, now())
      where id = old.content_item_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_content_reactions_like_count on public.content_reactions;
create trigger tr_content_reactions_like_count
  after insert or delete on public.content_reactions
  for each row execute function public.content_reactions_adjust_like_count();

create or replace function public.content_share_events_bump_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.content_items
    set share_count = share_count + 1, updated_at = timezone('utc'::text, now())
    where id = new.content_item_id;
  return new;
end;
$$;

drop trigger if exists tr_content_share_events_count on public.content_share_events;
create trigger tr_content_share_events_count
  after insert on public.content_share_events
  for each row execute function public.content_share_events_bump_count();

create or replace function public.handle_content_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists tr_content_items_updated_at on public.content_items;
create trigger tr_content_items_updated_at
  before update on public.content_items
  for each row execute function public.handle_content_items_updated_at();

-- Visibilidade (anon + autenticado)
create or replace function public.user_can_view_content_item(p_content_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v record;
begin
  if not exists (select 1 from public.content_items ci where ci.id = p_content_id) then
    return false;
  end if;

  select ci.id, ci.author_id, ci.status, ci.visibility
  into v
  from public.content_items ci
  where ci.id = p_content_id;

  if v.status <> 'published' then
    return p_user_id is not null and v.author_id = p_user_id;
  end if;

  if v.visibility = 'public' then
    return true;
  end if;

  if v.visibility = 'private' then
    return p_user_id is not null and v.author_id = p_user_id;
  end if;

  if v.visibility = 'classrooms' then
    if p_user_id is null then
      return false;
    end if;
    if v.author_id = p_user_id then
      return true;
    end if;
    return exists (
      select 1
      from public.content_item_classrooms cic
      where cic.content_item_id = p_content_id
        and public.is_classroom_member(cic.classroom_id, p_user_id)
    );
  end if;

  return false;
end;
$$;

comment on function public.user_can_view_content_item(uuid, uuid) is
  'Quem pode ler um content_item; p_user_id null = anon (só público publicado).';

grant execute on function public.user_can_view_content_item(uuid, uuid) to anon;
grant execute on function public.user_can_view_content_item(uuid, uuid) to authenticated;

-- Verificação de professor sem depender de RLS em subconsulta a profiles (evita falha no INSERT).
create or replace function public.is_profile_professor(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.user_type = 'professor'
  );
$$;

comment on function public.is_profile_professor(uuid) is
  'True se o perfil existe e user_type = professor; ignora RLS na leitura de profiles.';

grant execute on function public.is_profile_professor(uuid) to authenticated;

alter table public.content_items enable row level security;
alter table public.content_item_classrooms enable row level security;
alter table public.content_reactions enable row level security;
alter table public.content_share_events enable row level security;

-- Reexecução segura: remover políticas antes de recriar
drop policy if exists "content_items_select_visible" on public.content_items;
drop policy if exists "content_items_insert_professor" on public.content_items;
drop policy if exists "content_items_update_author" on public.content_items;
drop policy if exists "content_items_delete_author" on public.content_items;

drop policy if exists "cic_select_visible" on public.content_item_classrooms;
drop policy if exists "cic_insert_author_scoped" on public.content_item_classrooms;
drop policy if exists "cic_delete_author" on public.content_item_classrooms;

drop policy if exists "cr_select_if_visible" on public.content_reactions;
drop policy if exists "cr_insert_own_if_visible" on public.content_reactions;
drop policy if exists "cr_delete_own" on public.content_reactions;

drop policy if exists "cse_select_if_visible" on public.content_share_events;
drop policy if exists "cse_insert_if_visible" on public.content_share_events;

-- content_items
create policy "content_items_select_visible"
  on public.content_items for select
  using (public.user_can_view_content_item(id, auth.uid()));

create policy "content_items_insert_professor"
  on public.content_items for insert
  with check (
    auth.uid() = author_id
    and public.is_profile_professor(auth.uid())
  );

create policy "content_items_update_author"
  on public.content_items for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "content_items_delete_author"
  on public.content_items for delete
  using (auth.uid() = author_id);

-- content_item_classrooms
create policy "cic_select_visible"
  on public.content_item_classrooms for select
  using (public.user_can_view_content_item(content_item_id, auth.uid()));

create policy "cic_insert_author_scoped"
  on public.content_item_classrooms for insert
  with check (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and ci.author_id = auth.uid()
    )
    and public.is_classroom_professor(classroom_id, auth.uid())
  );

create policy "cic_delete_author"
  on public.content_item_classrooms for delete
  using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and ci.author_id = auth.uid()
    )
  );

-- content_reactions
create policy "cr_select_if_visible"
  on public.content_reactions for select
  using (public.user_can_view_content_item(content_item_id, auth.uid()));

create policy "cr_insert_own_if_visible"
  on public.content_reactions for insert
  with check (
    auth.uid() = user_id
    and public.user_can_view_content_item(content_item_id, auth.uid())
  );

create policy "cr_delete_own"
  on public.content_reactions for delete
  using (auth.uid() = user_id);

-- content_share_events
create policy "cse_select_if_visible"
  on public.content_share_events for select
  using (public.user_can_view_content_item(content_item_id, auth.uid()));

create policy "cse_insert_if_visible"
  on public.content_share_events for insert
  with check (
    public.user_can_view_content_item(content_item_id, auth.uid())
    and (user_id is null or user_id = auth.uid())
  );

-- Feed do aluno / dashboard: itens publicados visíveis para o utilizador atual
create or replace function public.feed_content_items_for_user(p_limit int default 20)
returns setof public.content_items
language sql
security definer
stable
set search_path = public
as $$
  select ci.*
  from public.content_items ci
  where ci.status = 'published'
    and (
      ci.visibility = 'public'
      or (
        ci.visibility = 'classrooms'
        and exists (
          select 1 from public.content_item_classrooms cic
          where cic.content_item_id = ci.id
            and public.is_classroom_member(cic.classroom_id, auth.uid())
        )
      )
      or (
        ci.visibility = 'private'
        and ci.author_id = auth.uid()
      )
    )
  order by ci.published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

comment on function public.feed_content_items_for_user(int) is
  'Lista publicações do feed para o utilizador autenticado (público, turmas em que é membro, ou privadas próprias).';

grant execute on function public.feed_content_items_for_user(int) to authenticated;

-- Criação de rascunho via RPC (contorna falhas de RLS no INSERT direto pelo cliente).
create or replace function public.create_article_draft()
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
    raise exception 'Apenas professores podem criar artigos';
  end if;

  insert into public.content_items (author_id, type, title, body_html, status, visibility, settings)
  values (uid, 'article', 'Rascunho', null, 'draft', 'private', '{}'::jsonb)
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_article_draft() is
  'Insere rascunho de artigo como professor; executa com privilegios elevados para evitar bloqueio de RLS no INSERT.';

grant execute on function public.create_article_draft() to authenticated;
