-- Agente de revisão de artigos: novos status e tabela de resultados.
-- Ordem: após scripts/009 (content_items).

-- Expandir constraint de status para os novos estados do fluxo de revisão
alter table public.content_items
  drop constraint if exists content_items_status_check;

alter table public.content_items
  add constraint content_items_status_check
  check (status in ('draft', 'published', 'verificando', 'revisao', 'aguardando_decisao'));

-- Resultado da revisão do agente (um por artigo, substituível via upsert)
create table if not exists public.content_review_results (
  id                uuid        primary key default gen_random_uuid(),
  content_item_id   uuid        not null references public.content_items(id) on delete cascade,
  score             integer     not null check (score >= 0 and score <= 100),
  seal              text        not null default 'none' check (seal in ('none', 'excellence')),
  findings          jsonb       not null default '[]'::jsonb,
  warning_reason    text,
  reviewed_at       timestamptz not null default timezone('utc'::text, now()),
  unique (content_item_id)
);

create index if not exists idx_content_review_results_item
  on public.content_review_results (content_item_id);

alter table public.content_review_results enable row level security;

drop policy if exists "crr_select_author" on public.content_review_results;

-- Apenas o autor do conteúdo pode ler o resultado da revisão
create policy "crr_select_author"
  on public.content_review_results for select
  using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id
        and ci.author_id = auth.uid()
    )
  );
