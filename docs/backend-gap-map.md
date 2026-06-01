# Mapa de backend pendente - EduConnect

Este mapa foi feito a partir da leitura do projeto local em `2026-05-22`.
O objetivo e separar o que ja tem backend real do que ainda esta so no front
ou parcialmente conectado.

## Resumo executivo

O projeto ja tem uma base funcional forte para:

- autenticacao com NextAuth (Credentials) + Postgres;
- perfis simples de aluno/professor;
- salas, convites e matriculas;
- atividades de sala, materiais, anexos e entregas;
- correcao manual de questoes abertas;
- conteudos globais: artigo, exercicio, avaliacao, simulado e dica;
- feed com visibilidade publica/privada/por turma;
- curtidas e compartilhamentos;
- plano semanal do aluno com tarefas pessoais e atividades de turma;
- revisao de artigos por IA.

As maiores lacunas estao em:

- perfil publico de professor e descoberta de professores;
- seguidores, favoritos/salvos, comentarios e notificacoes;
- dashboard inicial do professor, que ainda usa dados mockados;
- tutor IA do aluno, que ainda simula respostas no cliente;
- onboarding do aluno, que nao persiste preferencias nem gera plano real;
- aprovacao/verificacao de professores;
- paginas linkadas no menu que ainda nao existem.

## Backend ja implementado

### Autenticacao e perfis

Arquivos principais:

- `app/cadastro/page.tsx`
- `app/login/page.tsx`
- `scripts/001_create_profiles.sql`

Estado:

- cadastro por email/senha funciona via `public.users` + `public.profiles`;
- login via NextAuth (Credentials);
- protecao de `/dashboard` via `proxy.ts`.

Limites atuais:

- login social Google/Apple aparece no front, mas nao chama OAuth;
- link de recuperar senha aponta para `/esqueci-senha`, rota inexistente;
- cadastro coleta bio, niveis e documento do professor no front, mas nao persiste esses dados no schema atual.

### Salas e matriculas

Arquivos principais:

- `app/actions/classrooms.ts`
- `app/dashboard/professor/salas/page.tsx`
- `app/dashboard/professor/salas/[id]/page.tsx`
- `app/dashboard/aluno/salas/page.tsx`
- `app/entrar/[codigo]/page.tsx`
- `scripts/002_classrooms.sql`

Estado:

- professor cria sala;
- sistema gera codigo de convite;
- aluno entra por codigo/link;
- professor lista/remover alunos;
- aluno lista suas salas;
- mural da sala edita descricao e capa.

### Atividades, materiais e entregas

Arquivos principais:

- `app/actions/classroom-activities.ts`
- `app/actions/classroom-materials.ts`
- `app/actions/activity-submissions.ts`
- `components/dashboard/classroom-activity-form-dialog.tsx`
- `components/dashboard/student-activity-exam.tsx`
- `scripts/003_classroom_activities.sql`
- `scripts/004_classroom_materials.sql`
- `scripts/005_classroom_activity_submissions.sql`

Estado:

- professor cria/edita/exclui atividades;
- atividades suportam questoes MCQ e abertas;
- aluno salva rascunho e envia respostas;
- correcao objetiva e pontuacao existem;
- professor corrige abertas;
- anexos privados usam Vercel Blob com rotas protegidas.

### Desempenho de turmas e alunos

Arquivos principais:

- `app/actions/classroom-performance.ts`
- `components/dashboard/classroom-performance-panel.tsx`
- `components/dashboard/aluno-performance-panel.tsx`
- `app/dashboard/professor/alunos/page.tsx`
- `app/dashboard/professor/alunos/[studentId]/page.tsx`
- `scripts/007_classroom_performance_stats.sql`

Estado:

- professor ve desempenho da turma;
- professor ve historico de aluno nas suas turmas;
- aluno ve desempenho na sala;
- estatisticas usam entregas e notas.

### Conteudos globais e feed

Arquivos principais:

- `app/actions/content-items.ts`
- `app/actions/content-exercise-submissions.ts`
- `app/conteudo/[id]/page.tsx`
- `app/dashboard/professor/criar/criar-conteudo-client.tsx`
- `app/dashboard/professor/conteudos/page.tsx`
- `app/dashboard/aluno/page.tsx`
- `scripts/009_content_items.sql`
- `scripts/010_content_exercises.sql`
- `scripts/011_content_assessments.sql`
- `scripts/012_content_simulados.sql`
- `scripts/013_content_dicas.sql`

