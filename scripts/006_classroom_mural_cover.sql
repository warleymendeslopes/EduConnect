-- Capa do mural da sala (foto) — EduConnect
-- Ordem: aplicar após scripts/002_classrooms.sql (e demais já aplicados no projeto).

alter table public.classrooms
  add column if not exists cover_image_pathname text;

comment on column public.classrooms.cover_image_pathname is
  'Pathname Vercel Blob (privado) da imagem de capa do mural; servida via /api/activity-attachment.';
