# FinTrack AI — Project Management Setup Guide
**Tool Stack:** GitHub Issues + GitHub Projects v2 + GitHub Copilot Coding Agent  
**Setup time:** ~2–3 hours | **Cost:** Free (GitHub Free tier)  
**Last updated:** 24/03/2026

---

## Why This Stack

| Requirement | Solution |
|---|---|
| Free | ✅ GitHub Free — ilimitado |
| Visual board (Kanban/Scrum) | ✅ GitHub Projects v2 — Board + Table + Roadmap views |
| VS Code integration | ✅ GitHub Pull Requests & Issues extension (nativa) |
| GitHub Copilot Web integration | ✅ Assign issue → Copilot cria branch + PR automaticamente |
| Import de user stories | ✅ Script `gh` CLI (incluído neste guia) |
| AI escreve nas tasks | ✅ Copilot Coding Agent — lê issues, escreve código, atualiza PR |
| Zero merge conflicts entre tasks paralelas | ✅ Cada issue = branch `copilot/US-XXX-*` isolado |
| Check de estado das tasks no IDE | ✅ GitHub Pull Requests extension mostra "Copilot on My Behalf" |

---

## PARTE 1 — Setup em 4 Passos (2–3h total)

### Passo 1 — Pré-requisitos (15 min)

```bash
# 1. Instalar GitHub CLI
brew install gh           # macOS
winget install GitHub.cli # Windows

# 2. Autenticar
gh auth login

# 3. Verificar acesso ao repositório
gh repo view angelorscoelho/fintrack

# 4. Instalar extensão VS Code (se não tiver)
code --install-extension GitHub.vscode-pull-request-github
code --install-extension GitHub.vscode-github-actions
```

---

### Passo 2 — Criar GitHub Project com estrutura Scrum (20 min)

```bash
# Criar o projeto (via GitHub web — mais fácil)
# Ir a: github.com/angelorscoelho/fintrack → Projects → New Project
# Template: "Scrum" ou "Board"
# Nome: "FinTrack AI — Development Board"
```

**Configurar as colunas do board (no GitHub Projects UI):**

| Coluna | Descrição |
|---|---|
| 📋 Backlog | Todas as US ainda não planeadas para sprint |
| 🎯 Sprint Ready | US do sprint actual, prontas para começar |
| 🔄 In Progress | Em desenvolvimento (humano ou Copilot) |
| 👁 In Review | PR aberto, a aguardar revisão |
| ✅ Done | Merged e validado |

**Campos customizados a adicionar ao Project (Settings → Fields):**

| Campo | Tipo | Opções |
|---|---|---|
| Epic | Single select | EP-01 … EP-14 |
| Story Points | Number | 1–13 |
| Priority | Single select | Must Have · Should Have · Could Have |
| Sprint | Iteration | Sprint 1 … Sprint 9 |
| Assignee Type | Single select | Human · Copilot · Both |

---

### Passo 3 — Importar todas as User Stories (60–90 min)

```bash
# Criar labels primeiro
bash scripts/create_labels.sh

# Criar milestones (sprints)
bash scripts/create_milestones.sh

# Importar todas as issues
bash scripts/import_issues.sh

# Adicionar issues ao Project (substitui PROJECT_ID pelo ID real)
# Obtém o ID em: gh project list --owner angelorscoelho
PROJECT_ID="PVT_xxxxxxxxx"
bash scripts/add_to_project.sh $PROJECT_ID
```

> Os scripts `create_labels.sh`, `create_milestones.sh`, `import_issues.sh` e `add_to_project.sh`  
> estão todos incluídos neste repositório em `/scripts/`.

---

### Passo 4 — Configurar o Copilot Coding Agent (30 min)

**4.1 Activar o Copilot Coding Agent no repositório:**
```
github.com/angelorscoelho/fintrack → Settings → Copilot → Policies
→ Enable "Copilot coding agent"
```

**4.2 Criar o ficheiro de instruções do Copilot:**