Estado:

- professor cria rascunho e publica artigo/exercicio/avaliacao/simulado/dica;
- conteudos têm visibilidade publica, privada ou por turma;
- aluno consome feed conforme permissao;
- exercicios/avaliacoes/simulados aceitam envio e correcao;
- curtidas e compartilhamentos persistem;
- anexos/capas usam Vercel Blob.

Limites atuais:

- comentarios aparecem na UI, mas nao existe tabela/action;
- botao salvar/favoritar e so estado local;
- visualizacoes/views nao sao persistidas;
- stories do feed sao mockados;
- feed do aluno ainda mistura conteudos reais com cards mockados de video/exercicio.

### Plano de estudos

Arquivos principais:

- `app/actions/student-planner.ts`
- `app/dashboard/aluno/plano/page.tsx`
- `app/dashboard/aluno/plano/plano-estudos-client.tsx`
- `scripts/008_student_planner_personal_tasks.sql`

Estado:

- aluno ve semana;
- tarefas pessoais sao persistidas;
- atividades das turmas entram no calendario;
- streak usa tarefas concluidas e entregas.

Limites atuais:

- onboarding nao alimenta o plano;
- nao existe geracao automatica de plano por IA;
- metas do feed inicial do aluno ainda sao estaticas.

## Frontend sem backend ou parcial

### Dashboard inicial do professor

Arquivo:

- `app/dashboard/professor/page.tsx`

Estado:

- usa arrays mockados para stats, publicacoes recentes, atividades pendentes e notificacoes.

Backend faltante:

- agregador real de metricas do professor;
- ultimas publicacoes reais;
- entregas pendentes reais;
- notificacoes reais;
- visualizacoes e comentarios para alimentar engajamento.

Prioridade recomendada: alta, porque e a primeira tela do professor.

### Explorar professores

Arquivo:

- `app/dashboard/aluno/explorar/page.tsx`

Estado:

- lista professores mockados;
- busca e filtros so no cliente.

Backend faltante:

- query de professores reais em `profiles`;
- campos publicos de perfil: slug, disciplinas, niveis, bio, avatar, verificacao;
- ranking/destaques;
- busca por nome/disciplina;
- contadores de seguidores, publicacoes e alunos.

Prioridade recomendada: alta, porque conecta aluno ao ecossistema publico.

### Perfil publico de professor

Arquivo:

- `app/professor/[slug]/page.tsx`

Estado:

- perfil inteiro e mockado;
- seguir e estado local;
- avaliacoes exibem "em breve".

Backend faltante:

- slug unico no perfil;
- consulta publica por slug;
- publicacoes reais do professor;
- seguidores;
- turmas publicas/disponiveis;
- avaliacoes/reputacao;
- botao seguir persistente.

Prioridade recomendada: alta apos Explorar Professores.

### Tutor IA

Arquivo:

- `app/dashboard/aluno/tutor/page.tsx`

Estado:

- respostas simuladas via `setTimeout`;
- nao ha persistencia de conversa.

Backend faltante:

- route/action para chamar modelo de IA;
- tabela de conversas e mensagens;
- contexto opcional do aluno: plano, materias, atividades;
- limites de uso e seguranca;
- historico de chats.

Prioridade recomendada: media/alta, depende do posicionamento do produto.

### Onboarding do aluno

Arquivo:

- `app/cadastro/onboarding/page.tsx`

Estado:

- coleta objetivo, tempo, dificuldades e estilo;
- simula geracao de plano e redireciona;
- nao persiste nada.

Backend faltante:

- tabela de preferencias do aluno;
- action para salvar respostas;
- geracao real ou regra inicial de plano;
- integracao com `student_planner_personal_tasks`;
- redirecionamento automatico para onboarding apos cadastro de aluno.

Prioridade recomendada: media, mas importante para reter aluno.

### Verificacao/aprovacao de professores

Arquivos:

- `app/cadastro/page.tsx`
- `app/dashboard/professor/layout.tsx`

Estado:

- front fala em envio de documento e status pendente;
- nao ha upload real de documento;
- schema `profiles` nao tem status de aprovacao;
- nao ha painel admin.

Backend faltante:

- campos/tabela de verificacao;
- upload privado de documentos;
- status `pending`, `approved`, `rejected`;
- bloqueio real de criacao/publicacao quando pendente;
- painel admin para revisar professores.

Prioridade recomendada: alta se o app for aberto ao publico.

### Configuracoes e perfil autenticado

