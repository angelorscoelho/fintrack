# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S09R_React_Dashboard_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → 2 MAJOR fixes aplicados em AlertsTable.jsx
- Ficheiros corrigidos / sobrescritos:
  - `frontend/src/components/AlertsTable.jsx` — (1) Emoji icons substituídos por lucide-react: Clock, CheckCircle2, CircleDot, Check, PauseCircle; (2) ScoreBadge threshold corrigido de `> 0.70` para `>= 0.70` para alinhar com PRD
- Pontos de atenção / restrições para o próximo EXEC:
  • InactivityOverlay props: `{ isVisible: bool, onResume: () => void }` — usar shadcn/ui Dialog (non-dismissable via backdrop click)
  • AlertDetail props: `{ alert, open, onClose, onResolved }` — usar shadcn/ui Sheet como side panel
  • useAlertStream signature: `(onNewAlert, isIdle, setIsConnected)` — implementar SSE + BroadcastChannel + Page Visibility
  • useInactivityTimer signature: `(timeoutMs) → { isIdle, resetTimer }` — implementar com eventos mousemove, keydown, etc.
  • STATUS_CONFIG agora usa lucide-react Icons (propriedade `Icon` com I maiúsculo, tipo componente React)
  • Badge variants disponíveis: default, secondary, destructive, outline, warning, success
  • Emojis permitidos em text labels (ex: SelectItem), mas NÃO como icons em JSX — usar sempre lucide-react
  • SWR polling para quando `isIdle === true` (refreshInterval: 0)
  • Vite proxy: `/api` → `http://localhost:8000`
  • `@` alias → `./src` em vite.config.js
  • shadcn/ui Dialog disponível em `@/components/ui/dialog` para InactivityOverlay
  • shadcn/ui Sheet disponível em `@/components/ui/sheet` para AlertDetail
  • `cn()` utility em `@/lib/utils` para className merging
  • ScoreBadge: destructive >90%, warning ≥70%, outline <70% (alinhado com PRD)
  • MINOR não corrigido: raw `<button>` para sort headers (aceitável para table headers)
  • MINOR não corrigido: `useMemo(() => data, [data])` é no-op (cosmético)
  • `npm run build` ✅ passa sem erros após fixes
  • Backend API shapes: AlertResponse (15+ campos), StatsResponse (9 campos incluindo rate_limits dict)
  • SSE URL: `GET /api/alerts/stream` — envia `data: {JSON}\n\n` + `: heartbeat\n\n`
  • Resolve: `PUT /api/alerts/{id}/resolve` body: `{resolution_type, analyst_notes}`
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
- Estado atual do repositório: pronto para S10E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R + S06E + S06R + S07E + S07R + S08E + S08R + S09E + S09R aplicados
