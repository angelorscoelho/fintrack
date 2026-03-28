# FinTrack AI — Branching Strategy & Anti-Collision Reference
# Keep this open on Screen 2 while working

## Branch Convention

```
main                                ← PROTEGIDO — só via PR aprovado
├── copilot/US-XXX-description      ← Copilot Coding Agent (automático)
├── feat/US-XXX-description         ← Trabalho humano — nova feature
├── fix/US-XXX-description          ← Trabalho humano — bug fix
└── docs/US-XXX-description         ← Documentação
```

**Regra de ouro:** Nunca fazer checkout de um branch `copilot/*`. Nunca.

---

## Mapa de Dependências (ordem obrigatória)

```
US-004 (Layout Grid)
  └── US-027 (AI Sidebar estrutura)
        ├── US-028 (Sugestões rápidas)
        ├── US-029 (Minimizar/restaurar)
        ├── US-030 (Ícone robô nos cards)
        └── US-031 (Endpoint /api/chat)

US-052 (Dados mock realistas)
  ├── US-053 (Schema account-to-account)
  │     └── US-023 (Mapa conta-a-conta)
  │           └── US-024 (Linhas animadas)
  │                 ├── US-025 (Chips mapa)
  │                 └── US-026 (Tooltip linhas)
  └── US-054 (Re-treinar modelo IF)

US-005 (URL sync)
  ├── US-032 (Multi-select categoria)
  ├── US-044 (Filtros Alerts)
  └── US-037 (Unificação páginas)

US-038 (Modal layout 2 colunas)
  ├── US-039 (Coluna dados)
  ├── US-040 (Painel XAI)
  │     └── US-042 (Botão Analisar)
  ├── US-041 (Painel SAR)
  │     └── US-043 (Export PDF)
  └── US-050 (SAR table actions)

US-056 (SSE pipeline)
  ├── US-057 (KPI refresh)
  ├── US-058 (Tabela refresh)
  └── US-059 (Fallback polling)

US-060 (Plano debug Gemini)
  └── US-061 (Health check endpoint)
        └── US-062 (Deserialização FastAPI)
              └── US-064 (Smoke tests)
```

---

## Tabela Anti-Colisão — Issues que NÃO podem ser trabalhadas em simultâneo

| Conflito | Issue A | Issue B | Ficheiros em Risco |
|---|---|---|---|
| Layout + Sidebar | #4 | #27 | `App.jsx`, `Layout.jsx` |
| Unificação + Filtros Alerts | #37 | #44 | `Transactions.jsx`, `Alerts.jsx` |
| Modal redesign + SAR panel | #38 | #41 | `AlertDetailModal/index.jsx` |
| Dark mode global + Tabela SAR | #6 | #49 | `globals.css`, tabelas |
| Dados mock + Schema | #52 | #53 | `sample-transactions.json` |
| Schema + Mapa | #53 | #23 | modelos Pydantic, DynamoDB |
| FastAPI core + SSE | #31 | #56 | `routes/stream.py`, `routes/chat.py` |
| ML model + Dados | #54 | #52 | `model.pkl`, `generator.py` |

---

## Sprint Parallelization Matrix

### Sprint 1 — 3 threads paralelas OK
```
Thread A (Copilot): US-006 — Dark mode → feat/US-006-dark-mode
Thread B (Copilot): US-052 — Dados mock → feat/US-052-realistic-data
Thread C (Human):   US-060 — Debug plan → docs/US-060-debug-plan
```

### Sprint 2 — 4 threads paralelas OK
```
Thread A (Copilot): US-061 — Health endpoint → feat/US-061-health-gemini
Thread B (Copilot): US-062 — Deserialização → fix/US-062-ai-explanation
Thread C (Human):   US-053 — Schema update → feat/US-053-account-schema
Thread D (Copilot): US-007 — Card 24h label → fix/US-007-card-label
```

### Sprint 3 — 2 threads (layout é sequencial)
```
Thread A (Human): US-004 → MERGE → US-027 (SEQUENCIAL, sem paralelo)
Thread B (Copilot): US-001, US-002, US-003 (pequenas, sem conflito)
```

### Sprint 4 — 3 threads (após US-038 merged)
```
US-038 (Human) → MERGE PRIMEIRO →
Thread A (Copilot): US-039 + US-040
Thread B (Copilot): US-044 + US-046
Thread C (Copilot): US-047 + US-048 + US-049
```

---

## Checklist antes de atribuir task ao Copilot

- [ ] Todas as dependências estão merged em main?
- [ ] A issue não tem conflito potencial com outra issue activa?
- [ ] O `.github/copilot-instructions.md` foi actualizado com contexto relevante?
- [ ] A issue tem critérios de aceitação claros e específicos?
- [ ] A issue está no milestone correcto?

---

## Comandos Úteis de Gestão

```bash
# Ver estado de todas as issues
gh issue list --repo angelorscoelho/fintrack --limit 100 --json number,title,state,labels,assignees

# Ver PRs do Copilot
gh pr list --repo angelorscoelho/fintrack --search "author:app/copilot-coding-agent"

# Atribuir issue ao Copilot
gh issue edit {NUMBER} --repo angelorscoelho/fintrack --add-assignee @copilot

# Ver issues bloqueadas
gh issue list --repo angelorscoelho/fintrack --label blocked

# Ver issues do Sprint actual
gh issue list --repo angelorscoelho/fintrack --milestone "Sprint 1 — Estabilização"

# Verificar branches activos
git branch -r | grep copilot/

# Smoke test rápido
bash scripts/smoke_test.sh https://www.angelorscoelho.dev/poc
```

---

## Critério de Merge — Definition of Done (aplicar antes de aprovar qualquer PR)

1. ✅ Zero console errors no browser (dev mode)
2. ✅ Dark mode testado manualmente em todas as páginas afectadas
3. ✅ Strings em i18n: adicionadas a `en.json` E `pt.json`
4. ✅ AI Sidebar offset respeitado (nenhum elemento sobrepõe --sidebar-width)
5. ✅ URL state: filtros e modais reflectidos no URL (onde aplicável)
6. ✅ Dados mock: distribuição realista (fraud rate 1-3%, avg score 10-18%)
7. ✅ Responsivo: testado em 1280px e 1920px
8. ✅ PR description: referencia a issue com `Fixes #XXX`
