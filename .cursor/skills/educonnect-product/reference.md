# EduConnect — Referência estendida

Documento de apoio à skill `educonnect-product`. Manter alinhado às decisões de produto.

## Estado atual do repositório

Síntese do que **já está no código** (workspace `/Volumes/warley/edu`) frente à visão de produto. Atualizar esta seção quando grandes blocos forem entregues.

### Stack e auth

- **Next.js (App Router)** + **Supabase Auth** (`@supabase/ssr`, `lib/supabase/client` e middleware em `lib/supabase/middleware.ts`).
- **Middleware:** protege `/dashboard/*` (redireciona para `/login` se não houver sessão); usuários logados em `/login` ou `/cadastro` vão para o dashboard conforme `user_metadata.user_type` (fallback `aluno`).
- **Tabela `public.profiles`:** script em `scripts/001_create_profiles.sql` — campos principais `full_name`, `user_type` (`aluno` \| `professor`), `avatar_url`, `bio`, `interesses` (`interests` como `text[]`), RLS, trigger `on_auth_user_created` preenchendo perfil a partir de `raw_user_meta_data`.
- **Fluxos:** `/login` (redirect por `profiles.user_type`), `/cadastro` (fluxo em etapas aluno/professor + metadata), `/cadastro/onboarding`, `/auth/callback`, `/auth/error`.
- **Logout:** `signOut` nos layouts `dashboard/aluno` e `dashboard/professor`.

### UI / design

- **Design system:** `app/globals.css`, fontes e tokens alinhados ao doc de produto (Sora, DM Sans, JetBrains Mono, paleta).
- **Landing:** `app/page.tsx` + `components/landing/*` (hero, features, how-it-works, testimonials, CTA, header, footer).
- **Componentes:** base forte em `components/ui/*` (shadcn-style); landing específica em `components/landing/`.

### Rotas com página presente (verificar `app/`)

| Área | Implementado |
|------|----------------|
| Público | `/`, `/login`, `/cadastro`, `/cadastro/onboarding`, `/professor/[slug]` |
| Auth | `/auth/callback`, `/auth/error` |
| Aluno | `/dashboard/aluno` (feed), `/dashboard/aluno/plano`, `/dashboard/aluno/tutor`, `/dashboard/aluno/explorar` |
| Professor | `/dashboard/professor` (feed), `/dashboard/professor/criar`, `/dashboard/professor/salas`, `/dashboard/professor/salas/[id]` |

### Lacunas comuns em relação ao documento de produto (a priorizar conforme roadmap)

- Aluno: `/dashboard/aluno/salas`, `/salas/[id]`, `/progresso`, `/perfil`, **Configurações**; feed com IA real, StoryBar, interações completas.
- Professor: `/alunos`, `/analise`, `/revisoes`, `/perfil`; estado **cadastro pendente** (banner + bloqueio criar conteúdo/sala) se ainda não houver campo/workflow no banco.
- Conteúdo: `/conteudo/[id]`; módulos de **IA** (revisor, curador, plano dinâmico, tutor, corretor) — em geral UI/mock até integração.
- **Confirmação de e-mail:** depende da configuração do projeto no Supabase (URLs de redirect e templates).

### Documento externo

O ficheiro `edu-connect--documento-de-produto-completo.md` **não está** neste repositório; se for a fonte única do PRD, convém copiá-lo para a raiz do projeto ou para `docs/` e referenciá-lo aqui.

---

## Landing

Seções: Hero (headline + CTA Sou Professor / Sou Aluno), features professor, features aluno, como funciona (4 passos), depoimentos, CTA final, footer (Sobre, Blog, Termos, Privacidade, Contato + redes).

## Cadastro (`/cadastro`)

**Etapa 1:** cards Aluno vs Professor (borda/fundo no selecionado).

**Aluno:** nome, e-mail, senha + confirmação, data de nascimento, nível de ensino (dropdown), matérias (chips multi). → confirmação → onboarding.

**Professor:** + disciplinas (multi), níveis (multi), bio ≤300 chars; upload verificação (PDF/JPG/PNG); badge "Em análise"; botão "Enviar cadastro para análise". → sucesso com e-mail em até 24h → dashboard pendente.

## Onboarding aluno (`/cadastro/onboarding`)

1. Objetivo principal (ENEM, concurso, recuperação, interesse, reforço).
2. Tempo diário (<30m, 30m–1h, 1–2h, >2h).
3. Matérias com dificuldade (multi).
4. Estilo (vídeo, texto, exercícios, resumos/mapas).

