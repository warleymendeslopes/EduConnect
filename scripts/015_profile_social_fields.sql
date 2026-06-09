-- Social profile fields for authenticated profile editing.
-- Ordem: aplicar apos scripts/001_create_profiles.sql.

alter table public.profiles
  add column if not exists cover_url text;

alter table public.profiles
  add column if not exists profile_visibility text not null default 'private';

alter table public.profiles
  drop constraint if exists profiles_profile_visibility_check;

alter table public.profiles
  add constraint profiles_profile_visibility_check
  check (profile_visibility in ('public', 'private'));
