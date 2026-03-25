#!/bin/bash
# scripts/create_labels.sh
# Cria todos os labels necessários no repositório FinTrack AI
# Usage: bash scripts/create_labels.sh

REPO="angelorscoelho/fintrack"

echo "🏷️  Creating labels for $REPO..."

# --- PRIORIDADE ---
gh label create "priority:must-have"    --color "d73a4a" --description "🔴 Must Have — blocker" --repo $REPO --force
gh label create "priority:should-have"  --color "e4a020" --description "🟠 Should Have — high value" --repo $REPO --force
gh label create "priority:could-have"   --color "cfd3d7" --description "🟡 Could Have — nice to have" --repo $REPO --force

# --- ÉPICOS ---
gh label create "epic:EP-01" --color "0075ca" --description "Header & Navegação Global" --repo $REPO --force
gh label create "epic:EP-02" --color "0075ca" --description "Dashboard KPI Cards" --repo $REPO --force
gh label create "epic:EP-03" --color "0075ca" --description "Gráfico Hourly Volume" --repo $REPO --force
gh label create "epic:EP-04" --color "0075ca" --description "High Risk Transactions Card" --repo $REPO --force
gh label create "epic:EP-05" --color "0075ca" --description "Category Donut & Layout" --repo $REPO --force
gh label create "epic:EP-06" --color "0075ca" --description "Alert Map" --repo $REPO --force
gh label create "epic:EP-07" --color "0075ca" --description "AI Sidebar Assistant" --repo $REPO --force
gh label create "epic:EP-08" --color "0075ca" --description "Transactions Page" --repo $REPO --force
gh label create "epic:EP-09" --color "0075ca" --description "Modal AI Analysis Panel" --repo $REPO --force
gh label create "epic:EP-10" --color "0075ca" --description "Alerts Page" --repo $REPO --force
gh label create "epic:EP-11" --color "0075ca" --description "SAR Reports Page" --repo $REPO --force
gh label create "epic:EP-12" --color "0075ca" --description "Mock Data Realism" --repo $REPO --force
gh label create "epic:EP-13" --color "0075ca" --description "Real-time Sync" --repo $REPO --force
gh label create "epic:EP-14" --color "0075ca" --description "Gemini AI Debugging" --repo $REPO --force

# --- TIPO ---
gh label create "type:feature"   --color "a2eeef" --description "New feature or enhancement" --repo $REPO --force
gh label create "type:bug"       --color "d73a4a" --description "Something is broken" --repo $REPO --force
gh label create "type:refactor"  --color "e4e669" --description "Code refactoring" --repo $REPO --force
gh label create "type:docs"      --color "0075ca" --description "Documentation" --repo $REPO --force
gh label create "type:data"      --color "7057ff" --description "Data / ML related" --repo $REPO --force
gh label create "type:infra"     --color "006b75" --description "Infrastructure / DevOps" --repo $REPO --force
gh label create "type:ai"        --color "e4a020" --description "AI/GenAI related" --repo $REPO --force

# --- STORY POINTS ---
gh label create "sp:1"  --color "f9d0c4" --description "Story Points: 1" --repo $REPO --force
gh label create "sp:2"  --color "f9d0c4" --description "Story Points: 2" --repo $REPO --force
gh label create "sp:3"  --color "f9d0c4" --description "Story Points: 3" --repo $REPO --force
gh label create "sp:5"  --color "e4a020" --description "Story Points: 5" --repo $REPO --force
gh label create "sp:8"  --color "d73a4a" --description "Story Points: 8" --repo $REPO --force

# --- ASSIGNEE ---
gh label create "assignee:copilot" --color "6f42c1" --description "Best for Copilot Coding Agent" --repo $REPO --force
gh label create "assignee:human"   --color "0075ca" --description "Requires human developer" --repo $REPO --force

# --- ESTADO ESPECIAL ---
gh label create "blocked"          --color "b60205" --description "Blocked by dependency" --repo $REPO --force
gh label create "copilot-ready"    --color "6f42c1" --description "Issue ready to assign to Copilot" --repo $REPO --force

echo "✅ All labels created successfully!"
