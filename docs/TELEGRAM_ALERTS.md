# 🔔 Telegram Alert System

Real-time alerts for sharp customers, steam moves, and risk exposure delivered straight to your Telegram.

## 🚀 Quick Start (2 minutes)

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy the bot token (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Get Chat ID

1. Create a Telegram channel or group
2. Add your bot as admin
3. Send a test message
4. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. Find `"chat":{"id":-1001234567890}` and copy the ID

### 3. Run Setup

```bash
cd /Users/nolarose/Documents/augment-projects/betting-brain-v3/scripts
chmod +x setup-telegram-alerts.sh
./setup-telegram-alerts.sh
```

The wizard will guide you through configuration and send a test message.

### 4. Test It

```bash
./telegram-alerts.sh
```

Check your Telegram for alerts!

---

## 📋 What Gets Alerted

### 🔪 Sharp Customer Detection

**Triggers when:**
- Sharp score ≥ 80 (configurable)
- Customer shows professional betting patterns

**Alert includes:**
- Customer ID
- Sharp score (0-100)
- Classification (SHARP/RECREATIONAL/MONITOR)
- CLV (Customer Lifetime Value)
- Win rate percentage
- Total bets
- Confidence level
- Recommended actions

**Example:**
```
🔪 SHARP CUSTOMER DETECTED

👤 Customer: CUST_8849
📊 Sharp Score: 87/100
🎯 Classification: SHARP
💰 CLV: 4.7
📈 Win Rate: 58.3%
🎲 Total Bets: 312
✅ Confidence: 92%

🚨 Recommended Actions:
• Lower bet limits immediately
• Enable shadow line
• Flag for manual review
• Monitor closely for 24h
```

### 🌊 Steam Move Detection

**Triggers when:**
- Steam move detected
- Severity ≥ MEDIUM (configurable)

**Alert includes:**
- Game details (teams)
- Line movement (points)
- Volume spike (percentage)
- Severity level
- Confidence
- Recommended actions

**Example:**
```
🌊 STEAM MOVE DETECTED

🏀 Game: Lakers vs Celtics
📈 Line Movement: -2.5 points
📊 Volume Spike: 340%
🔥 Severity: HIGH
✅ Confidence: 88%

⚡ Recommended Actions:
• Move line immediately
• Reduce exposure limits
• Monitor for reverse steam
• Check sharp money flow
```

### ⚠️ Risk Exposure Alerts

**Triggers when:**
- Net exposure > $2,000 (configurable)
- Risk level is MEDIUM or higher

**Alert includes:**
- Total exposure
- Net exposure
- Risk level
- Hedge recommendation
- Immediate actions

**Example:**
```
🔥 RISK EXPOSURE ALERT

📊 Total Exposure: $487,230
💰 Net Exposure: -$124,500
🔥 Risk Level: MEDIUM

✅ Hedge Recommendation:
Consider offsetting 50k on Lakers side

⚡ Immediate Actions:
• Review exposure breakdown
• Execute hedge strategy
• Adjust limits if needed
• Monitor for changes
```

### 🏆 Agent Performance Alerts

**Triggers when:**
- Top agent weekly profit > $500 (configurable)

**Alert includes:**
- Top agent ID
- Weekly profit
- Risk score
- Top 5 agents list

**Example:**
```
🏆 TOP AGENT ALERT

👤 Agent: NOLAWOLF
💰 Weekly Profit: $73,000
⚠️ Risk Score: 85

📊 Top 5 Agents This Week:
• NOLAWOLF: $73,000
• BILLY666: $52,000
• AGENT123: $41,000
• SHARK99: $38,000
• PRO_BET: $29,000
```

---

## ⚙️ Configuration

Edit `.telegram.conf` to customize:

```bash
# Alert Thresholds
SHARP_THRESHOLD=80          # Sharp score (0-100)
RISK_THRESHOLD=200000       # Risk in cents ($2,000)
STEAM_SEVERITY="MEDIUM"     # LOW, MEDIUM, HIGH, CRITICAL

# Monitoring Lists
MONITOR_CUSTOMERS="CUST_8849 CUST_1234 CUST_5678"
MONITOR_GAMES="Lakers vs Celtics|Warriors vs Nets"
```

---

## 🔄 Scheduling

### Option 1: Cron (Simple)

```bash
# Run every 2 minutes
crontab -e
```

Add:
```
*/2 * * * * /path/to/telegram-alerts.sh
```

### Option 2: Systemd Timer (Recommended)

```bash
# Copy service files
sudo cp telegram-alerts.service /etc/systemd/system/
sudo cp telegram-alerts.timer /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable telegram-alerts.timer
sudo systemctl start telegram-alerts.timer

# Check status
sudo systemctl status telegram-alerts.timer
sudo systemctl list-timers telegram-alerts.timer

# View logs
sudo journalctl -u telegram-alerts.service -f
```

**Benefits of systemd:**
- Automatic restart on failure
- Better logging (journalctl)
- Resource limits
- Dependency management
- Randomized delay to avoid thundering herd

---

## 📊 Monitoring

### View Logs

```bash
# Tail the log file
tail -f /tmp/telegram-alerts.log

# Or with systemd
sudo journalctl -u telegram-alerts.service -f
```

### Check Last Run

```bash
# With systemd
sudo systemctl status telegram-alerts.service

# Or check log file
tail -20 /tmp/telegram-alerts.log
```

### Test Manually

```bash
./telegram-alerts.sh
```

---

## 🔧 Troubleshooting

### No Alerts Received

1. **Check bot token:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
   ```

2. **Check chat ID:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
   ```

3. **Test send:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
     -d chat_id="<YOUR_CHAT_ID>" \
     -d text="Test"
   ```

### API Errors

1. **Check API health:**
   ```bash
   curl https://fantasy402.com/api/ai/health
   ```

2. **Test query:**
   ```bash
   curl -X POST https://fantasy402.com/api/ai/query \
     -H "Content-Type: application/json" \
     -d '{"query":"sharp score CUST_8849"}'
   ```

### Permission Errors

```bash
chmod +x telegram-alerts.sh
chmod 600 .telegram.conf
```

### Systemd Issues

```bash
# Check service status
sudo systemctl status telegram-alerts.service

# View logs
sudo journalctl -u telegram-alerts.service -n 50

# Restart
sudo systemctl restart telegram-alerts.timer
```

---

## 🎨 Customization

### Add Custom Alerts

Edit `telegram-alerts.sh` and add a new function:

```bash
check_custom_alert() {
  log "Checking custom alert..."
  
  local data
  data=$(query_api "your custom query")
  
  # Your logic here
  if [[ condition ]]; then
    local msg="🔔 <b>CUSTOM ALERT</b>

Your message here

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
    
    send_telegram "$msg"
  fi
}
```

Then call it in `main()`:

```bash
main() {
  # ... existing checks ...
  check_custom_alert
}
```

### Change Alert Format

Telegram supports HTML formatting:

- `<b>bold</b>` - **bold**
- `<i>italic</i>` - *italic*
- `<code>code</code>` - `code`
- `<pre>preformatted</pre>` - preformatted
- `<a href="url">link</a>` - link

### Add More Data Fields

The API returns many fields. Extract any with `jq`:

```bash
local avg_bet=$(echo "$sharp" | jq -r '.result.avgBetSize // 0')
local last_bet=$(echo "$sharp" | jq -r '.result.lastBetTime // "Unknown"')
```

---

## 🚀 Advanced Features

### Multiple Channels

Send different alerts to different channels:

```bash
# In .telegram.conf
TG_CHAT_ID_SHARP="-1001111111111"
TG_CHAT_ID_STEAM="-1002222222222"
TG_CHAT_ID_RISK="-1003333333333"
```

Then in the script:

```bash
send_telegram "$msg" "HTML" "$TG_CHAT_ID_SHARP"
```

### Alert Throttling

Prevent spam by tracking last alert time:

```bash
LAST_ALERT_FILE="/tmp/last-alert-$cid"

if [[ -f "$LAST_ALERT_FILE" ]]; then
  last_time=$(cat "$LAST_ALERT_FILE")
  now=$(date +%s)
  diff=$((now - last_time))
  
  # Only alert once per hour
  if (( diff < 3600 )); then
    log "Skipping alert for $cid (throttled)"
    return
  fi
fi

echo "$(date +%s)" > "$LAST_ALERT_FILE"
```

### Rich Notifications

Add buttons to alerts:

```bash
curl -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage" \
  -d chat_id="$TG_CHAT_ID" \
  -d parse_mode="HTML" \
  -d text="$msg" \
  -d reply_markup='{"inline_keyboard":[[
    {"text":"View Details","url":"https://fantasy402.com/customer/CUST_8849"},
    {"text":"Adjust Limits","callback_data":"adjust_limits"}
  ]]}'
```

---

## 📈 Performance

- **Execution time:** ~2-5 seconds per cycle
- **API calls:** 4-8 per cycle (depending on monitored items)
- **Memory usage:** <10MB
- **CPU usage:** Minimal (bash + curl + jq)

---

## 🔒 Security

- Store `.telegram.conf` with `chmod 600` (owner read/write only)
- Never commit bot token to git
- Use environment variables in production
- Rotate bot token periodically
- Limit bot permissions to send messages only

---

## 📝 License

Part of Betting-Brain v3 - See main LICENSE file.

