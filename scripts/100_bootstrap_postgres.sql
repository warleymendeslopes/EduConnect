-- Bootstrap for "Postgres only" mode.
-- Run this on the new database before starting the app.

create extension if not exists pgcrypto;

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (email)
);

create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  full_name text,
  user_type text not null check (user_type in ('aluno', 'professor')),
  avatar_url text,
  professor_verification_status text not null default 'none'
    check (professor_verification_status in ('none', 'pending', 'approved', 'rejected')),
  professor_verification_doc_url text,
  professor_verification_submitted_at timestamptz,
  bio text,
  interests text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists handle_users_updated_at on public.users;
create trigger handle_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