O ficheiro `.github/copilot-instructions.md` (incluído neste pacote) instrui o Copilot sobre:
- Stack tecnológica do projecto
- Convenções de código
- Estrutura de ficheiros
- Critérios de qualidade por feature

**4.3 Criar o ambiente de desenvolvimento do Copilot:**

O ficheiro `.github/copilot-setup-steps.yml` (incluído neste pacote) instala as dependências necessárias para o Copilot trabalhar no repositório.

**4.4 Configurar Branch Protections (CRÍTICO):**
```
Settings → Branches → Add rule → Branch name: main
✅ Require a pull request before merging
✅ Require approvals: 1
✅ Require status checks to pass
✅ Restrict who can push (só via PR)
```

---

## PARTE 2 — Workflow Diário

### Atribuir uma task ao Copilot Coding Agent

**Opção A — Via GitHub Web:**
1. Abrir a issue (ex: `#001 — Header: título como link`)
2. Em "Assignees" → seleccionar `Copilot`
3. O Copilot reage com 👀 e começa a trabalhar
4. Cria branch `copilot/US-001-header-link` e draft PR automaticamente

**Opção B — Via VS Code:**
```
Copilot Chat → @github → "Open a pull request to implement #001"
```

**Opção C — Via GitHub CLI:**
```bash
gh issue edit 1 --add-assignee @copilot
```

---

### Monitorizar progresso no VS Code (2 ecrãs)

**Ecrã 1 — GitHub.com:**
- Board do Project → ver cards a mover de "Sprint Ready" → "In Progress" → "In Review"
- Issues atribuídas ao Copilot mostram "👀" e link para o PR em progresso

**Ecrã 2 — VS Code:**
- GitHub Pull Requests extension → secção "Copilot on My Behalf"
- Ver commits em tempo real do Copilot a trabalhar
- Deixar comentários de steering no PR sem parar o agente

---

### Revisar e fazer merge de um PR do Copilot

```bash
# Ver PR criado pelo Copilot
gh pr list --assignee "@copilot"

# Rever diff
gh pr diff 42

# Aprovar e fazer merge (se tudo estiver OK)
gh pr review 42 --approve
gh pr merge 42 --squash --delete-branch

# Pedir alterações (o Copilot lê e itera)
gh pr review 42 --request-changes --body "Usar useCallback no hook SSE para evitar re-renders"
```

---

### Trabalhar numa task manualmente em paralelo com o Copilot

```bash
# Criar branch para task humana
git checkout -b feat/US-006-dark-mode-fix

# Trabalhar...
# Commit e push
git push -u origin feat/US-006-dark-mode-fix

# Abrir PR
gh pr create --title "[US-006] Dark mode: conformidade global" \
  --body "Fixes #6" \
  --base main
```

**Regra de ouro:** O Copilot usa branches `copilot/*`, os humanos usam `feat/*` ou `fix/*`. **Nunca fazem checkout do branch do outro.** Conflitos são impossíveis enquanto esta regra for respeitada.

---

## PARTE 3 — Branching Strategy (Anti-Collision)

### Convenção de Branches

```
main                          ← branch protegido; só via PR aprovado
├── feat/US-XXX-description   ← trabalho humano
├── fix/US-XXX-description    ← fix humano
├── copilot/US-XXX-*          ← trabalho do Copilot (automático)
└── chore/US-XXX-description  ← infra/config
```

### Regras de Dependência entre US

Quando a US-B depende da US-A:
1. A US-A deve estar merged em `main` antes de iniciar a US-B
2. O campo "Depends on" na issue indica a dependência: `Depends on #001`
3. O Copilot lê as dependências e aguarda se necessário (via steering)

### Tabela de US que NÃO podem correr em paralelo

As seguintes US tocam nos mesmos ficheiros e **não devem ser trabalhadas em simultâneo**:

| Conflito Potencial | US em Risco | Ficheiros Partilhados |
|---|---|---|
| Layout global + AI Sidebar | US-004 + US-027 | `App.jsx`, `Layout.jsx` |
| Unificação de páginas + Filtros | US-037 + US-044 | `pages/Transactions.jsx`, `pages/Alerts.jsx` |
| Modal redesign + SAR panel | US-038 + US-041 | `components/AlertDetailModal.jsx` |
| Dark mode global + Tabela SAR | US-006 + US-049 | `globals.css`, `components/Table.jsx` |
| Dados mock + Modelo ML | US-052 + US-054 | `data/sample-transactions.json`, `data/model.pkl` |
| FastAPI endpoints + SSE | US-056 + US-058 | `api/routes/alerts.py`, `api/routes/stream.py` |

### Sequência de Sprints Sugerida para Máxima Paralelização

```
Sprint 1 (paralelo possível):
  Thread A: US-006 (dark mode)      → feat/US-006-dark-mode
  Thread B: US-052 (dados mock)     → feat/US-052-realistic-mock-data
  Thread C: US-060 (debug plan)     → docs/US-060-gemini-debug-plan

Sprint 2 (paralelo possível):
  Thread A: US-001 (header link)    → feat/US-001-header-link
  Thread B: US-053 (schema update)  → feat/US-053-account-schema
  Thread C: US-061 (health check)   → feat/US-061-gemini-health-endpoint

Sprint 3 (sequencial - layout primeiro):
  Sequência obrigatória: US-004 → US-027 → US-029 → US-030
```

---

## PARTE 4 — Configuração do copilot-instructions.md

O ficheiro `.github/copilot-instructions.md` é lido pelo Copilot Coding Agent em cada sessão. **É o teu sistema de prompt para o agente.** Conteúdo mínimo obrigatório:

```markdown
# FinTrack AI — Copilot Instructions

## Stack Tecnológica
- Frontend: React 18 + Vite + TanStack Table v8 + shadcn/ui + Tailwind CSS
- Backend: FastAPI + uvicorn (Python 3.11)
- GenAI: LangGraph + Google Gemini 1.5 Flash/Pro
- Infra: AWS Lambda + SQS + DynamoDB + API Gateway (SAM)
- ML: scikit-learn Isolation Forest

## Convenções Críticas
- NUNCA usar cores hardcoded (bg-white, text-black). Usar sempre CSS variables do tema shadcn/ui
- SEMPRE suportar dark mode com variantes Tailwind (dark:bg-* dark:text-*)
- TODOS os strings de UI devem usar o sistema i18n em src/i18n/{en,pt}.json
- NUNCA expor API keys no frontend — usar endpoints FastAPI como proxy
- SEMPRE sincronizar filtros com URL query params via useSearchParams

## Estrutura de Ficheiros
[ver repo: src/components/, src/pages/, backend/api/, backend/genai/]

## Critérios de Qualidade por PR
- Zero console errors em modo dev
- Dark mode testado visualmente
- Nenhum elemento sobrepõe a AI Sidebar (width: 360px, CSS var: --sidebar-width)
- Filtros reflectidos no URL ao aplicar
```

---

## PARTE 5 — FAQ Rápido

**Q: O Copilot pode trabalhar em 5 issues ao mesmo tempo?**  
A: Sim. Cada issue = branch isolado = PR isolado. Não há colisão.

**Q: E se o Copilot fizer algo errado?**  
A: Deixa um comentário de review no PR. O agente lê e itera automaticamente.

**Q: Posso ver o que o Copilot está a fazer em tempo real?**  
A: Sim — no PR em draft, nos "Session Logs", e na extensão VS Code "Copilot on My Behalf".

**Q: E se eu quiser parar o Copilot a meio?**  
A: Fecha o PR. O agente para. O branch fica disponível para continuar manualmente.

**Q: O Copilot pode fazer merge automático?**  
A: Não. O PR sempre requer aprovação humana antes de merger. É uma garantia de segurança.

**Q: Funciona com o plano Free do GitHub Copilot?**  
A: O Copilot Coding Agent requer Copilot Pro ($10/mês) ou Pro+. O plano Free tem limite mensal mas não acesso ao coding agent. Verifica em github.com/settings/copilot se tens acesso.
