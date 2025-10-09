#!/usr/bin/env bash
#
# 🔧 Setup Script for Telegram Alert System
# Interactive setup wizard
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.telegram.conf"

echo "🔔 Telegram Alert System - Setup Wizard"
echo "========================================"
echo ""

# Check if config already exists
if [[ -f "$CONFIG_FILE" ]]; then
  echo "⚠️  Configuration file already exists: $CONFIG_FILE"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

# Step 1: Telegram Bot Token
echo "Step 1: Telegram Bot Token"
echo "---------------------------"
echo "1. Open Telegram and search for @BotFather"
echo "2. Send /newbot and follow the instructions"
echo "3. Copy the bot token (looks like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)"
echo ""
read -p "Enter your Telegram Bot Token: " TG_BOT_TOKEN

if [[ -z "$TG_BOT_TOKEN" ]]; then
  echo "❌ Bot token cannot be empty"
  exit 1
fi

# Validate token format
if [[ ! "$TG_BOT_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
  echo "⚠️  Warning: Token format looks incorrect"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Bot token saved"
echo ""

# Step 2: Chat ID
echo "Step 2: Telegram Chat ID"
echo "------------------------"
echo "1. Create a channel or group in Telegram"
echo "2. Add your bot to the channel/group as admin"
echo "3. Send a test message to the channel/group"
echo "4. Visit: https://api.telegram.org/bot${TG_BOT_TOKEN}/getUpdates"
echo "5. Look for \"chat\":{\"id\":-1001234567890}"
echo "6. Copy the chat ID (including the minus sign if present)"
echo ""
read -p "Enter your Telegram Chat ID: " TG_CHAT_ID

if [[ -z "$TG_CHAT_ID" ]]; then
  echo "❌ Chat ID cannot be empty"
  exit 1
fi

echo "✅ Chat ID saved"
echo ""

# Step 3: Test connection
echo "Step 3: Testing Telegram Connection"
echo "------------------------------------"
echo "Sending test message..."

TEST_MSG="🔔 <b>Telegram Alert System</b>

✅ Setup successful!
🤖 Bot is connected and ready to send alerts.

⏰ $(date +'%Y-%m-%d %H:%M:%S')"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage" \
  -d chat_id="$TG_CHAT_ID" \
  -d parse_mode="HTML" \
  -d text="$TEST_MSG")

if echo "$RESPONSE" | jq -e '.ok' >/dev/null 2>&1; then
  echo "✅ Test message sent successfully!"
  echo "   Check your Telegram channel/group"
else
  echo "❌ Failed to send test message"
  echo "   Response: $RESPONSE"
  exit 1
fi

echo ""

# Step 4: Configuration
echo "Step 4: Alert Configuration"
echo "---------------------------"

read -p "API Base URL [https://fantasy402.com/api/ai]: " API_BASE
API_BASE=${API_BASE:-https://fantasy402.com/api/ai}

read -p "Sharp score threshold (0-100) [80]: " SHARP_THRESHOLD
SHARP_THRESHOLD=${SHARP_THRESHOLD:-80}

read -p "Risk exposure threshold in dollars [2000]: " RISK_THRESHOLD_USD
RISK_THRESHOLD_USD=${RISK_THRESHOLD_USD:-2000}
RISK_THRESHOLD=$((RISK_THRESHOLD_USD * 100))  # Convert to cents

read -p "Minimum steam severity (LOW/MEDIUM/HIGH/CRITICAL) [MEDIUM]: " STEAM_SEVERITY
STEAM_SEVERITY=${STEAM_SEVERITY:-MEDIUM}

echo ""

# Step 5: Write config file
echo "Step 5: Writing Configuration"
echo "-----------------------------"

cat > "$CONFIG_FILE" << EOF
# Telegram Alert System Configuration
# Generated: $(date +'%Y-%m-%d %H:%M:%S')

# Telegram Bot Token
TG_BOT_TOKEN="$TG_BOT_TOKEN"

# Telegram Chat ID
TG_CHAT_ID="$TG_CHAT_ID"

# API Configuration
API_BASE="$API_BASE"

# Alert Thresholds
SHARP_THRESHOLD=$SHARP_THRESHOLD
RISK_THRESHOLD=$RISK_THRESHOLD
STEAM_SEVERITY="$STEAM_SEVERITY"

# Logging
LOG_FILE="/tmp/telegram-alerts.log"

# Customer IDs to monitor (space-separated)
MONITOR_CUSTOMERS="CUST_8849 CUST_1234 CUST_5678"

# Games to monitor (pipe-separated)
MONITOR_GAMES="Lakers vs Celtics|Warriors vs Nets|Heat vs Bucks"
EOF

chmod 600 "$CONFIG_FILE"
echo "✅ Configuration saved to: $CONFIG_FILE"
echo ""

# Step 6: Make scripts executable
echo "Step 6: Setting Permissions"
echo "---------------------------"
chmod +x "$SCRIPT_DIR/telegram-alerts.sh"
echo "✅ Made telegram-alerts.sh executable"
echo ""

# Step 7: Test run
echo "Step 7: Test Run"
echo "----------------"
read -p "Do you want to run a test alert cycle now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Running test..."
  "$SCRIPT_DIR/telegram-alerts.sh" || {
    echo "⚠️  Test run failed. Check the logs for details."
  }
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Edit $CONFIG_FILE to customize customer IDs and games"
echo "2. Run manually: $SCRIPT_DIR/telegram-alerts.sh"
echo "3. Set up cron job:"
echo "   */2 * * * * $SCRIPT_DIR/telegram-alerts.sh"
echo ""
echo "Or use systemd timer (recommended):"
echo "   sudo cp $SCRIPT_DIR/telegram-alerts.service /etc/systemd/system/"
echo "   sudo cp $SCRIPT_DIR/telegram-alerts.timer /etc/systemd/system/"
echo "   sudo systemctl enable --now telegram-alerts.timer"
echo ""

