#!/usr/bin/env bash
#
# 🔔 Telegram Alert System for Betting-Brain v3
# Monitors sharp customers, steam moves, and risk exposure
# Sends real-time alerts to Telegram
#

set -euo pipefail

#------- CONFIGURATION ---------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/tmp/telegram-alerts.log}"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/.telegram.conf}"

# Load config if exists
if [[ -f "$CONFIG_FILE" ]]; then
  source "$CONFIG_FILE"
fi

# Environment variables (override config file)
TG_BOT_TOKEN="${TG_BOT_TOKEN:-}"
TG_CHAT_ID="${TG_CHAT_ID:-}"
API_BASE="${API_BASE:-https://fantasy402.com/api/ai}"
SHARP_THRESHOLD="${SHARP_THRESHOLD:-80}"
RISK_THRESHOLD="${RISK_THRESHOLD:-200000}"
STEAM_SEVERITY="${STEAM_SEVERITY:-MEDIUM}"

#------- LOGGING ---------------------------------------------
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

#------- VALIDATION ------------------------------------------
if [[ -z "$TG_BOT_TOKEN" ]]; then
  error "TG_BOT_TOKEN not set. Export it or add to $CONFIG_FILE"
  exit 1
fi

if [[ -z "$TG_CHAT_ID" ]]; then
  error "TG_CHAT_ID not set. Export it or add to $CONFIG_FILE"
  exit 1
fi

#------- HELPERS ---------------------------------------------
usd() {
  printf "$%'.0f" "$1"
}

