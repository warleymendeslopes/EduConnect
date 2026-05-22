# EduConnect

EduConnect e uma plataforma educacional social com IA integrada para conectar professores e alunos em um ambiente unico de ensino, conteudo, turmas, atividades e acompanhamento de desempenho.

A aplicacao permite que professores publiquem materiais, criem turmas, acompanhem entregas e usem revisao automatica por IA antes da publicacao de artigos. Para alunos, a plataforma oferece feed educacional, entrada em turmas por convite, atividades, exercicios, simulados e acompanhamento de progresso.

## Objetivo do projeto

O projeto foi criado para centralizar a jornada de ensino e aprendizagem em uma experiencia simples:

- Professores conseguem criar conteudos ricos, organizar salas virtuais e acompanhar alunos.
- Alunos conseguem consumir conteudo, responder atividades e acompanhar sua evolucao.
- A IA apoia a curadoria, revisao de conteudos e fluxos de aprendizagem.
- A plataforma combina feed publico, conteudos privados por turma e ferramentas de sala de aula.

## Principais funcionalidades

### Para professores

- Cadastro e area exclusiva de professor.
- Criacao e gestao de turmas.
- Convites por codigo/link para entrada de alunos.
- Criacao de conteudos educacionais:
  - artigos;
  - exercicios;
  - avaliacoes;
  - simulados;
  - dicas rapidas com imagem ou video.
- Editor rico com suporte a anexos e midias.
- Controle de visibilidade do conteudo:
  - publico;
  - privado;
  - restrito a turmas selecionadas.
- Revisao de artigos por IA antes da publicacao.
- Painel de analise de desempenho.
- Consulta de alunos e historico por turma.

### Para alunos

- Cadastro e area exclusiva de aluno.
- Feed de conteudos educacionais.
- Entrada em turmas por codigo ou link de convite.
- Visualizacao de materiais, atividades e conteudos publicados.
- Resposta de exercicios, avaliacoes e simulados.
- Feedback de questoes objetivas e acompanhamento de pontuacao.
- Plano de estudos e progresso do aluno.
- Area para explorar professores.

### Inteligencia artificial

O projeto possui um fluxo de revisao automatica de artigos usando xAI. Ao enviar um artigo para revisao, o sistema avalia:

- verificacao de fatos;
- risco de plagio;
- adequacao do conteudo;
- qualidade educacional.

Com base na pontuacao, o artigo pode ser publicado automaticamente, enviado para decisao do professor ou voltar para revisao.

## Stack tecnica

- Next.js 16 com App Router.
- React 19.
- TypeScript.
- Supabase para autenticacao, banco de dados e RLS.
- Vercel Blob para arquivos e anexos.
- xAI para revisao automatica de conteudo.
- Tailwind CSS 4.
- shadcn/ui e Radix UI para componentes de interface.
- Trix para edicao de texto rico.
- Recharts para visualizacoes de desempenho.
- Vercel Analytics.

## Estrutura principal

```text
app/
  actions/                         Server Actions da aplicacao
  api/                             Rotas internas para uploads e anexos
  cadastro/                        Fluxo de cadastro
  login/                           Login
  conteudo/[id]/                   Pagina publica/privada de conteudo
  dashboard/aluno/                 Area do aluno
  dashboard/professor/             Area do professor
  entrar/[codigo]/                 Entrada em turma por convite

components/
  dashboard/                       Componentes dos paineis de aluno/professor
  landing/                         Landing page institucional
  ui/                              Componentes base de interface

lib/
  activities/                      Tipos e logica de atividades/provas
  classrooms/                      Tipos e utilitarios de turmas
  content/                         Tipos, configuracoes e agente de revisao
  supabase/                        Clientes Supabase client/server/middleware
  student-planner/                 Utilitarios do plano de estudos

scripts/
  001_*.sql ... 014_*.sql          Scripts SQL para preparar o banco

supabase/
  migrations/                      Migracoes do Supabase
```

## Requisitos

- Node.js compativel com Next.js 16.
- npm.
- Projeto Supabase configurado.
- Bucket/credenciais do Vercel Blob para uploads.
- Chave da xAI para revisao automatica de artigos.

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure as variaveis de ambiente em `.env.local` ou `.env.development.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BLOB_READ_WRITE_TOKEN=
XAI_API_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=
```

