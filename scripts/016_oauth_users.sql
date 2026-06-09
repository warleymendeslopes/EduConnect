-- OAuth support for Postgres-only auth.

alter table public.users
  alter column password_hash drop not null;

alter table public.users
  add column if not exists auth_provider text;

alter table public.users
  add column if not exists auth_provider_account_id text;

alter table public.users
  add column if not exists email_verified_at timestamptz;

create unique index if not exists idx_users_auth_provider_account
  on public.users (auth_provider, auth_provider_account_id)
  where auth_provider is not null and auth_provider_account_id is not null;

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  alter column user_type drop not null;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('aluno', 'professor') or user_type is null);

create or replace function public.is_profile_professor(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.user_type = 'professor'
      and p.professor_verification_status = 'approved'
  );
$$;

comment on function public.is_profile_professor(uuid) is
  'True se o perfil existe, user_type = professor e professor_verification_status = approved.';