send_telegram() {
  local message="$1"
  local parse_mode="${2:-HTML}"
  
  local response
  response=$(curl -s -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage" \
    -d chat_id="$TG_CHAT_ID" \
    -d parse_mode="$parse_mode" \
    -d text="$message" \
    -d disable_web_page_preview=true)
  
  if echo "$response" | jq -e '.ok' >/dev/null 2>&1; then
    log "Telegram message sent successfully"
    return 0
  else
    error "Failed to send Telegram message: $response"
    return 1
  fi
}

query_api() {
  local query="$1"
  local endpoint="${2:-/query}"
  
  local response
  response=$(curl -s -X POST "$API_BASE$endpoint" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$query\"}" \
    --max-time 30)
  
  if [[ -z "$response" ]]; then
    error "Empty response from API for query: $query"
    return 1
  fi
  
  echo "$response"
}

#------- ALERT FUNCTIONS -------------------------------------

check_sharp_customers() {
  log "Checking sharp customers..."
  
  # Get list of recent customers (you can customize this query)
  local customer_ids=("CUST_8849" "CUST_1234" "CUST_5678")
  
  for cid in "${customer_ids[@]}"; do
    local sharp
    sharp=$(query_api "sharp score $cid" 2>/dev/null) || continue
    
    local score
    score=$(echo "$sharp" | jq -r '.result.sharpScore // 0' 2>/dev/null) || continue
    
    if (( $(echo "$score >= $SHARP_THRESHOLD" | bc -l) )); then
      local class=$(echo "$sharp" | jq -r '.result.classification // "UNKNOWN"')
      local clv=$(echo "$sharp" | jq -r '.result.clv // 0')
      local win=$(echo "$sharp" | jq -r '.result.winRate // 0')
      local bets=$(echo "$sharp" | jq -r '.result.totalBets // 0')
      local conf=$(echo "$sharp" | jq -r '.result.confidence // 0')
      
      local msg="🔪 <b>SHARP CUSTOMER DETECTED</b>

👤 Customer: <code>$cid</code>
📊 Sharp Score: <b>$score/100</b>
🎯 Classification: <b>$class</b>
💰 CLV: <b>$clv</b>
📈 Win Rate: <b>$win%</b>
🎲 Total Bets: <b>$bets</b>
✅ Confidence: <b>$(echo "$conf * 100" | bc)%</b>

🚨 <b>Recommended Actions:</b>
• Lower bet limits immediately
• Enable shadow line
• Flag for manual review
• Monitor closely for 24h

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
      
      send_telegram "$msg"
      log "Sharp alert sent for $cid (score: $score)"
    fi
  done
}

check_steam_moves() {
  log "Checking steam moves..."
  
  # Get today's games (you can customize this)
  local games=("Lakers vs Celtics" "Warriors vs Nets" "Heat vs Bucks")
  
  for game in "${games[@]}"; do
    local steam
    steam=$(query_api "steam move $game" 2>/dev/null) || continue
    
    local detected
    detected=$(echo "$steam" | jq -r '.steamDetected // false' 2>/dev/null) || continue
    
    if [[ "$detected" == "true" ]]; then
      local severity=$(echo "$steam" | jq -r '.severity // "UNKNOWN"')
      
      # Only alert on MEDIUM or higher
      if [[ "$severity" == "HIGH" ]] || [[ "$severity" == "CRITICAL" ]] || [[ "$severity" == "$STEAM_SEVERITY" ]]; then
        local move=$(echo "$steam" | jq -r '.lineMove // 0')
        local spike=$(echo "$steam" | jq -r '.volumeSpike // 0')
        local conf=$(echo "$steam" | jq -r '.confidence // 0')
        local home=$(echo "$steam" | jq -r '.teams.home // "Unknown"')
        local away=$(echo "$steam" | jq -r '.teams.away // "Unknown"')
        
        local msg="🌊 <b>STEAM MOVE DETECTED</b>

🏀 Game: <b>$home vs $away</b>
📈 Line Movement: <b>$move points</b>
📊 Volume Spike: <b>$spike%</b>
🔥 Severity: <b>$severity</b>
✅ Confidence: <b>$(echo "$conf * 100" | bc)%</b>

⚡ <b>Recommended Actions:</b>
• Move line immediately
• Reduce exposure limits
• Monitor for reverse steam
• Check sharp money flow

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
        
        send_telegram "$msg"
        log "Steam move alert sent for $game (severity: $severity)"
      fi
    fi
  done
}

check_risk_exposure() {
  log "Checking risk exposure..."
  
  local risk
  risk=$(query_api "risk report today" 2>/dev/null) || return 1
  
  local net
  net=$(echo "$risk" | jq -r '.netExposure // 0' 2>/dev/null) || return 1
  
  local abs_net=${net#-}
  
  if (( $(echo "$abs_net > $RISK_THRESHOLD" | bc -l) )); then
    local total=$(echo "$risk" | jq -r '.totalExposure // 0')
    local level=$(echo "$risk" | jq -r '.riskLevel // "UNKNOWN"')
    local hedge=$(echo "$risk" | jq -r '.hedgeRecommendation // "No recommendation"')
    
    local emoji="⚠️"
    [[ "$level" == "HIGH" ]] && emoji="🔥"
    [[ "$level" == "CRITICAL" ]] && emoji="🚨"
    
    local msg="$emoji <b>RISK EXPOSURE ALERT</b>

📊 Total Exposure: <b>$(usd "$total")</b>
💰 Net Exposure: <b>$(usd "$net")</b>
🔥 Risk Level: <b>$level</b>

✅ <b>Hedge Recommendation:</b>
$hedge

⚡ <b>Immediate Actions:</b>
• Review exposure breakdown
• Execute hedge strategy
• Adjust limits if needed
• Monitor for changes

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
    
    send_telegram "$msg"
    log "Risk alert sent (net exposure: $(usd "$net"))"
  fi
}

check_agent_performance() {
  log "Checking agent performance..."
  
  local agents
  agents=$(query_api "top agents weekly profit" 2>/dev/null) || return 1
  
  local count
  count=$(echo "$agents" | jq -r '.result.count // 0' 2>/dev/null) || return 1
  
  if (( count > 0 )); then
    local top_agent=$(echo "$agents" | jq -r '.result.topAgents[0].agent_id // "Unknown"')
    local profit=$(echo "$agents" | jq -r '.result.topAgents[0].net_profit // 0')
    local risk_score=$(echo "$agents" | jq -r '.result.topAgents[0].risk_score // 0')
    
    # Only alert if profit is significant
    if (( $(echo "$profit > 50000" | bc -l) )); then
      local msg="🏆 <b>TOP AGENT ALERT</b>

👤 Agent: <code>$top_agent</code>
💰 Weekly Profit: <b>$(usd "$profit")</b>
⚠️ Risk Score: <b>$risk_score</b>

📊 <b>Top 5 Agents This Week:</b>
$(echo "$agents" | jq -r '.result.topAgents[] | "• \(.agent_id): $(usd \(.net_profit))"' | head -5)

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
      
      send_telegram "$msg"
      log "Agent performance alert sent (top: $top_agent)"
    fi
  fi
}

#------- HEALTH CHECK ----------------------------------------
check_health() {
  log "Running health check..."
  
  local health
  health=$(curl -s "$API_BASE/health" --max-time 10) || {
    error "Health check failed - API unreachable"
    send_telegram "🚨 <b>SYSTEM ALERT</b>

API health check failed!
Endpoint: $API_BASE/health

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
    return 1
  }
  
  local status
  status=$(echo "$health" | jq -r '.status // "unknown"')
  
  if [[ "$status" != "healthy" ]] && [[ "$status" != "ok" ]]; then
    error "Health check failed - status: $status"
    send_telegram "🚨 <b>SYSTEM ALERT</b>

API health check failed!
Status: <b>$status</b>

$(echo "$health" | jq -r '.')

⏰ $(date +'%Y-%m-%d %H:%M:%S')"
    return 1
  fi
  
  log "Health check passed (status: $status)"
  return 0
}

#------- MAIN ------------------------------------------------
main() {
  log "=== Starting Telegram Alert System ==="
  
  # Health check first
  check_health || exit 1
  
  # Run all checks
  check_sharp_customers
  check_steam_moves
  check_risk_exposure
  check_agent_performance
  
  log "=== Alert cycle complete ==="
}

# Run main function
main "$@"

