#!/bin/bash
# Quick Start Monitoring Script
# Usage: bun scripts/start-monitoring.sh

echo "🔍 Starting Fantasy402 Monitoring Dashboard"
echo "============================================"
echo ""
echo "Opening tools:"
echo "  1. 📊 Web Log Viewer"
echo "  2. 🖥️  Cloudflare Dashboard"
echo "  3. 📡 Worker Logs (tail)"
echo ""

# Open web-based log viewer
echo "📊 Opening Log Viewer..."
open tools/logging/log-viewer.html

# Open Cloudflare dashboard
echo "🖥️  Opening Cloudflare Dashboard..."
open "https://dash.cloudflare.com"

# Wait a moment for browsers to open
sleep 2

# Start terminal log monitor
echo ""
echo "📡 Starting Real-time Log Monitor..."
echo "    Press Ctrl+C to stop"
echo ""

# Run the log monitor
bun tools/logging/log-monitor.js

