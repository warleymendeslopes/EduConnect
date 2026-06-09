-- Password recovery codes for Postgres-only auth.
-- Codes are stored as hashes, expire after 24 hours, and can be used once.

create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (attempts >= 0),
  check (max_attempts > 0)
);

create index if not exists idx_password_reset_codes_user_active
  on public.password_reset_codes (user_id, created_at desc)
  where used_at is null;

create index if not exists idx_password_reset_codes_expires_at
  on public.password_reset_codes (expires_at);

create table if not exists public.password_reset_request_limits (
  id uuid primary key default gen_random_uuid(),
  email_fingerprint text not null unique,
  last_requested_at timestamptz not null default timezone('utc'::text, now()),
  window_started_at timestamptz not null default timezone('utc'::text, now()),
  request_count integer not null default 1,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (request_count > 0)
);

create index if not exists idx_password_reset_request_limits_window
  on public.password_reset_request_limits (window_started_at);
