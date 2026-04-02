---
name: educonnect-product
description: >-
  EduConnect product context — educational social platform with AI for teachers
  and students (feeds, rooms, study plans, Socratic tutor, content review). Use
  when building or reviewing EduConnect UI, routes, copy, features, or when the
  user mentions EduConnect, professores/alunos, dashboard, onboarding, salas,
  plano de estudos, Tutor IA, revisão de conteúdo, or feed curado.
---

# EduConnect — Contexto de Produto

## O que é

Plataforma educacional social com IA: professores publicam e gerenciam conteúdo e turmas; alunos consomem feed curado, plano de estudos e tutor socrático. Slogan: *"Ensinar é uma arte. Aprender é uma jornada."*

## Papéis e redirecionamento

- **`aluno`** → `/dashboard/aluno`
- **`professor`** → `/dashboard/professor`
- **`professor` + status pendente** → mesmo dashboard com `?status=pendente` e banner; bloqueio de **Criar Conteúdo** e **Criar Sala**; liberado feed, exploração, perfil.

## Identidade visual (obrigatório em UI)

| Uso | Hex |
|-----|-----|
| Primário / links | `#1D4ED8` |
| Header / sidebar escuro | `#1E3A8A` |
| Sucesso / verificado | `#10B981` |
| Aviso / revisão pendente | `#F59E0B` |
| Erro / crítico | `#EF4444` |
| Fundo neutro / cards | `#F3F4F6`, `#FFFFFF` |
| Texto secundário / borda | `#9CA3AF` |
| Texto principal | `#111827` |

- **Títulos:** Sora (Google Fonts)
- **Corpo / UI:** DM Sans
- **Código / fórmulas:** JetBrains Mono

**Tom:** acolhedor e direto ("Seu plano", "Sua sala"); não infantil nem corporativo frio.

## Rotas principais

| Rota | Propósito |
|------|-----------|
| `/` | Landing |
| `/login`, `/cadastro`, `/cadastro/onboarding` | Auth + onboarding aluno |
| `/dashboard/aluno`, `/plano`, `/salas`, `/salas/:id`, `/tutor`, `/explorar`, `/progresso`, `/perfil` | Prefixo `/dashboard/aluno/` onde aplicável |
| `/dashboard/professor`, `/criar`, `/salas`, `/salas/:id`, `/alunos`, `/analise`, `/revisoes`, `/perfil` | Prefixo `/dashboard/professor/` |
| `/professor/:slug` | Perfil público professor |
| `/conteudo/:id` | Conteúdo público |

Mapa completo e variações: [reference.md](reference.md).

## Módulos de IA (comportamento esperado)

1. **Revisor de conteúdo** — ao "Enviar para revisão": plágio, precisão, qualidade, adequação ao nível; scores e status `APROVADO` | `APROVADO_COM_RESSALVAS` | `REPROVADO`; UI com relatório e ações (publicar, editar, publicar com ressalva).
2. **Curador de feed** — ranqueia por perfil, histórico e plano; **mostrar motivo da recomendação** de forma transparente.
3. **Plano de estudos** — onboarding + "Ajustar plano"; semana com blocos por matéria; reage ao desempenho.
4. **Tutor (Edu)** — socrático: **não entregar resposta final** de exercícios; perguntas guias, analogias, tom se o aluno frustrar.
5. **Corretor automático** — provas objetivas: gabarito, nota, relatório por tema + sugestões de revisão.

## Padrões de UX obrigatórios

- **Professor pendente:** banner amarelo no topo; bloqueios explícitos acima.
- **Empty states:** feed sem follow, sala sem alunos, sem atividades, plano não gerado — copy + CTA do doc de produto.
- **Loading:** skeletons no feed; estados "IA analisando..." / tutor pensando com feedback claro.
- **Mobile:** sidebar → bottom nav (~5 itens); tutor fullscreen; modais → bottom sheets; criar conteúdo com nota de experiência completa no desktop.

## Componentes reutilizáveis (nomes canônicos)

`Button`, `Card`, `Avatar`, `Badge`, `Sidebar`, `Topbar`, `Feed`, `StoryBar`, `Modal`, `Toast`, `ProgressBar`, `Tabs`, `RichTextEditor`, `QuestionBuilder`, `ChatBubble`, `AIReportCard`, `CalendarWeekView`, `StatCard` — variantes e usos: [reference.md](reference.md).

## Estado do repositório (código atual)

O que já existe na base de código vs. o backlog do produto está em [reference.md — Estado atual do repositório](reference.md#estado-atual-do-repositório). Inclui rotas implementadas, Supabase (`profiles`, trigger, middleware) e lacunas em relação ao documento de produto.

## Quando aprofundar

- Fluxos detalhados (cadastro em etapas, salas, atividades, notificações, monetização futura): leia [reference.md](reference.md).
- Para implementar uma tela específica, cruze a rota acima com a seção correspondente em `reference.md`.
