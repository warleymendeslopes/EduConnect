-- Agregados de notas por atividade (média da turma) para membros e professor
-- Sem expor linhas de outros alunos. Aplicar após 003/005.

create or replace function public.class_activity_score_stats(p_classroom_id uuid)
returns table (
  activity_id uuid,
  avg_score numeric,
  score_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.activity_id,
    avg(s.score_total)::numeric,
    count(*)::bigint
  from public.classroom_activity_submissions s
  inner join public.classroom_activities ca on ca.id = s.activity_id
  where ca.classroom_id = p_classroom_id
    and ca.status <> 'rascunho'
    and ca.settings ? 'exam'
    and s.status = 'enviado'
    and s.score_total is not null
    and (
      public.is_classroom_professor(p_classroom_id, auth.uid())
      or public.is_classroom_member(p_classroom_id, auth.uid())
    )
  group by s.activity_id;
$$;

comment on function public.class_activity_score_stats(uuid) is
  'Média e contagem de notas por atividade avaliativa; acessível a professor da sala ou aluno membro.';

grant execute on function public.class_activity_score_stats(uuid) to authenticated;
