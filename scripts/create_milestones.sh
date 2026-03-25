#!/bin/bash
# scripts/create_milestones.sh
# Cria os milestones (sprints) no repositório
# Usage: bash scripts/create_milestones.sh

REPO="angelorscoelho/fintrack"

echo "🏁 Creating sprint milestones for $REPO..."

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 1 — Estabilização" \
  -f description="US-006, US-052, US-060, US-061, US-062 | Foco: dark mode, dados mock, debugging Gemini" \
  -f due_on="2026-04-07T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 2 — Pipeline Gemini + Dados" \
  -f description="US-063, US-064, US-053, US-054, US-007, US-009, US-010 | Foco: integração Gemini funcional" \
  -f due_on="2026-04-21T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 3 — Header + Layout + Dark Mode" \
  -f description="US-001, US-002, US-003, US-004, US-005, US-048, US-049 | Foco: UX global" \
  -f due_on="2026-05-05T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 4 — Modal AI + Resolução de Alertas" \
  -f description="US-038, US-039, US-040, US-041, US-044, US-046, US-047 | Foco: análise AI no modal" \
  -f due_on="2026-05-19T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 5 — Transactions Unificada + Filtros" \
  -f description="US-032, US-033, US-035, US-036, US-037 | Foco: página unificada" \
  -f due_on="2026-06-02T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 6 — Real-time Sync" \
  -f description="US-055, US-056, US-057, US-058, US-059 | Foco: SSE + auto-refresh" \
  -f due_on="2026-06-16T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 7 — AI Sidebar" \
  -f description="US-027, US-028, US-029, US-030, US-031 | Foco: assistente AI persistente" \
  -f due_on="2026-06-30T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 8 — Dashboard + Mapa" \
  -f description="US-011, US-012, US-013, US-015, US-017, US-018, US-023, US-024, US-025 | Foco: gráficos + mapa" \
  -f due_on="2026-07-14T00:00:00Z"

gh api repos/$REPO/milestones --method POST \
  -f title="Sprint 9 — Refinamento & Should Have" \
  -f description="Restante Should Have + Could Have | Foco: polish e features adicionais" \
  -f due_on="2026-07-28T00:00:00Z"

echo "✅ All milestones created!"
echo ""
echo "📋 List milestones with: gh api repos/$REPO/milestones | jq '.[].number, .[].title'"
