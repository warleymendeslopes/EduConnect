-- Comentarios em content_items: tabela, RLS e contador desnormalizado.

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create or replace function public.user_can_view_content_item(p_content_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v record;
begin
  select ci.id, ci.author_id, ci.status, ci.visibility
  into v
  from public.content_items ci
  where ci.id = p_content_id;

  if v.id is null then
    return false;
  end if;

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

alter table public.content_items
  add column if not exists comment_count integer not null default 0;

alter table public.content_items
  drop constraint if exists content_items_comment_count_check;
alter table public.content_items
  add constraint content_items_comment_count_check
  check (comment_count >= 0);

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  parent_id uuid references public.content_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_content_comments_item_created
  on public.content_comments (content_item_id, created_at asc);
create index if not exists idx_content_comments_user
  on public.content_comments (user_id);
create index if not exists idx_content_comments_parent
  on public.content_comments (parent_id);

create or replace function public.content_comments_adjust_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.content_items
      set comment_count = comment_count + 1, updated_at = timezone('utc'::text, now())
      where id = new.content_item_id;
  elsif tg_op = 'DELETE' then
    update public.content_items
      set comment_count = greatest(0, comment_count - 1), updated_at = timezone('utc'::text, now())
      where id = old.content_item_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_content_comments_count on public.content_comments;
create trigger tr_content_comments_count
  after insert or delete on public.content_comments
  for each row execute function public.content_comments_adjust_comment_count();

create or replace function public.handle_content_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists tr_content_comments_updated_at on public.content_comments;
create trigger tr_content_comments_updated_at
  before update on public.content_comments
  for each row execute function public.handle_content_comments_updated_at();

create or replace function public.content_comments_validate_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.content_comments parent
    where parent.id = new.parent_id
      and parent.content_item_id = new.content_item_id
      and parent.parent_id is null
  ) then
    raise exception 'Resposta permitida apenas para comentario raiz do mesmo conteudo';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_content_comments_validate_parent on public.content_comments;
create trigger tr_content_comments_validate_parent
  before insert or update of parent_id, content_item_id on public.content_comments
  for each row execute function public.content_comments_validate_parent();

alter table public.content_comments enable row level security;

drop policy if exists "cc_select_if_visible" on public.content_comments;
drop policy if exists "cc_insert_own_if_visible" on public.content_comments;
drop policy if exists "cc_update_own" on public.content_comments;
drop policy if exists "cc_delete_own" on public.content_comments;

create policy "cc_select_if_visible"
  on public.content_comments for select
  using (public.user_can_view_content_item(content_item_id, auth.uid()));

create policy "cc_insert_own_if_visible"
  on public.content_comments for insert
  with check (
    auth.uid() = user_id
    and public.user_can_view_content_item(content_item_id, auth.uid())
  );

create policy "cc_update_own"
  on public.content_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cc_delete_own"
  on public.content_comments for delete
  using (auth.uid() = user_id);

update public.content_items ci
set comment_count = counted.total
from (
  select content_item_id, count(*)::integer as total
  from public.content_comments
  group by content_item_id
) counted
where ci.id = counted.content_item_id
  and ci.comment_count <> counted.total;
