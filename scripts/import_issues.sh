#!/bin/bash
# scripts/import_issues.sh
# Importa todas as 64 User Stories como GitHub Issues
# Usage: bash scripts/import_issues.sh
# Pré-requisito: gh auth login + bash scripts/create_labels.sh + bash scripts/create_milestones.sh

REPO="angelorscoelho/fintrack"

echo "📥 Importing 64 User Stories to $REPO..."
echo "⏱️  This will take ~5 minutes (API rate limiting)..."

# Helper function
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="$4"

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone"

  sleep 1  # evitar rate limiting
}

# ============================================================
# EP-01 — Header & Navegação Global | Sprint 3
# ============================================================

create_issue \
  "[US-001] Header: título 'FinTrack AI' como link para homepage" \
  "## Contexto
O título 'FinTrack AI' no header não tem link. Actualmente o utilizador não consegue voltar à homepage ao clicar no logo.

## Visual de Referência
- **img1, elemento 1** — 'FinTrack AI' com ícone de escudo; texto estático sem link
- Mesmo problema em img2, img4, img5

## Critérios de Aceitação
- [ ] O título 'FinTrack AI' e o ícone de escudo são encapsulados num \`<Link to=\"/\">\` (React Router)
- [ ] Cursor muda para \`pointer\` ao hover
- [ ] Sem sublinhado ou alteração visual do texto
- [ ] Comportamento consistente em todas as rotas: /, /transactions, /alerts, /reports
- [ ] Não abre novo separador

## Notas Técnicas
- Localizar componente \`Header\` ou \`Navbar\` partilhado
- Encapsular logo + título com \`<Link to=\"/\">\` do React Router

## Definition of Done
- [ ] Dark mode ✓
- [ ] i18n: N/A (logo não tem texto traduzível)
- [ ] Zero console errors" \
  "epic:EP-01,priority:must-have,sp:1,type:feature,assignee:copilot" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-002] Header: substituir ícone globo por ícone 'Languages' + dropdown EN/PT" \
  "## Contexto
O selector de idioma no header mostra um ícone de globo. O pedido é substituir pelo ícone \`Languages\` de lucide-react e tornar o dropdown funcional para EN/PT.

## Visual de Referência
- **img1, elemento 2** — botão '0 EN' com ícone de globo mal renderizado
- **img2, img4, img5** — botão 'EN' mais visível

## Critérios de Aceitação
- [ ] Ícone de globo substituído pelo ícone \`Languages\` de lucide-react
- [ ] Clicar abre dropdown com: 🇬🇧 English (EN) e 🇵🇹 Português (PT)
- [ ] Idioma activo mostra checkmark no dropdown
- [ ] Idioma por defeito: Inglês (EN)
- [ ] Mudar idioma actualiza todos os textos estáticos sem reload
- [ ] Preferência persiste em localStorage
- [ ] Fecha com click-away ou ESC
- [ ] Botão mostra código activo: 'EN' ou 'PT'

## Notas Técnicas
- Implementar \`LanguageContext\` com \`{ lang, setLang }\`
- Ficheiros: \`src/i18n/en.json\` + \`src/i18n/pt.json\`
- Strings a traduzir: labels KPI, headers tabela, tooltips, botões, mensagens erro

## Definition of Done
- [ ] Dark mode ✓
- [ ] i18n: este é o próprio sistema de i18n
- [ ] Zero console errors" \
  "epic:EP-01,priority:should-have,sp:3,type:feature,assignee:human" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-003] Header: tooltip no ícone de estado de rede/API (elemento 3)" \
  "## Contexto
O ícone vermelho com traço diagonal no header (elemento 3) não tem explicação para o utilizador.

## Visual de Referência
- **img1, elemento 3** — ícone de rede com barra diagonal vermelha no canto superior direito
- Mesmo ícone em img2, img4, img5

## Critérios de Aceitação
- [ ] Hover sobre elemento 3 → tooltip após ~300ms
- [ ] Offline/sem API: 'API desligada — a mostrar dados de demonstração'
- [ ] Online/com API: 'Ligado à API — dados em tempo real activos'
- [ ] Ícone: vermelho com diagonal (offline) vs verde sem diagonal (online)
- [ ] Usar componente \`Tooltip\` do shadcn/ui

## Notas Técnicas
- Estado derivado do healthcheck da API existente

## Definition of Done
- [ ] Dark mode ✓
- [ ] i18n: tooltip text em en.json + pt.json
- [ ] Zero console errors" \
  "epic:EP-01,priority:should-have,sp:1,type:feature,assignee:copilot" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-004] Layout global: suporte para AI Sidebar (CSS Grid offset 360px)" \
  "## Contexto
O layout raiz da aplicação precisa de suportar um painel lateral fixo à direita (AI Sidebar).
O elemento 11 da img1 é o espaço vazio reservado para este componente.

## Visual de Referência
- **img1, elemento 11** — área rectangular vazia à direita do dashboard (~20-25% largura)

## ⚠️ CRÍTICO: Esta US é pré-requisito para US-027 (AI Sidebar)

## Critérios de Aceitação
- [ ] Layout root usa CSS Grid: \`main-content\` (flex: 1) + \`ai-sidebar\` (360px quando aberta, 0 quando fechada)
- [ ] Transição: \`transition: width 300ms ease\`
- [ ] Nenhum modal/drawer sobrepõe a sidebar
- [ ] Funciona em 1280px e 1920px
- [ ] CSS variable: \`--sidebar-width: 360px\`
- [ ] \`SidebarContext\` com \`{ isOpen, toggle }\` acessível globalmente

## Notas Técnicas
- Editar \`App.jsx\` ou criar \`Layout.jsx\`
- Todos os modais (Sheet, Dialog) herdam o container esquerdo
- Rever z-index de todos os overlays

## Dependências
- Bloqueado por: nenhuma
- Bloqueia: #27 (AI Sidebar)

## Definition of Done
- [ ] Dark mode ✓
- [ ] Funciona em 1280px e 1920px ✓
- [ ] Zero console errors" \
  "epic:EP-01,priority:must-have,sp:5,type:feature,assignee:human" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-005] Filtros activos sincronizados no URL via query params" \
  "## Contexto
Filtros aplicados devem ser reflectidos no URL para permitir partilha de vistas filtradas e navegação via cards KPI.

## Critérios de Aceitação
- [ ] Aplicar filtro adiciona query params: ex. \`?status=PENDING_REVIEW&category=electronics\`
- [ ] Carregar URL com params → filtros aplicados automaticamente
- [ ] 'Reset All' limpa filtros e URL params
- [ ] Browser Back restaura filtros anteriores
- [ ] Múltiplos valores: \`?category=electronics&category=retail\`
- [ ] Banner 'Filtros aplicados a partir do Dashboard' quando injectados externamente

## Notas Técnicas
- Usar \`useSearchParams\` do React Router v6
- Sincronização bidireccional: state → URL e URL → state no mount

## Definition of Done
- [ ] Testado com navegação back/forward ✓
- [ ] Zero console errors" \
  "epic:EP-01,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-006] Dark mode: conformidade visual global em todos os componentes" \
  "## Contexto
Existem componentes com cores hardcoded que quebram o dark mode.

## Visual de Referência
- **img5, elemento 2** — tabela SAR Reports: linhas brancas a partir da 3ª row em dark mode
- Problema pode existir em outras tabelas

## Critérios de Aceitação
- [ ] Todas as rows da tabela SAR Reports têm fundo dark correcto
- [ ] Auditoria completa de todas as tabelas nas 5 páginas
- [ ] Nenhum \`bg-white\`, \`text-black\`, \`backgroundColor: 'white'\` hardcoded
- [ ] Todos os componentes usam CSS variables do tema: \`--background\`, \`--foreground\`, \`--card\`
- [ ] Dark mode toggle funciona em todas as páginas sem refresh

## Notas Técnicas
- Procurar: \`bg-white\`, \`text-black\`, \`background: white\`, \`style={{ background\`
- Causa provável img5: \`<tr>\` com estilo inline sem variante dark

## Definition of Done
- [ ] Testado em dark mode em todas as páginas ✓
- [ ] Zero console errors" \
  "epic:EP-01,priority:must-have,sp:3,type:bug,assignee:copilot" \
  "Sprint 1 — Estabilização"

# ============================================================
# EP-02 — KPI Cards | Sprint 2
# ============================================================

create_issue \
  "[US-007] Card 4: label 'Últimas 24 horas' em vez de 'Today'" \
  "## Visual de Referência
- **img1, elemento 4** — card mostra 'TRANSACTIONS TODAY · 80'

## Critérios de Aceitação
- [ ] Label: 'TRANSACTIONS LAST 24H' (EN) / 'TRANSAÇÕES ÚLTIMAS 24H' (PT)
- [ ] Lógica: \`timestamp >= now - 86400s\` (janela deslizante, não meia-noite)
- [ ] Aplica-se a dados reais e mock
- [ ] Sub-label ou tooltip: 'Desde HH:MM de {data}'

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | Zero console errors" \
  "epic:EP-02,priority:must-have,sp:1,type:feature,assignee:copilot" \
  "Sprint 2 — Pipeline Gemini + Dados"

create_issue \
  "[US-008] Cards 4-9: tooltips de acção ao hover" \
  "## Visual de Referência
- **img1, elementos 4, 5, 6, 7, 8, 9** — todos clicáveis sem tooltip explicativo

## Critérios de Aceitação
- [ ] Card 4 (hover card inteiro): 'Clique para ver histórico de transações das últimas 24h'
- [ ] Card 5 (hover card inteiro): 'Clique para consultar análise do rácio de fraude'
- [ ] Card 6 (hover card inteiro): 'Clique para ver alertas críticos não revistos'
- [ ] Card 7 (hover card inteiro): 'Clique para ver distribuição de scores de anomalia'
- [ ] Card 9 (hover no botão VIEW apenas): 'Ver detalhes desta transação'
- [ ] Usar componente \`Tooltip\` do shadcn/ui
- [ ] Delay: 400ms antes de aparecer

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | Zero console errors" \
  "epic:EP-02,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 3 — Header + Layout + Dark Mode"

create_issue \
  "[US-009] Card 6: renomear para 'Alertas Críticos Não Revistos'" \
  "## Visual de Referência
- **img1, elemento 6** — card mostra 'CRITICAL ALERTS · 5' com fundo vermelho

## Critérios de Aceitação
- [ ] Label: 'CRITICAL UNREVIEWED' (EN) / 'CRÍTICOS NÃO REVISTOS' (PT)
- [ ] Contagem: \`anomaly_score > 0.90\` E \`status = PENDING_REVIEW\` apenas
- [ ] RESOLVED e FALSE_POSITIVE excluídos
- [ ] Lógica corrigida em API e dados mock

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | Zero console errors" \
  "epic:EP-02,priority:must-have,sp:1,type:bug,assignee:copilot" \
  "Sprint 2 — Pipeline Gemini + Dados"

create_issue \
  "[US-010] Cards 5 e 7: dados mock com valores estatísticos realistas" \
  "## Contexto
- **img1, elemento 5** — FRAUD RATE: 27.5% (implausível — implica 22/80 transações fraudulentas)
- **img1, elemento 7** — AVERAGE SCORE: 43.9% (implausível — implicaria 45% de risco médio)

## Critérios de Aceitação
- [ ] Fraud Rate mock: entre **2% e 5%** (ex: 3.8%)
- [ ] Average Score mock: entre **10% e 18%** (ex: 12.4%)
- [ ] Valores calculados a partir dos mesmos dados da tabela (não hardcoded)
- [ ] Com API activa: valores calculados sobre dados reais DynamoDB

## Dependências
- Bloqueado por: #52 (regeneração dados mock)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-02,priority:must-have,sp:3,type:bug,assignee:copilot" \
  "Sprint 2 — Pipeline Gemini + Dados"

create_issue \
  "[US-011] Cards KPI: navegação para vista filtrada ao clicar" \
  "## Critérios de Aceitação
- [ ] Card 4 → \`/transactions?period=24h\`
- [ ] Card 5 → \`/transactions?status=CONFIRMED_FRAUD\`
- [ ] Card 6 → \`/alerts?status=PENDING_REVIEW&minScore=90\`
- [ ] Card 7 → \`/alerts\` com distribuição de scores
- [ ] Filtros injectados via query params (US-005)

## Dependências
- Bloqueado por: #5 (URL sync)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-02,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

# ============================================================
# EP-03 — Gráfico Hourly Volume | Sprint 8
# ============================================================

create_issue \
  "[US-012] Chart: converter para Stacked Bar Chart (3 categorias de risco)" \
  "## Visual de Referência
- **img1, elemento 8** — barras simples cinzentas + linha vermelha de Fraud Rate (2 eixos Y)

## Critérios de Aceitação
- [ ] Cada barra: 3 segmentos — topo vermelho (>90%), meio laranja (70-90%), base cinza (<70%)
- [ ] Legenda: '🔴 Crítico', '🟠 Suspeito', '⚪ Normal'
- [ ] Linha de Fraud Rate removida
- [ ] Eixo Y: contagem de transações apenas (não %)
- [ ] Altura total = volume total por hora

## Notas Técnicas
- Recharts: 3 \`<Bar>\` com \`stackId='a'\`
- Chart.js: \`stacked: true\` com 3 datasets

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-03,priority:must-have,sp:5,type:feature,assignee:human" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-013] Chart: representar as últimas 24 horas (janela deslizante)" \
  "## Visual de Referência
- **img1, elemento 8** — eixo X começa nas 22h sem contexto claro de período

## Critérios de Aceitação
- [ ] Eixo X: últimas 24 horas por blocos de 1h (now-24h a now)
- [ ] Período calculado dinamicamente, não meia-noite a meia-noite
- [ ] Título: 'Hourly Volume — Últimas 24 horas'
- [ ] Hora actual destacada (opacity ou borda diferente)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-03,priority:must-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-014] Chart: tooltip com contagem e percentagem por categoria de risco" \
  "## Critérios de Aceitação
- [ ] Hover sobre barra mostra: '14:00h — 24 transações total'
- [ ] Por categoria: '🔴 Crítico: 3 (12.5%) | 🟠 Suspeito: 7 (29.2%) | ⚪ Normal: 14 (58.3%)'
- [ ] Ponto colorido antes de cada categoria
- [ ] Tooltip não sai dos limites do viewport

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-03,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-015] Chart: chips de filtro por categoria no rodapé do gráfico" \
  "## Visual de Referência
- **img1, elemento 8** — rodapé tem apenas 'Fraud Rate % | Total' como legenda estática

## Critérios de Aceitação
- [ ] Substituir legenda por 3 chips interactivos: '🔴 Crítico', '🟠 Suspeito', '⚪ Normal'
- [ ] Por defeito todos activos
- [ ] Toggle: mostra/esconde segmento correspondente
- [ ] Chip inactivo: opacity reduzida + borda tracejada
- [ ] Design consistente com chips do card 9 e mapa

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-03,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-016] Chart: barra de scroll para zoom temporal" \
  "## Critérios de Aceitação
- [ ] Barra de range no topo com dois handles arrastáveis
- [ ] Arrastar = reduz janela temporal
- [ ] Labels eixo X actualizam-se (15min ou 30min em zoom)
- [ ] Botão 'Reset Zoom' volta a 24h
- [ ] Miniatura do gráfico na barra para contexto

## Notas Técnicas
- Recharts: \`<Brush>\` nativo
- Chart.js: \`chartjs-plugin-zoom\`

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-03,priority:could-have,sp:5,type:feature,assignee:copilot" \
  "Sprint 9 — Refinamento & Should Have"

# ============================================================
# EP-04 — High Risk Transactions Card 9 | Sprint 8
# ============================================================

create_issue \
  "[US-017] Card 9: filtrar apenas transações críticas e suspeitas (score >= 0.70)" \
  "## Visual de Referência
- **img1, elemento 9** — lista 'High Risk Transactions'; pode incluir transações normais

## Critérios de Aceitação
- [ ] Query: \`anomaly_score >= 0.70\` E \`status = PENDING_REVIEW\`
- [ ] NORMAL, RESOLVED, FALSE_POSITIVE excluídos
- [ ] Contador no header reflecte apenas transações filtradas
- [ ] Estado vazio: '✓ Sem alertas pendentes'

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-04,priority:must-have,sp:2,type:bug,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-018] Card 9: ordenação por severidade (score descendente)" \
  "## Visual de Referência
- **img1, elemento 9** — items em ordem: 63.5%, 55.9%, 67.7%, 98.2%, 58.4% — sem ordenação por severidade

## Critérios de Aceitação
- [ ] Ordenação por \`anomaly_score\` DESC (maior no topo)
- [ ] Resultado esperado: 98.2% → 67.7% → 63.5% → 58.4% → 55.9%
- [ ] Ordenação secundária: \`timestamp\` DESC em caso de empate

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-04,priority:must-have,sp:2,type:bug,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-019] Card 9: chips de filtro por nível de risco (crítico/suspeito)" \
  "## Critérios de Aceitação
- [ ] 2 chips no header: '🔴 Crítico (>90%)' e '🟠 Suspeito (70-90%)'
- [ ] Por defeito ambos activos
- [ ] Toggle mostra/esconde alertas do nível correspondente
- [ ] Contador actualiza em função dos chips activos

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-04,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-020] Card 9: ícone de robô por item para injectar contexto na AI Sidebar" \
  "## Critérios de Aceitação
- [ ] Ícone 🤖 por item (opacity 40% → 100% no hover)
- [ ] Clicar: AI Sidebar abre + recebe contexto do alerta
- [ ] Contexto: \`{ type: 'alert', transaction_id, score, amount, category, ai_explanation }\`
- [ ] Prompt pré-formatado na sidebar

## Dependências
- Bloqueado por: #27 (AI Sidebar)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-04,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 7 — AI Sidebar"

# ============================================================
# EP-05 — Donut & Layout | Sprint 8
# ============================================================

create_issue \
  "[US-021] Card 10: estreitar largura; card 9 cresce em altura" \
  "## Visual de Referência
- **img1, elementos 8, 9, 10** — card 10 ocupa largura total; card 9 é curto

## Layout Target
\`\`\`
[Card 4] [Card 5] [Card 6] [Card 7]
[Card 8 ~50%]    [Card 9 ~50%, TALL]
[Card 10 ~50%]   [Card 9 continua ↑]
[Card 12 Map — full width]
\`\`\`

## Critérios de Aceitação
- [ ] Card 10 → coluna esquerda, mesma largura que card 8
- [ ] Card 9 → expande verticalmente para coluna direita
- [ ] Card 9 tem scroll interno se necessário
- [ ] Implementado via CSS Grid
- [ ] Funciona em 1280px e 1920px

## Definition of Done
- [ ] Dark mode ✓ | Responsivo ✓ | Zero console errors" \
  "epic:EP-05,priority:should-have,sp:3,type:feature,assignee:human" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-022] Card 10: chips de filtro por nível de risco no donut chart" \
  "## Critérios de Aceitação
- [ ] 3 chips: '🔴 Crítico', '🟠 Suspeito', '⚪ Normal' (por defeito 'Todos')
- [ ] Seleccionar categoria actualiza o donut para mostrar só essa distribuição
- [ ] Título do card actualiza: 'Transactions by Category — Crítico'
- [ ] Donut re-anima ao mudar filtro

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-05,priority:could-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 9 — Refinamento & Should Have"

# ============================================================
# EP-06 — Alert Map | Sprint 8
# ============================================================

create_issue \
  "[US-023] Mapa: redesenhar para modelo conta-a-conta (account-to-account)" \
  "## Visual de Referência
- **img1, elemento 12** — pontos isolados em países sem conexão; usa NIF como identificador

## Critérios de Aceitação
- [ ] Schema inclui: \`source_country\`, \`destination_country\`, \`transaction_type\`
- [ ] Tipos suportados: bank_transfer (80%), card_payment (10%), digital_wallet (7%), cash (3%)
- [ ] Dados mock actualizados com novos campos
- [ ] FastAPI Pydantic model actualizada
- [ ] DynamoDB schema actualizado
- [ ] Campos antigos (merchant_nif) mantidos como deprecated

## Dependências
- Bloqueado por: #52 (dados mock actualizados)

## Definition of Done
- [ ] Zero console errors" \
  "epic:EP-06,priority:must-have,sp:5,type:refactor,assignee:human" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-024] Mapa: linhas animadas origem-destino com cor por nível de risco" \
  "## Critérios de Aceitação
- [ ] Cada transação → linha arco (Bézier) entre origem e destino
- [ ] Linha ponteada com animação de fluxo (stroke-dashoffset CSS animation)
- [ ] Cor: vermelho (>90%), laranja (70-90%), cinza translúcido (<70%)
- [ ] Espessura proporcional ao valor: ≤€100=1px, €100-1k=2px, >€1k=3px
- [ ] Clicar numa linha → modal da transação
- [ ] Múltiplas transações entre mesmo par de países → linha mais espessa + badge contagem

## Notas Técnicas
- SVG overlay sobre mapa existente
- CSS: \`stroke-dasharray: 8 4; animation: dash 1s linear infinite\`

## Dependências
- Bloqueado por: #23 (schema account-to-account)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-06,priority:must-have,sp:8,type:feature,assignee:human" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-025] Mapa: chips de filtro por nível de risco" \
  "## Critérios de Aceitação
- [ ] 3 chips sobre o mapa (canto sup. esq.): '🔴 Crítico', '🟠 Suspeito', '⚪ Normal'
- [ ] Por defeito todos activos
- [ ] Toggle: mostra/esconde linhas e marcadores do nível

## Dependências
- Bloqueado por: #24 (linhas animadas)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-06,priority:must-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

create_issue \
  "[US-026] Mapa: tooltip de transação ao hover na linha" \
  "## Critérios de Aceitação
- [ ] Hover sobre linha → tooltip com: ID abreviado, valor, categoria, score, hora
- [ ] Tooltip segue o cursor
- [ ] Linhas agrupadas: '3 transações — clique para ver detalhes'

## Dependências
- Bloqueado por: #24

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-06,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 8 — Dashboard + Mapa"

# ============================================================
# EP-07 — AI Sidebar | Sprint 7
# ============================================================

create_issue \
  "[US-027] AI Sidebar: estrutura base, boas-vindas e input" \
  "## Visual de Referência
- **img1, elemento 11** — área vazia à direita do dashboard (~20-25% viewport)

## Critérios de Aceitação
- [ ] Sidebar: coluna direita do layout (360px, ver US-004)
- [ ] Header: ícone 🤖 + 'FinTrack AI Assistant' + botão X
- [ ] Área de mensagens com scroll independente
- [ ] Mensagem de boas-vindas na primeira abertura
- [ ] Input na base + botão Enviar
- [ ] Envio por Enter (Shift+Enter para nova linha)
- [ ] Mensagens user → direita (azul); AI → esquerda (neutro)
- [ ] Indicador 'a escrever...' durante espera da API
- [ ] 2-3 sugestões de acção rápida quando vazia

## Notas Técnicas
- Componente: \`src/components/ai-sidebar/AISidebar.jsx\`
- Estado: \`messages[]\`, \`isLoading\`, \`currentContext\`
- API via endpoint FastAPI \`POST /api/chat\` (nunca expor key no frontend)

## Dependências
- Bloqueado por: #4 (layout offset)

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | AI Sidebar offset ✓ | Zero console errors" \
  "epic:EP-07,priority:must-have,sp:8,type:feature,assignee:human" \
  "Sprint 7 — AI Sidebar"

create_issue \
  "[US-028] AI Sidebar: sugestões de acção rápida contextuais" \
  "## Critérios de Aceitação
- [ ] Sem histórico → 2-3 chips/botões de sugestão
- [ ] Sugestões globais: 'Resumo alertas de hoje', 'Transações de maior risco', 'O que é o score de anomalia'
- [ ] Sugestões adaptam-se ao contexto da página
- [ ] Clicar → popula e submete o prompt automaticamente
- [ ] Após envio → sugestões desaparecem

## Dependências
- Bloqueado por: #27

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | Zero console errors" \
  "epic:EP-07,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 7 — AI Sidebar"

create_issue \
  "[US-029] AI Sidebar: minimizar e ícone de robô para restaurar" \
  "## Critérios de Aceitação
- [ ] Botão X → fecha sidebar com slide-out (~300ms)
- [ ] Com sidebar fechada → conteúdo principal expande para 100%
- [ ] Ícone 🤖 flutuante na borda direita
- [ ] Clicar → reabre com histórico preservado
- [ ] Estado persiste em localStorage

## Dependências
- Bloqueado por: #27

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-07,priority:must-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 7 — AI Sidebar"

create_issue \
  "[US-030] AI Sidebar: ícone de robô em todos os cards para injectar contexto" \
  "## Critérios de Aceitação
- [ ] Todos os cards têm ícone 🤖 no canto sup. direito (16px, opacity 30% → 100% hover)
- [ ] Clicar → sidebar abre + recebe contexto do card
- [ ] Contexto definido por card:
  - KPI (4-7): \`{ card: 'kpi_{name}', value, label, period, delta }\`
  - Chart (8): \`{ card: 'hourly_volume', last24h_data, peak_hour }\`
  - High Risk (9): \`{ card: 'high_risk', alerts: top5 }\`
  - Donut (10): \`{ card: 'category_distribution', categories }\`
  - Map (12): \`{ card: 'geo_map', transactions_visible }\`
- [ ] Mensagem confirma: '📊 Contexto carregado: [nome do card]'

## Dependências
- Bloqueado por: #27

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-07,priority:should-have,sp:5,type:feature,assignee:human" \
  "Sprint 7 — AI Sidebar"

create_issue \
  "[US-031] AI Sidebar: endpoint FastAPI POST /api/chat com Gemini Flash" \
  "## Critérios de Aceitação
- [ ] Endpoint \`POST /api/chat\` aceita: \`{ message, context, history }\`
- [ ] System prompt: especialista em fraude financeira
- [ ] Contexto truncado a max 2000 tokens
- [ ] Histórico: últimos 10 turnos
- [ ] Rate limiting: max 20 req/min por sessão
- [ ] Erros retornam mensagem amigável

## Notas Técnicas
- Adicionar \`routes/chat.py\` ao módulo FastAPI
- Context injectado como JSON no user message

## Definition of Done
- [ ] Zero console errors | API key nunca exposta no frontend" \
  "epic:EP-07,priority:must-have,sp:5,type:feature,assignee:human" \
  "Sprint 7 — AI Sidebar"

# ============================================================
# EP-08 — Transactions Page | Sprint 5
# ============================================================

create_issue \
  "[US-032] Transactions: filtro categoria com multi-select e Reset All" \
  "## Visual de Referência
- **img2, elemento 1** — dropdown 'All Categories' (single-select actualmente)

## Critérios de Aceitação
- [ ] Multi-select com checkboxes por categoria
- [ ] Opções: online, gas_station, electronics, restaurant, pharmacy, retail, supermarket, travel, + outras
- [ ] 'Seleccionar Todas' e 'Reset' disponíveis
- [ ] Trigger mostra categorias activas como tags (ex: 'electronics +2')
- [ ] Sincronizado com URL params (#5)

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | URL sync ✓ | Zero console errors" \
  "epic:EP-08,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

create_issue \
  "[US-033] Transactions: date range picker com calendário e presets" \
  "## Visual de Referência
- **img2, elemento 2** — dois campos de texto 'mm/dd/yyyy' sem calendário visual

## Critérios de Aceitação
- [ ] Clicar → calendário visual de selecção de range
- [ ] Presets: 'Hoje', 'Últimas 24h', 'Últimos 7 dias', 'Últimos 30 dias'
- [ ] Formato adapta-se ao idioma (PT: DD/MM/YYYY; EN: MM/DD/YYYY)
- [ ] Máximo: 90 dias de intervalo
- [ ] Limpar → 'All dates' + remove params URL

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | URL sync ✓ | Zero console errors" \
  "epic:EP-08,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

create_issue \
  "[US-034] Transactions: coluna Platform com ícones de método de pagamento" \
  "## Visual de Referência
- **img2, elemento 4** com anotação 'paypal, mbway, etc.' — coluna 'platform' existe

## Critérios de Aceitação
- [ ] Coluna 'platform' mostra método como badge com ícone
- [ ] Mapeamento: 💳 MB Way, 🅿 PayPal, 🏦 Transferência Bancária, 💰 Numerário, 🌐 Online
- [ ] Dados mock incluem \`payment_platform\`
- [ ] Coluna filtrável

## Dependências
- Bloqueado por: #52 (dados mock actualizados)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-08,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

create_issue \
  "[US-035] Transactions: ordenação e filtro de status nas colunas da tabela" \
  "## Visual de Referência
- **img2, elemento 6** — coluna Status com badges NORMAL, RESOLVED, FALSE_POSITIVE

## Critérios de Aceitação
- [ ] Coluna Status tem dropdown de filtro no header
- [ ] Opções: All, Normal, Pending Review, Resolved, False Positive, Confirmed Fraud
- [ ] Amount e Date têm ordenação ASC/DESC via clique no header
- [ ] Coluna ordenada mostra indicador ↑ ou ↓

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-08,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

create_issue \
  "[US-036] Transactions: modal de detalhe acessível via clique na linha" \
  "## Contexto
Actualmente o modal abre de forma limitada. Clicar em qualquer parte da linha deve abrir o modal.

## Visual de Referência
- **img2 → img3** — clicar numa linha abre 'Transaction Details'

## Critérios de Aceitação
- [ ] Clicar em qualquer célula da linha → abre modal de detalhe
- [ ] Cursor: \`pointer\` ao hover sobre linha
- [ ] URL actualiza: \`?modal={transaction_id}\`
- [ ] ESC ou X → remove query param
- [ ] URL com \`?modal={id}\` → abre modal automaticamente

## Definition of Done
- [ ] Dark mode ✓ | URL sync ✓ | Zero console errors" \
  "epic:EP-08,priority:must-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 5 — Transactions Unificada + Filtros"

create_issue \
  "[US-037] Transactions & Alerts: unificação das duas páginas numa só" \
  "## Visual de Referência
- **img2** — /transactions: Transaction History com filtros categoria/data
- **img4** — /alerts: Alert Queue com filtros status/score/categoria + mesma tabela

## Critérios de Aceitação
- [ ] Uma única rota \`/transactions\` com tabela unificada
- [ ] Rota \`/alerts\` continua mas usa mesmo componente com filtros pré-aplicados: \`status=PENDING_REVIEW\`
- [ ] Filtros são os mesmos componentes partilhados
- [ ] Breadcrumb/título adapta-se conforme filtros activos
- [ ] Clicar card 6 → \`/transactions?status=PENDING_REVIEW&minScore=90\` com banner

## Dependências
- Bloqueado por: #5 (URL sync), #32 (multi-select)

## ⚠️ ATENÇÃO: Esta US toca em múltiplos ficheiros. Não deve correr em paralelo com #44 (Alerts filters)

## Definition of Done
- [ ] Dark mode ✓ | URL sync ✓ | AI Sidebar offset ✓ | Zero console errors" \
  "epic:EP-08,priority:must-have,sp:8,type:refactor,assignee:human" \
  "Sprint 5 — Transactions Unificada + Filtros"

# ============================================================
# EP-09 — Modal AI Analysis Panel | Sprint 4
# ============================================================

create_issue \
  "[US-038] Modal: layout expandido com painel AI lado a lado" \
  "## Visual de Referência
- **img3** — modal 'Transaction Details' estreito (~500px), apenas 7 campos, sem análise AI

## Critérios de Aceitação
- [ ] Modal: \`min(80vw, 1200px)\` de largura
- [ ] Layout 2 colunas: dados transação (~40%) + painel AI (~60%)
- [ ] Scroll independente em cada coluna
- [ ] Header abrange as 2 colunas com botão X
- [ ] <900px: colapsa para coluna única
- [ ] Respeita offset da AI Sidebar

## Dependências
- Bloqueado por: #4 (layout offset)
- Bloqueia: #39, #40, #41, #42, #43

## Definition of Done
- [ ] Dark mode ✓ | Responsivo ✓ | AI Sidebar offset ✓ | Zero console errors" \
  "epic:EP-09,priority:must-have,sp:5,type:feature,assignee:human" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-039] Modal: coluna esquerda com dados estruturados por secções" \
  "## Visual de Referência
- **img3** — lista simples: Merchant, Category, Amount, Date, Status, Anomaly Score, Country

## Critérios de Aceitação
- [ ] Secções: Identificação, Dados Financeiros, Análise de Risco, Contexto
- [ ] Transaction ID completo com botão copy-to-clipboard
- [ ] Amount em destaque grande (já existe — manter)
- [ ] Anomaly Score com barra de progresso colorida (verde/laranja/vermelho)
- [ ] Data em formato legível: 'Mar 24, 2026, 8:52 PM'
- [ ] Country de origem + Country de destino

## Dependências
- Bloqueado por: #38

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-09,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-040] Modal: painel XAI Gemini Flash (coluna direita)" \
  "## Contexto
O modal actual (img3) não tem qualquer análise AI. A coluna direita deve mostrar o XAI do Gemini Flash.

## Critérios de Aceitação
- [ ] Painel XAI quando \`ai_explanation\` preenchido no DynamoDB
- [ ] Header: '🤖 Análise AI — Por que esta transação é anómala?'
- [ ] \`summary_pt\` em destaque, em itálico
- [ ] 3 bullets com ícones (⚠️ 📊 🔍) e textos
- [ ] Badge \`risk_level\` (MEDIUM/HIGH) com cor correspondente
- [ ] Null: '⏳ Análise AI em processamento...' com spinner
- [ ] Error: mensagem de erro + botão '🔄 Tentar Novamente'
- [ ] Score < 70%: 'ℹ️ Score abaixo do limiar de análise AI (70%)'

## Dependências
- Bloqueado por: #38, PRD Task 3.1 implementada

## Definition of Done
- [ ] Dark mode ✓ | Error boundary ✓ | Zero console errors" \
  "epic:EP-09,priority:must-have,sp:3,type:feature,assignee:human" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-041] Modal: painel SAR Gemini Pro (coluna direita, abaixo do XAI)" \
  "## Critérios de Aceitação
- [ ] Visível quando \`sar_draft\` preenchido E \`anomaly_score > 0.90\`
- [ ] Header vermelho: '🚨 Rascunho SAR — Relatório de Atividade Suspeita'
- [ ] Sub-header: '⚠️ Documento gerado por IA — Requer revisão humana'
- [ ] Markdown renderizado com react-markdown
- [ ] Expand/collapse (por defeito colapsado)
- [ ] Botão '📥 Exportar SAR' no header
- [ ] Score ≤ 0.90: 'SAR não gerado — score abaixo de 90%'

## Dependências
- Bloqueado por: #40, PRD Task 3.2 implementada

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-09,priority:must-have,sp:3,type:feature,assignee:human" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-042] Modal: botão 'Analisar com AI' para análise manual on-demand" \
  "## Visual de Referência
- **img3** — transação com score 35.8% sem análise AI; sem botão para gerar

## Critérios de Aceitação
- [ ] Quando \`ai_explanation\` null E \`anomaly_score >= 0.50\` → botão '🤖 Analisar com IA'
- [ ] Clicar → \`POST /api/alerts/{id}/analyze\`
- [ ] Durante processamento: disabled + spinner + 'A gerar análise...'
- [ ] Quando concluído: painel XAI actualiza sem fechar modal
- [ ] Score < 0.50: 'Score demasiado baixo para análise AI prioritária'

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-09,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-043] Modal: exportação do SAR como PDF" \
  "## Visual de Referência
- **img5** — botões 'Export PDF' existem na tabela SAR Reports; mesmo botão deve estar no modal

## Critérios de Aceitação
- [ ] Botão '📥 Exportar SAR' no painel SAR gera PDF
- [ ] PDF inclui: header 'RASCUNHO CONFIDENCIAL', conteúdo Markdown renderizado, watermark 'IA DRAFT — REQUER REVISÃO', data, ID
- [ ] Nome: \`SAR-{TXN_ID_abbrev}-{YYYY-MM-DD}.pdf\`
- [ ] Spinner durante geração
- [ ] Download automático (sem nova janela)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-09,priority:should-have,sp:4,type:feature,assignee:human" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

# ============================================================
# EP-10 — Alerts Page | Sprint 4
# ============================================================

create_issue \
  "[US-044] Alerts: filtros com multi-select e sincronização URL" \
  "## Visual de Referência
- **img4, elemento 1** — 3 dropdowns: 'All statuses', 'All scores', 'All categories'

## Critérios de Aceitação
- [ ] 'All statuses' → multi-select: Normal, Pending Review, Resolved, False Positive, Confirmed Fraud
- [ ] 'All scores' → range slider (min–max, 0–100%)
- [ ] 'All categories' → multi-select idêntico ao #32
- [ ] Filtro adicional: Período (date range, #33)
- [ ] 'Reset All' limpa todos + URL params
- [ ] Todos sincronizados com URL (#5)

## ⚠️ ATENÇÃO: Não deve correr em paralelo com #37 (unificação páginas)

## Definition of Done
- [ ] Dark mode ✓ | i18n ✓ | URL sync ✓ | Zero console errors" \
  "epic:EP-10,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-045] Alerts: preencher espaço vazio (elemento 3) com componente estatístico" \
  "## Visual de Referência
- **img4, elemento 3** — área rectangular vazia à direita do gráfico de Score Distribution (elemento 2)

## Critérios de Aceitação
- [ ] Espaço 3 preenchido com 'Métricas de Qualidade'
- [ ] Mostra: Taxa de FP com delta, Tempo médio de resolução, Top categoria com mais alertas pendentes
- [ ] Responde aos filtros activos
- [ ] Estilo consistente (dark mode, mesma tipografia)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-10,priority:should-have,sp:5,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-046] Alerts: dark mode na tabela" \
  "## Critérios de Aceitação
- [ ] Todas as rows da tabela de alertas respeitam dark mode
- [ ] Nenhuma row com fundo branco hardcoded
- [ ] Usa CSS variables do shadcn/ui

## Dependências
- Relacionado com: #6 (dark mode global)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-10,priority:must-have,sp:2,type:bug,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-047] Alerts: botões de acção com confirmação e undo" \
  "## Visual de Referência
- **img4** — coluna ACTIONS com 3 ícones: ✓ verde, ✗ vermelho, ↑ cinza

## Critérios de Aceitação
- [ ] ✓ (Confirmar Fraude) → dialog de confirmação antes de executar
- [ ] ✗ (Falso Positivo) → imediato mas com toast 'Desfazer (5s)'
- [ ] ↑ (Escalar) → dialog com campo opcional de notas
- [ ] Após resolução: linha actualiza status imediatamente (optimistic update)
- [ ] Alertas resolvidos: sem botões de acção (já mostram '—')

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-10,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

# ============================================================
# EP-11 — SAR Reports Page | Sprint 4
# ============================================================

create_issue \
  "[US-048] SAR Reports: corrigir campos vazios na tabela (Date, Merchant NIF, Amount)" \
  "## Visual de Referência
- **img5, elemento 2** — coluna Date, Merchant NIF e Amount VAZIAS em todas as linhas

## Bug Analysis
Colunas Score e Status estão preenchidas. Date, NIF e Amount estão completamente vazias.
Causa provável: \`accessorKey\` aponta para campo diferente do que a API retorna, OU largura CSS 0.

## Critérios de Aceitação
- [ ] Coluna Date mostra: 'Mar 24, 2026 14:32'
- [ ] Coluna Merchant NIF mostra identificador da conta de origem
- [ ] Coluna Amount mostra valor em € com 2 casas decimais
- [ ] Bug diagnosticado e corrigido (API + render)
- [ ] Funciona em dados mock e dados reais

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-11,priority:must-have,sp:3,type:bug,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-049] SAR Reports: dark mode na tabela (linhas brancas)" \
  "## Visual de Referência
- **img5, elemento 2** — filas 3+ têm fundo BRANCO com texto PRETO em dark mode

## Contexto
As primeiras 2 linhas estão correctas (fundo escuro). A partir da 3ª linha: fundo branco com texto preto.
Este é um bug crítico de CSS.

## Critérios de Aceitação
- [ ] TODAS as linhas têm fundo dark consistente em dark mode
- [ ] Causa identificada e corrigida no componente de tabela
- [ ] Fix aplicado de forma genérica (não só nesta página — ver #6)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-11,priority:must-have,sp:2,type:bug,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-050] SAR Reports: acções na tabela (view + export + marcar revisto)" \
  "## Visual de Referência
- **img5, elemento 2** — coluna Export com botão 'Export PDF' apenas; sem 'View' nem estado de revisão

## Critérios de Aceitação
- [ ] Por linha: '👁 Ver Detalhe' + '📥 Export PDF' (já existe)
- [ ] 'Ver Detalhe' → abre modal de transação (#38) no painel SAR expandido
- [ ] Alertas Pending Review → botão '✓ Marcar como Revisto'
- [ ] Componente de tabela modularizado (não duplicado)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-11,priority:should-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 4 — Modal AI + Resolução de Alertas"

create_issue \
  "[US-051] SAR Reports: summary card (elemento 1) com dados correctos" \
  "## Visual de Referência
- **img5, elemento 1** — 3 sub-cards: SARs Generated (11), Critical Pending (3), Exported (1)

## Critérios de Aceitação
- [ ] 'SARs Generated' = count \`sar_draft != null\`
- [ ] 'Critical Pending' = count \`status=PENDING_REVIEW\` E \`score > 0.90\`
- [ ] 'Exported' = count SARs exportados (novo campo \`sar_exported_at\` no DynamoDB)
- [ ] Dados de \`GET /api/stats\` (não hardcoded)
- [ ] Actualiza com ciclo de refresh (#55+)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-11,priority:should-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 6 — Real-time Sync"

# ============================================================
# EP-12 — Mock Data Realism | Sprint 1-2
# ============================================================

create_issue \
  "[US-052] Regenerar dados mock com distribuição de fraude realista (1-3%)" \
  "## Contexto CRÍTICO
- **img1, elemento 5** — FRAUD RATE: 27.5% (com 80 transações = 22 fraudulentas. IMPLAUSÍVEL)
- **img1, elemento 7** — AVERAGE SCORE: 43.9% (quasi 50% de risco médio. IMPLAUSÍVEL)
Taxa real de fraude em transações digitais: 0.1–0.5% (Visa/Mastercard)

## Critérios de Aceitação
- [ ] Dataset mock 80 transações: 1-2 CONFIRMED_FRAUD (≤3%), 4-6 PENDING_REVIEW score>90%, 8-12 PENDING_REVIEW score 70-90%, restantes NORMAL/RESOLVED
- [ ] Average score: entre **10% e 18%**
- [ ] Fraud rate: entre **1.5% e 3.5%**
- [ ] Scores seguem distribuição lognormal (não uniforme)
- [ ] Documentado em \`data/README.md\`

## Bloqueia: #10 (KPI cards realistas), #23 (mapa account-to-account)

## Definition of Done
- [ ] Valores verificados: fraud_rate 1-3% ✓, avg_score 10-18% ✓" \
  "epic:EP-12,priority:must-have,sp:3,type:data,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-053] Actualizar schema de dados: campos origin/destination para o mapa" \
  "## Critérios de Aceitação
- [ ] Schema inclui: \`source_country\`, \`destination_country\`, \`payment_platform\`
- [ ] Dados mock: maioria PT→PT, alguns PT→ES/FR/DE, poucos PT→US/CN
- [ ] DynamoDB schema (\`infra/template.yaml\`) actualizado
- [ ] FastAPI Pydantic model actualizada
- [ ] Campos antigos mantidos como deprecated (não removidos)

## Dependências
- Bloqueado por: #52

## Definition of Done
- [ ] Schema documentado ✓ | Dados mock regenerados ✓" \
  "epic:EP-12,priority:must-have,sp:3,type:data,assignee:human" \
  "Sprint 2 — Pipeline Gemini + Dados"

create_issue \
  "[US-054] Re-treinar modelo Isolation Forest com contamination=0.05" \
  "## Critérios de Aceitação
- [ ] \`train_model.py\` com \`contamination=0.05\` (não 0.30)
- [ ] \`model.pkl\` actualizado e deployado na Lambda Layer
- [ ] Precision > 0.70, Recall > 0.65
- [ ] Score médio transações normais: 0.05–0.25 no dataset de validação
- [ ] Resultados documentados em \`data/validate_model.ipynb\`

## Dependências
- Bloqueado por: #52, #53

## Definition of Done
- [ ] Métricas de validação documentadas ✓" \
  "epic:EP-12,priority:should-have,sp:3,type:data,assignee:human" \
  "Sprint 2 — Pipeline Gemini + Dados"

# ============================================================
# EP-13 — Real-time Sync | Sprint 6
# ============================================================

create_issue \
  "[US-055] Diagnóstico: mapeamento de todos os pontos de dados sem auto-refresh" \
  "## Critérios de Aceitação
- [ ] Documento \`docs/realtime-sync-audit.md\` com tabela:
  - Componente | Página | Mecanismo actual | Latência actual | Solução proposta
- [ ] Cobre: KPI Cards, Chart, High Risk, Donut, Map, Transactions table, Alerts table, SAR summary
- [ ] Documento disponível antes de iniciar US-056 a US-059

## Definition of Done
- [ ] Documento criado e revisto ✓" \
  "epic:EP-13,priority:must-have,sp:3,type:docs,assignee:human" \
  "Sprint 6 — Real-time Sync"

create_issue \
  "[US-056] SSE pipeline: validar funcionamento end-to-end (<3 segundos)" \
  "## Critérios de Aceitação
- [ ] \`GET /api/alerts/stream\` retorna \`Content-Type: text/event-stream\`
- [ ] Hook \`useAlertStream(onNewAlert)\` subscreve e recebe eventos
- [ ] \`POST /ingest\` → evento no browser em < 3 segundos
- [ ] Heartbeat a cada 25s
- [ ] EventSource reconecta automaticamente
- [ ] Indicador visual no header: ponto verde animado quando SSE activo

## Definition of Done
- [ ] Testado end-to-end ✓ | Zero console errors" \
  "epic:EP-13,priority:must-have,sp:5,type:feature,assignee:human" \
  "Sprint 6 — Real-time Sync"

create_issue \
  "[US-057] Refresh automático: KPI cards (3s) + invalidação por SSE" \
  "## Critérios de Aceitação
- [ ] SWR com \`refreshInterval: 3000\` nos 4 KPI cards
- [ ] Novo evento SSE → invalidação imediata com \`mutate()\`
- [ ] \`keepPreviousData: true\` (sem flash/flicker)
- [ ] Timestamp 'Actualizado: HH:MM:SS' no rodapé de cada card

## Dependências
- Bloqueado por: #56

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-13,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 6 — Real-time Sync"

create_issue \
  "[US-058] Refresh automático: tabela de alertas (5s) com highlight de novos items" \
  "## Critérios de Aceitação
- [ ] SWR com \`refreshInterval: 5000\` como fallback
- [ ] Novos alertas via SSE → topo da tabela com highlight verde 2 segundos
- [ ] Paginação não salta para página 1 ao receber novos dados
- [ ] Alertas resolvidos actualizados em tempo real

## Dependências
- Bloqueado por: #56

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-13,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 6 — Real-time Sync"

create_issue \
  "[US-059] Tratamento de falha SSE: degradação graciosa para polling" \
  "## Critérios de Aceitação
- [ ] 3 falhas SSE → polling SWR 5s + aviso '⚠️ Modo offline — actualizações a cada 5s'
- [ ] Ícone de estado de rede: amarelo (reconectando) ou cinza (offline)
- [ ] Reconexão → sync com \`GET /api/alerts?since={last_event_timestamp}\`
- [ ] Exponential backoff: 1s, 2s, 4s, 8s, máx 30s

## Dependências
- Bloqueado por: #56, #3 (ícone de rede)

## Definition of Done
- [ ] Dark mode ✓ | Zero console errors" \
  "epic:EP-13,priority:must-have,sp:3,type:feature,assignee:copilot" \
  "Sprint 6 — Real-time Sync"

# ============================================================
# EP-14 — Gemini AI Debugging | Sprint 1-2
# ============================================================

create_issue \
  "[US-060] Plano de debugging passo-a-passo da integração Gemini" \
  "## Critérios de Aceitação
- [ ] Documento \`docs/gemini-debug-plan.md\` com passos em sequência:
  1. Validar GEMINI_API_KEY em SSM Parameter Store
  2. Testar API Gemini directamente via curl (Flash + Pro)
  3. CloudWatch Logs Lambda: procurar 'XAI generated for' ou 'Flash XAI failed'
  4. Verificar se bloco \`if anomaly_score >= 0.70\` no handler.py está a executar
  5. DynamoDB: campo \`ai_explanation\` está preenchido?
  6. FastAPI: \`ai_explanation\` retorna como objecto JSON ou string?
  7. Frontend DevTools: componente XAIPanel recebe objecto correcto?
- [ ] Documento disponível antes de iniciar #61 a #64

## Definition of Done
- [ ] Documento criado e revisto ✓" \
  "epic:EP-14,priority:must-have,sp:3,type:docs,assignee:human" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-061] Endpoint de health check para integração Gemini (GET /api/health/gemini)" \
  "## Critérios de Aceitação
- [ ] \`GET /api/health/gemini\` retorna:
  \`{ 'gemini_flash': 'ok|error', 'gemini_pro': 'ok|error', 'latency_flash_ms': N, 'latency_pro_ms': N, 'error_message': null|string }\`
- [ ] Testa chamada real a cada modelo (prompt mínimo: 'Responde apenas com OK')
- [ ] \`GET /health\` inclui estado Gemini
- [ ] Timeout: 5s por modelo

## Definition of Done
- [ ] Endpoint testado em produção ✓ | Zero console errors" \
  "epic:EP-14,priority:must-have,sp:2,type:feature,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-062] Verificar e corrigir deserialização de ai_explanation na FastAPI" \
  "## Critérios de Aceitação
- [ ] \`GET /api/alerts/{id}\` → \`ai_explanation\` como objecto JSON (não string)
- [ ] \`GET /api/alerts\` → mesmo para todos os items paginados
- [ ] \`ai_explanation\` null → retorna \`null\` (não \`'null'\` ou \`''\`)
- [ ] JSON malformado → API retorna \`null\` (não HTTP 500)
- [ ] Error boundary no React previne crash do modal

## Definition of Done
- [ ] Testado com dados reais ✓ | Zero console errors" \
  "epic:EP-14,priority:must-have,sp:2,type:bug,assignee:copilot" \
  "Sprint 1 — Estabilização"

create_issue \
  "[US-063] Logging estruturado JSON no pipeline GenAI" \
  "## Critérios de Aceitação
- [ ] Lambda handler: \`{ transaction_id, anomaly_score, genai_invoked, genai_duration_ms, genai_status }\`
- [ ] \`flash_xai.py\`: \`{ transaction_id, model: 'flash', prompt_tokens, response_tokens, duration_ms, status }\`
- [ ] \`pro_sar.py\`: \`{ transaction_id, model: 'pro', prompt_tokens, response_tokens, duration_ms, status }\`
- [ ] Log group: \`/aws/lambda/fintrack-transaction-processor\`
- [ ] Filtro CloudWatch para erros: \`{ $.genai_status = 'error' }\`

## Definition of Done
- [ ] Logs visíveis em CloudWatch ✓" \
  "epic:EP-14,priority:should-have,sp:3,type:infra,assignee:copilot" \
  "Sprint 2 — Pipeline Gemini + Dados"

create_issue \
  "[US-064] Script de smoke tests para validação end-to-end em produção" \
  "## Critérios de Aceitação
- [ ] Ficheiro \`scripts/smoke_test.sh {API_BASE_URL}\` com sequência:
  1. \`[TEST 1]\` GET /health → HTTP 200
  2. \`[TEST 2]\` GET /api/health/gemini → flash=ok + pro=ok
  3. \`[TEST 3]\` POST /ingest payload sintético → HTTP 200
  4. \`[TEST 4]\` Aguardar 10s → GET /api/alerts?limit=1 → item processado
  5. \`[TEST 5]\` Verificar \`ai_explanation != null\`
  6. \`[TEST 6]\` PUT /api/alerts/{id}/resolve FALSE_POSITIVE → HTTP 200
  7. \`[TEST 7]\` GET /api/alerts/{id} → status = FALSE_POSITIVE
- [ ] Exit code 0 = todos passam; 1 = algum falhou
- [ ] Output: \`[PASS] Test 1: Health check\` / \`[FAIL] Test 5: ai_explanation is null\`
- [ ] Usage: \`bash scripts/smoke_test.sh https://api.angelorscoelho.dev\`

## Dependências
- Bloqueado por: #61

## Definition of Done
- [ ] Script testado em produção ✓" \
  "epic:EP-14,priority:should-have,sp:4,type:infra,assignee:copilot" \
  "Sprint 2 — Pipeline Gemini + Dados"

echo ""
echo "✅ All 64 User Stories imported successfully!"
echo ""
echo "📋 List all issues: gh issue list --repo $REPO --limit 100"
echo "🎯 View by epic: gh issue list --repo $REPO --label 'epic:EP-01'"
echo "🔴 View must-haves: gh issue list --repo $REPO --label 'priority:must-have'"
