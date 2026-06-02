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
- Postgres (conexao direta via `pg`).
- NextAuth (Credentials) para autenticacao.
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
  student-planner/                 Utilitarios do plano de estudos

scripts/
  001_*.sql ... 014_*.sql          Scripts SQL para preparar o banco
```

## Requisitos

- Node.js compativel com Next.js 16.
- npm.
- Banco Postgres acessivel via `DATABASE_URL`.
- Bucket/credenciais do Vercel Blob para uploads.
- Chave da xAI para revisao automatica de artigos.

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure as variaveis de ambiente em `.env.local` ou `.env.development.local`:

```bash
DATABASE_URL=
AUTH_SECRET=
AUTH_TRUST_HOST=true
BLOB_READ_WRITE_TOKEN=
XAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

Variaveis principais:

- `DATABASE_URL`: string de conexao do Postgres.
- `AUTH_SECRET`: segredo do NextAuth.
- `AUTH_TRUST_HOST`: use `true` em desenvolvimento.
- `BLOB_READ_WRITE_TOKEN`: token do Vercel Blob para upload e leitura de arquivos.
- `XAI_API_KEY`: chave usada pelo agente de revisao de artigos.
- `NEXT_PUBLIC_APP_URL`: URL base da aplicacao para gerar links absolutos.

3. Prepare o banco no Postgres executando:

```bash
node scripts/apply-sql.mjs scripts/100_bootstrap_postgres.sql scripts/200_app_schema_postgres.sql
```

4. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

5. Abra a aplicacao em:

```text
http://localhost:3000
```

## Rodar com Docker

A forma mais rapida de subir tudo (Postgres + aplicacao) e via Docker Compose. Nao
precisa de Node nem Postgres instalados localmente.

1. (Opcional) Crie um arquivo `.env` a partir do exemplo e ajuste os segredos:

```bash
cp .env.docker.example .env
```

2. Suba a stack (build da imagem + Postgres + app):

```bash
docker compose up -d --build
```

3. Abra a aplicacao em `http://localhost:3000`.

O servico `db` cria o schema automaticamente na **primeira** inicializacao, rodando
`scripts/100_bootstrap_postgres.sql` e `scripts/200_app_schema_postgres.sql` via
`docker-entrypoint-initdb.d`. A aplicacao conecta no Postgres pela rede interna do
Compose (`DATABASE_URL=postgresql://app_user:...@db:5432/appdb`, com `DATABASE_SSL=false`).

Comandos uteis:

```bash
docker compose logs -f app        # acompanhar logs da aplicacao
docker compose ps                 # status dos containers
docker compose down               # parar (mantem os dados no volume pgdata)
docker compose down -v            # parar e APAGAR os dados do banco
APP_PORT=3001 docker compose up -d # publicar o app em outra porta do host
```

Observacoes:

- O schema so e aplicado em um volume vazio. Para reaplicar em um banco ja existente,
  use `node scripts/apply-sql.mjs scripts/100_bootstrap_postgres.sql scripts/200_app_schema_postgres.sql`
  apontando o `DATABASE_URL` para o container, ou recrie o volume com `docker compose down -v`.
- Defina um `AUTH_SECRET` forte (`openssl rand -base64 32`) e os tokens de
  `BLOB_READ_WRITE_TOKEN`/`XAI_API_KEY` no `.env` para habilitar upload e revisao de conteudo.

## Scripts disponiveis

```bash
npm run dev      # inicia o ambiente de desenvolvimento
npm run build    # gera o build de producao
npm run start    # inicia a aplicacao em modo producao apos o build
npm run lint     # executa o lint configurado no package.json
```

Observacao: o script de lint usa `eslint .`. Se o comando falhar com `eslint: command not found`, instale/configure o ESLint no projeto antes de usar essa validacao.

## GitHub Project e demandas

O repositorio possui um utilitario para ler o GitHub Project
`https://github.com/users/warleymendeslopes/projects/3` e criar demandas nos
status `Backlog` ou `Ready`.

Crie um arquivo `.env.github.local` com um token do GitHub:

```bash
GITHUB_TOKEN=github_pat_seu_token
GITHUB_PROJECT_OWNER=warleymendeslopes
GITHUB_PROJECT_OWNER_TYPE=user
GITHUB_PROJECT_NUMBER=3
GITHUB_REPO=warleymendeslopes/EduConnect
```

Para Project de usuario, use um personal access token classic com os scopes
`project` e `repo` se o repositorio for privado, ou `project` e `public_repo`
se ele for publico.
Depois, use:

```bash
npm run github:project -- info
npm run backlog:add -- --title "Criar painel do professor" --body "Detalhes da demanda"
npm run ready:add -- --title "Ajustar login do aluno" --body "Detalhes da demanda"
```

Por padrao, o utilitario cria uma issue no repositorio e adiciona a issue ao
Project. Para criar apenas um draft item dentro do Project, use:

```bash
npm run github:project -- backlog --draft --title "Ideia para priorizar"
```

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

O projeto usa Postgres direto. Os scripts SQL criam tabelas, funcoes e triggers para:

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

- `DATABASE_URL` do Postgres;
- `AUTH_SECRET` do NextAuth;
- token do Vercel Blob;
- chave da xAI;
- URL publica da aplicacao;

## Repositorio

Repositorio remoto configurado:

```text
git@github.com:warleymendeslopes/EduConnect.git
```