Variaveis principais:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anonima publica do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave de service role usada em fluxos server-side.
- `BLOB_READ_WRITE_TOKEN`: token do Vercel Blob para upload e leitura de arquivos.
- `XAI_API_KEY`: chave usada pelo agente de revisao de artigos.
- `NEXT_PUBLIC_APP_URL`: URL base da aplicacao para gerar links absolutos.
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`: URL opcional para redirect em desenvolvimento.

3. Prepare o banco no Supabase executando os scripts SQL em ordem:

```text
scripts/001_create_profiles.sql
scripts/002_classrooms.sql
scripts/003_classroom_activities.sql
scripts/004_classroom_materials.sql
scripts/005_classroom_activity_submissions.sql
scripts/006_classroom_mural_cover.sql
scripts/007_classroom_performance_stats.sql
scripts/008_student_planner_personal_tasks.sql
scripts/009_content_items.sql
scripts/010_content_exercises.sql
scripts/011_content_assessments.sql
scripts/012_content_simulados.sql
scripts/013_content_dicas.sql
scripts/014_content_review.sql
```

4. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

5. Abra a aplicacao em:

```text
http://localhost:3000
```

## Scripts disponiveis

```bash
npm run dev      # inicia o ambiente de desenvolvimento
npm run build    # gera o build de producao
npm run start    # inicia a aplicacao em modo producao apos o build
npm run lint     # executa o lint configurado no package.json
```

Observacao: o script de lint usa `eslint .`. Se o comando falhar com `eslint: command not found`, instale/configure o ESLint no projeto antes de usar essa validacao.

## Fluxos importantes

### Publicacao de conteudo

1. O professor cria um conteudo no painel.
2. Define tipo, titulo, corpo, midias, tags, disciplina, nivel e visibilidade.
3. Dependendo do tipo, adiciona questoes, datas de abertura/entrega ou anexos.
4. Artigos podem passar por revisao de IA.
5. Conteudos publicados aparecem no feed dos alunos conforme a visibilidade.

### Turmas

1. O professor cria uma sala com disciplina, nivel e limite opcional de alunos.
2. O sistema gera um codigo/link de convite.
3. Alunos entram pela rota `/entrar/[codigo]` ou pelo painel de aluno.
4. Professor acompanha alunos, materiais, atividades e desempenho.

### Avaliacoes e exercicios

1. O professor cria questoes objetivas ou abertas.
2. O aluno responde pela pagina do conteudo ou atividade.
3. Questoes objetivas podem gerar pontuacao automatica.
4. Questoes abertas ficam disponiveis para correcao do professor.
5. O desempenho entra nos paineis de acompanhamento.

## Banco de dados e seguranca

O projeto usa Supabase com RLS habilitado nas principais tabelas. Os scripts SQL criam tabelas, politicas, funcoes e triggers para:

- perfis de usuario;
- turmas e membros;
- atividades e materiais;
- entregas de atividades;
- conteudos globais;
- reacoes e compartilhamentos;
- entregas de exercicios;
- avaliacoes e simulados;
- resultados de revisao por IA;
- estatisticas de desempenho.

As permissoes sao separadas por perfil de usuario (`aluno` e `professor`) e por relacao com turmas/conteudos.

## Status atual

O projeto ja possui uma base funcional com landing page, autenticacao, dashboards, criacao de conteudo, turmas, exercicios, simulados, dicas, upload de midias, revisao por IA e analise de desempenho.

Alguns pontos ainda podem evoluir:

- configuracao completa do ESLint;
- ajustes de compatibilidade do `next.config.mjs` com Next.js 16;
- ampliacao dos testes automatizados;
- documentacao de deploy em producao;
- painel administrativo para aprovacao e moderacao de professores.

## Deploy

O projeto e adequado para deploy na Vercel. Antes de publicar, configure no ambiente de producao:

- variaveis do Supabase;
- chave service role do Supabase;
- token do Vercel Blob;
- chave da xAI;
- URL publica da aplicacao;
- redirects de autenticacao no painel do Supabase.

## Repositorio

Repositorio remoto configurado:

```text
git@github.com:warleymendeslopes/EduConnect.git
```
