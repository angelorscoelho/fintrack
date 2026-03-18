# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S08R_SSE_Resolve_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → 1 MAJOR fix aplicado (race condition no semáforo SSE)
- Ficheiros corrigidos / sobrescritos:
  - `backend/api/routes/stream.py` — semáforo agora adquirido no handler antes de criar o StreamingResponse (e libertado no finally do generator), eliminando race condition que permitia >3 conexões SSE simultâneas
- Pontos de atenção / restrições para o próximo EXEC:
  • API shapes confirmados para React — AlertResponse (15+ campos), StatsResponse (9 campos incluindo rate_limits dict)
  • SSE URL: `GET /api/alerts/stream` — envia `data: {JSON}\n\n` + `: heartbeat\n\n`
  • Resolve: `PUT /api/alerts/{id}/resolve` body: `{resolution_type, analyst_notes}`
  • Resolution types: CONFIRMED_FRAUD → RESOLVED, FALSE_POSITIVE → FALSE_POSITIVE, ESCALATED → RESOLVED
  • 503 no 4º SSE — frontend deve tratar gracefully (ex: sonner toast + retry)
  • Route order: stream.router registado ANTES de alerts.router para evitar conflito com `{transaction_id}`
  • `config.py` existe mas NÃO é usado — `dynamo.py` usa `os.environ` diretamente
  • `processing_status` NÃO está em AlertResponse — adicionar se UI precisar
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
  • CORS: localhost:3000 e localhost:5173 apenas
  • X-Request-ID middleware ativo em todas as respostas
  • Todas as rotas registadas em main.py: health, alerts, alerts/{id}, stats, alerts/{id}/resolve, alerts/stream
  • Swagger /docs carrega sem erros com todas as 5 route files
- Estado atual do repositório: pronto para S09R

## S09E — React Dashboard + Alerts Table (executado)

### Implementação realizada:
- **App.jsx**: Dashboard completo com header (ShieldAlert icon, StatsBar badges, Wifi/WifiOff SSE status, Clock idle indicator), filtro Select por status (all/PENDING_REVIEW/RESOLVED/FALSE_POSITIVE/rate_limited/NORMAL), SWR data fetching com refreshInterval condicionado por isIdle, Toaster sonner, AlertDetail + InactivityOverlay placeholders
- **AlertsTable.jsx**: TanStack Table v8 com 7 colunas (ID, Data/Hora, NIF, Montante, Categoria, Risco, Estado), ScoreBadge (destructive >90%, warning 70-90%, outline <70%), STATUS_CONFIG com 5 estados incluindo rate_limited ⏸, sorting, pagination (15/página), row click com onRowClick(row.original)
- **shadcn/ui setup**: Componentes Badge, Button, Card, Select, Dialog, Sheet, Alert criados manualmente (network offline para shadcn CLI), CSS variables configurados em index.css, tailwind.config.js atualizado com theme colors + tailwindcss-animate plugin
- **Hooks atualizados**: useInactivityTimer.js agora retorna { isIdle, resetTimer } (placeholder S10E), useAlertStream.js aceita (onNewAlert, isIdle, setIsConnected) (placeholder S10E)
- **InactivityOverlay.jsx**: Assinatura atualizada para { isVisible, onResume } (placeholder S10E)

### Dependências adicionadas:
- class-variance-authority, @radix-ui/react-dialog, @radix-ui/react-select, @radix-ui/react-slot, sonner, tailwindcss-animate

### Ficheiros criados:
- frontend/components.json
- frontend/src/lib/utils.js (cn utility)
- frontend/src/components/ui/badge.jsx, button.jsx, card.jsx, select.jsx, dialog.jsx, sheet.jsx, alert.jsx

### Ficheiros modificados:
- frontend/src/App.jsx — dashboard completo
- frontend/src/components/AlertsTable.jsx — tabela TanStack
- frontend/src/components/InactivityOverlay.jsx — nova assinatura
- frontend/src/hooks/useAlertStream.js — nova assinatura
- frontend/src/hooks/useInactivityTimer.js — nova assinatura + retorno { isIdle, resetTimer }
- frontend/src/index.css — CSS variables shadcn/ui
- frontend/tailwind.config.js — tema shadcn/ui + tailwindcss-animate
- frontend/package.json — novas dependências

### Verificação:
- `npm run build` ✅ passa sem erros
- `npm run dev` ✅ inicia em porta 5173
- Todos os 16 critérios de aceitação verificados e aprovados

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R + S06E + S06R + S07E + S07R + S08E + S08R + S09E aplicados
