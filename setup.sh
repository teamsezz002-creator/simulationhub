#!/bin/bash
# setup.sh — Install all dependencies for SimPortal
# Run this once before starting the project.

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   SimPortal — Dependency Installer   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─── Backend ──────────────────────────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend ready"

# ─── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "✅ Frontend ready"

# ─── .env check ───────────────────────────────────────────────────────────────
echo ""
if [ ! -f frontend/.env.local ]; then
  echo "⚠️  frontend/.env.local not found. Creating from template..."
  cp frontend/.env.local.example frontend/.env.local 2>/dev/null || true
  echo "   → Edit frontend/.env.local and add your GITHUB_ID and GITHUB_SECRET"
else
  echo "✅ frontend/.env.local exists"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit frontend/.env.local with your GitHub OAuth credentials"
echo "  2. Open two terminals:"
echo "     Terminal 1: cd backend && npm start"
echo "     Terminal 2: cd frontend && npm run dev"
echo "  3. Open http://localhost:3000"
echo "═══════════════════════════════════════════"
echo ""
