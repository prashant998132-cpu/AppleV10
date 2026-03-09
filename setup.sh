#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# JARVIS v6 — One-Click Setup Script
# Run: bash setup.sh
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🤖 JARVIS v6 Setup"
echo "═══════════════════"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from nodejs.org (v18+)"
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "❌ Node.js v18+ required. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing packages..."
npm install --silent
echo "✅ Packages installed"

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚙️  Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ .env.local created"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  IMPORTANT: Fill in your API keys!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Required keys to fill in .env.local:"
    echo "  1. NEXT_PUBLIC_SUPABASE_URL    → supabase.com"
    echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY → supabase.com"
    echo "  3. SUPABASE_SERVICE_ROLE_KEY   → supabase.com"
    echo "  4. GEMINI_API_KEY              → aistudio.google.com (FREE)"
    echo "  5. GROQ_API_KEY                → console.groq.com (FREE)"
    echo ""
    echo "After filling keys, run: npm run dev"
    echo ""
else
    echo "✅ .env.local already exists"

    # Check required keys
    echo ""
    echo "🔍 Checking required keys..."

    check_key() {
        local key=$1
        local val=$(grep "^$key=" .env.local | cut -d'=' -f2)
        if [ -z "$val" ] || [ "$val" = "" ] || [[ "$val" == *"..."* ]]; then
            echo "  ⚠️  $key — not set"
        else
            echo "  ✅ $key"
        fi
    }

    check_key "NEXT_PUBLIC_SUPABASE_URL"
    check_key "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    check_key "GEMINI_API_KEY"
    check_key "GROQ_API_KEY"

    echo ""
    echo "🚀 Starting JARVIS..."
    echo "   Open: http://localhost:3000"
    echo ""
    npm run dev
fi