Links existentes, rotas ausentes:

- `/dashboard/aluno/perfil`
- `/dashboard/aluno/configuracoes`
- `/dashboard/professor/perfil`
- `/dashboard/professor/configuracoes`
- `/dashboard/aluno/progresso`
- `/dashboard/professor/revisoes`
- `/esqueci-senha`

Backend faltante:

- edicao de perfil;
- upload de avatar;
- preferencias de conta;
- redefinicao de senha;
- pagina dedicada de progresso do aluno;
- pagina dedicada de revisoes IA ou ajuste do menu para usar `/dashboard/professor/analise`.

Prioridade recomendada: alta para corrigir navegacao quebrada.

## Schemas/tabelas que provavelmente precisam ser criados

### `profile_public_settings` ou extensao de `profiles`

Campos sugeridos:

- `slug text unique`
- `headline text`
- `location text`
- `website_url text`
- `education_levels text[]`
- `subjects text[]`
- `is_verified boolean`
- `teacher_status text`
- `public_profile_enabled boolean`

### `teacher_verification_requests`

Campos sugeridos:

- `id uuid`
- `teacher_id uuid`
- `status text`
- `document_pathname text`
- `document_filename text`
- `reviewed_by uuid`
- `reviewed_at timestamptz`
- `rejection_reason text`

### `teacher_followers`

Campos sugeridos:

- `teacher_id uuid`
- `student_id uuid`
- `created_at timestamptz`
- unique `(teacher_id, student_id)`.

### `content_comments`

Campos sugeridos:

- `id uuid`
- `content_item_id uuid`
- `user_id uuid`
- `body text`
- `parent_id uuid null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `content_saves`

Campos sugeridos:

- `content_item_id uuid`
- `user_id uuid`
- `created_at timestamptz`
- unique `(content_item_id, user_id)`.

### `content_view_events`

Campos sugeridos:

- `id uuid`
- `content_item_id uuid`
- `user_id uuid null`
- `session_key text null`
- `created_at timestamptz`

Tambem pode haver contador desnormalizado `view_count` em `content_items`.

### `notifications`

Campos sugeridos:

- `id uuid`
- `user_id uuid`
- `type text`
- `title text`
- `body text`
- `href text`
- `read_at timestamptz`
- `created_at timestamptz`

### `student_onboarding_answers`

Campos sugeridos:

- `student_id uuid primary key`
- `goal text`
- `daily_time text`
- `difficult_subjects text[]`
- `learning_style text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `ai_tutor_conversations` e `ai_tutor_messages`

Campos sugeridos:

- conversa: `id`, `student_id`, `title`, `created_at`, `updated_at`;
- mensagem: `id`, `conversation_id`, `role`, `content`, `created_at`.

## Ordem recomendada de retomada

1. Corrigir navegacao quebrada.
   Criar paginas placeholder funcionais ou remover links para rotas inexistentes.

2. Completar perfil publico do professor.
   Sem isso, Explorar Professores, seguir professor e descoberta ficam presos em mocks.

3. Trocar dashboard inicial do professor por dados reais.
   Reaproveitar `content_items`, `classroom_activities`, `classroom_activity_submissions`
   e `content_review_results`.

4. Completar engajamento do feed.
   Implementar comentarios, salvos e views. Curtida/share ja existem.

5. Persistir onboarding e gerar plano inicial.
   Salvar preferencias e criar tarefas iniciais em `student_planner_personal_tasks`.

6. Implementar Tutor IA real.
   Comecar simples: uma route/action que recebe mensagem e retorna resposta,
   depois adicionar historico e contexto do aluno.

7. Implementar verificacao de professor e painel admin.
   Necessario antes de producao aberta.

## Demandas candidatas para GitHub Project

- Criar rotas ausentes de perfil/configuracoes/progresso/revisoes/esqueci-senha.
- Implementar schema e actions de perfil publico de professor.
- Substituir `app/dashboard/aluno/explorar/page.tsx` por dados reais.
- Substituir `app/professor/[slug]/page.tsx` por perfil real.
- Implementar `teacher_followers` e botao seguir.
- Implementar `content_comments`.
- Implementar `content_saves`.
- Implementar `content_view_events` e `view_count`.
- Substituir mocks do dashboard inicial do professor.
- Persistir onboarding do aluno.
- Gerar plano inicial do aluno a partir do onboarding.
- Implementar tutor IA com historico.
- Implementar verificacao/aprovacao de professores.
