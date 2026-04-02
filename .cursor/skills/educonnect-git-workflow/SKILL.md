---
name: educonnect-git-workflow
description: >-
  Git workflow for EduConnect — always work on a dedicated branch per demand,
  short branch names, conventional commit prefixes (feature, erro, chore, etc.)
  with subject max 120 characters. Use when committing, branching, pushing, or
  when the user mentions git, branch, PR, merge, rollback, or subir alteracoes.
---

# EduConnect — Fluxo Git e commits

## Regra principal

**Nunca commitar direto na branch principal** (`main` ou `master`). Toda alteração de feature, correção ou ajuste relevante vai em **outra branch**, criada a partir da principal atualizada. Isso isola demandas, facilita review, rollback e histórico.

## Branches

- **Origem:** sempre a partir da principal (`main`/`master`), após `git pull`.
- **Nome:** curto, em **kebab-case**, alinhado à demanda (não genérico).
- **Formato sugerido:** `tipo/descricao-curta` (máx. ~40 caracteres no total quando possível).

| Tipo no path | Uso |
|--------------|-----|
| `feature/` | Nova funcionalidade |
| `fix/` ou `erro/` | Correção de bug |
| `chore/` | Tooling, deps, configs sem mudança de produto |
| `docs/` | Só documentação |
| `refactor/` | Refatoração sem mudar comportamento |

**Exemplos:** `feature/salas-convite`, `fix/login-query-next`, `chore/supabase-env-example`, `docs/skill-produto`.

## Commits — primeira linha (obrigatório)

- **Comprimento máximo da primeira linha: 120 caracteres** (incluindo prefixo e espaços).
- **Prefixo obrigatório** + descrição no imperativo ou indicativo curto, em português (alinhado ao projeto).

**Prefixos permitidos:**

| Prefixo | Quando usar |
|---------|-------------|
| `feature:` | Nova capacidade ou entrega de demanda |
| `erro:` | Correção de bug ou regressão (equivalente a *fix*) |
| `chore:` | Manutenção, dependências, scripts, sem impacto funcional direto |
| `docs:` | Apenas documentação ou skills |
| `refactor:` | Reorganização de código sem mudar comportamento |
| `test:` | Testes automatizados |
| `style:` | Formatação/lint sem mudar lógica |

**Formato:**

```text
<prefixo> <descrição clara do que mudou>
```

**Bons exemplos (≤120 chars):**

```text
feature: salas virtuais com codigo EDU e pagina /entrar
erro: corrige contagem de membros quando aluno sem turmas
chore: adiciona script SQL 002_classrooms para Supabase
docs: skill de fluxo git e convencao de commits
```

**Evitar:** mensagens vagas (`ajustes`, `fix`, `wip`), primeira linha >120 caracteres, misturar várias demandas não relacionadas no mesmo commit (preferir commits atômicos).

## Corpo do commit (opcional, recomendado para mudanças médias/grandes)

Após uma linha em branco, detalhar **o porquê** e **o quê** em poucas linhas (sem limite rígido). Facilita rollback e blame.

```text
feature: tutor IA com estado de carregamento

- Exibe skeleton enquanto a sessao carrega
- Evita flash de conteudo vazio no primeiro paint
```

## Fluxo resumido (checklist)

1. `git checkout main && git pull`
2. `git checkout -b tipo/demanda-curta`
3. Trabalhar e commitar com o padrão acima
4. `git push -u origin tipo/demanda-curta`
5. Abrir PR para a principal (se o time usar GitHub/GitLab)

## Rollback

- **Reverter uma feature inteira:** merge revert do PR na principal, ou reset da branch antes do merge (se ainda não foi integrada).
- **Isolamento:** como cada demanda está em branch própria, não misturar commits de outra feature na mesma branch.

## Relação com outras skills

- Contexto de produto e telas: [educonnect-product/SKILL.md](../educonnect-product/SKILL.md).
