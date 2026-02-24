#!/bin/bash

# MindHikers Delivery Console Launcher

# Define project paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONSOLE_DIR="$SCRIPT_DIR"

echo "🚀 Starting MindHikers Delivery Console..."
echo "🔧 Console Dir: $CONSOLE_DIR"

# Load .env if exists
if [ -f "$CONSOLE_DIR/.env" ]; then
    export $(grep -v '^#' "$CONSOLE_DIR/.env" | xargs)
    echo "📂 Target Project: $PROJECT_NAME"
else
    echo "⚠️  No .env found, using defaults"
fi

# Check if node_modules exists, if not install
if [ ! -d "$CONSOLE_DIR/node_modules" ]; then
    echo "📦 Dependencies not found. Installing..."
    cd "$CONSOLE_DIR"
    npm install
else
    cd "$CONSOLE_DIR"
fi

# Run the console (Frontend + Backend concurrently)
echo "🌐 Launching localhost server (Port ${PORT:-3002} & Vite)..."
npm run dev