Final: loading "montando plano..." → dashboard com plano.

## Dashboard aluno — navegação

Início (Feed), Plano de Estudos, Minhas Salas, Tutor IA, Explorar Professores, Meu Progresso, Configurações, Meu Perfil. Direita opcional: resumo plano / notificações.

### Feed

Tipos de card: artigo, vídeo, exercício, avaliação/prova. Filtros: Todos, Artigos, Vídeos, Exercícios, por disciplina. Relevância explicada pela IA. Interações: curtir, comentar, salvar, compartilhar; seguir professores; StoryBar no topo.

### Plano de estudos

Visão semanal (`CalendarWeekView`), progresso por disciplina, tarefas diárias (status), "Ajustar plano" (modal), streak, metas da semana.

### Salas (aluno)

Lista + código de convite. Dentro: abas Atividades, Material Extra, Mural, Ranking (opcional).

### Tutor IA

Chat com Edu; chips de sugestões; nova conversa; histórico por sessão.

### Explorar / Progresso

Descoberta de professores com filtros; progresso com gráficos (horas, radar por disciplina), histórico, notas, badges.

## Dashboard professor — navegação

Início (Feed), Criar Conteúdo, Minhas Salas, Meus Alunos, Análise de Desempenho, Revisões pela IA, Configurações, Meu Perfil. Topbar: notificações, busca, avatar.

### Feed professor

Stats nos próprios posts; badges Publicado / Em revisão / Reprovado; FAB "+ Criar Conteúdo".

### Criar conteúdo

Tipos: Artigo, Vídeo, Lista de exercícios, Avaliação/Prova, Simulado, Dica rápida. Fluxo artigo: editor rico (Notion-like, LaTeX, código), metadados, thumbnail, toggle feed público vs só salas → revisão IA → `AIReportCard` → publicar/editar/publicar com ressalva.

### Salas (professor)

CRUD sala, código tipo `EDU-4F8X`, link compartilhável. Abas: Alunos, Atividades (+ criar: trabalho, prova objetiva com gabarito e correção IA, simulado), Material Extra, Mural, Desempenho (export PDF).

### Análise

Métricas de feed + salas; engajamento, risco de evasão, etc.

### Perfil público

`/professor/:slug` — bio, disciplinas, métricas, seguir, abas Publicações / Sobre.

## Mapa de rotas (completo)

```
/                          → Landing
/login                     → Login
/cadastro                  → Cadastro
/cadastro/onboarding       → Onboarding aluno

/dashboard/aluno           → Feed
/dashboard/aluno/plano     → Plano
/dashboard/aluno/salas     → Salas lista
/dashboard/aluno/salas/:id → Sala aluno
/dashboard/aluno/tutor     → Tutor
/dashboard/aluno/explorar  → Explorar
/dashboard/aluno/progresso → Progresso
/dashboard/aluno/perfil    → Perfil aluno

/dashboard/professor           → Feed professor
/dashboard/professor/criar     → Criar conteúdo
/dashboard/professor/salas     → Salas lista
/dashboard/professor/salas/:id → Sala professor
/dashboard/professor/alunos    → Alunos
/dashboard/professor/analise  → Análise
/dashboard/professor/revisoes → Revisões IA
/dashboard/professor/perfil   → Perfil professor

/professor/:slug           → Perfil público
/conteudo/:id              → Conteúdo
```

## Notificações (exemplos de copy)

**Aluno:** plano do dia, novo conteúdo de professor seguido, atividade com prazo, streak, nota disponível.

**Professor:** artigo aprovado/ressalva, entregas para corrigir, novos seguidores, marcos de visualização.

## IA — detalhes de saída

**Revisor:** score 0–100 por categoria; problemas com localização; sugestões; status final.

**Curador:** ranqueamento + explicação visível ao usuário.

**Plano:** semana equilibrada; prioriza dificuldades; ajuste dinâmico com desempenho.

**Corretor:** nota automática + relatório acertos/erros por tema + conteúdos sugeridos para revisar.

## Modelo de negócio (futuro)

Professor: gratuito com limites (salas, alunos, posts, revisões IA); Pro ilimitado + selo; Escola B2B. Aluno: base gratuita; Premium futuro (conteúdo exclusivo, mais uso do tutor, plano mais detalhado).

## Checklist de componentes

Garantir consistência com a lista canônica na skill principal; usar `StatCard` para métricas, `AIReportCard` para revisões, `QuestionBuilder` para questões objetivas, `ChatBubble` no tutor.
