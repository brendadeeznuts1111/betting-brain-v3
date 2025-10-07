# 📊 Grafana Dashboard - Betting-Brain v3

**Real-Time Intelligence & Cost Monitoring Dashboard**

---

## 📋 Overview

This Grafana dashboard provides comprehensive monitoring for the Betting-Brain v3 edge-native betting intelligence layer, including:

- **Real-time betting intelligence metrics**
- **Cost cap monitoring and visualization**
- **Performance and reliability tracking**
- **Alert status and steam move detection**

---

## 🎯 Dashboard Panels (17 Total)

### Alert Status (Panels 1-4)

| Panel | Metric | Threshold | Alert Color |
|-------|--------|-----------|-------------|
| **CLV Alerts** | Customer Lifetime Value anomalies | < -5% or > +5% | Yellow: 1+ / Red: 5+ |
| **Hold % Alerts** | Hold percentage out of range | < 3% or > 15% | Yellow: 1+ / Red: 5+ |
| **Exposure Alerts** | Risk threshold breaches | $50k or 60% | Orange: 1+ / Red: 3+ |
| **Sharp Score Alerts** | Sharp customer identification | > 60 points | Yellow: 1+ / Red: 10+ |

### Business Intelligence (Panels 5-8)

#### Panel 5: Total Exposure by Event
- **Type:** Time series graph
- **Data:** Top 10 events by total risk
- **Format:** USD currency
- **Time Range:** Last hour

#### Panel 6: Steam Moves
- **Type:** Table
- **Columns:**
  - Timestamp
  - Event ID
  - Market Type
  - Line Change
  - Volume Change
  - Sigma (σ)
- **Limit:** 50 recent steam moves
- **Sort:** Most recent first

#### Panel 7: Top 10 Sharp Customers
- **Type:** Table with color coding
- **Columns:**
  - Customer ID
  - Sharp Score (color-coded: green < 50 < yellow < 70 < red)
  - CLV
  - Win Rate %
- **Data Source:** Last 24 hours

#### Panel 8: Hold Percentage by Market Type
- **Type:** Time series graph
- **Metrics:** Average hold % per market
- **Time Range:** Last 6 hours
- **Y-Axis:** 0-20%

### Cost Cap Monitoring (Panels 9-12)

All cost cap panels use **gauge visualization** with color coding:
- **Red:** 0-20% remaining (critical)
- **Orange:** 20-50% remaining (warning)
- **Green:** 50-100% remaining (healthy)

| Panel | Resource | Daily Limit | Formula |
|-------|----------|-------------|---------|
| **Panel 9** | D1 Reads | 100,000 | `(1 - reads/100000) * 100` |
| **Panel 10** | D1 Writes | 50,000 | `(1 - writes/50000) * 100` |
| **Panel 11** | Queue Messages | 1,000,000 | `(1 - messages/1000000) * 100` |
| **Panel 12** | Analytics Events | 10,000,000 | `(1 - events/10000000) * 100` |

### Performance Monitoring (Panels 13-15)

#### Panel 13: Worker Request Rate
- **Type:** Time series
- **Metric:** Requests per second
- **Calculation:** `rate(requests[1m])`

#### Panel 14: Worker Response Time
- **Type:** Time series with percentiles
- **Metrics:**
  - p50 (median)
  - p95
  - p99
- **Format:** Milliseconds

#### Panel 15: Error Rate
- **Type:** Time series with alert
- **Metric:** Error percentage
- **Alert:** Triggers if > 1% for 5 minutes
- **Max:** 5%

### Queue Monitoring (Panels 16-17)

#### Panel 16: line-ingress Queue Depth
- Monitors line movement ingestion queue

#### Panel 17: steam-webhook Queue Depth
- Monitors steam move detection queue

---

## 🔌 Data Sources Required

### 1. Cloudflare Analytics Engine

**Configuration:**
```yaml
Name: Cloudflare Analytics Engine
Type: cloudflare-analytics-engine
Dataset: betting_brain_analytics
```

**Used For:**
- CLV, Hold, Exposure, Sharp alerts
- Steam move detection
- Business intelligence metrics
- Customer analytics

### 2. Prometheus (Cloudflare Workers Metrics)

**Configuration:**
```yaml
Name: Prometheus
Type: prometheus
URL: <cloudflare-prometheus-endpoint>
```

**Used For:**
- Cost cap monitoring (D1, Queues, Analytics)
- Worker performance (request rate, latency, errors)
- Queue depth monitoring

---

## 📥 Installation Instructions

### Option 1: Grafana UI (Recommended)

1. **Login to Grafana:**
   ```
   https://grafana.com/
   ```

2. **Navigate to Dashboards:**
   - Click "+" icon in sidebar
   - Select "Import"

3. **Upload Dashboard:**
   - Click "Upload JSON file"
   - Select `grafana/dashboard.json`
   - Or paste JSON content directly

4. **Configure Data Sources:**
   - Map `${DS_ANALYTICS_ENGINE}` to your Cloudflare Analytics Engine data source
   - Map `${DS_PROMETHEUS}` to your Prometheus data source

5. **Save Dashboard:**
   - Click "Import"
   - Dashboard is now live!

### Option 2: Grafana API

```bash
curl -X POST "https://<your-grafana-instance>/api/dashboards/db" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @grafana/dashboard.json
```

### Option 3: Terraform

```hcl
resource "grafana_dashboard" "betting_brain" {
  config_json = file("${path.module}/grafana/dashboard.json")
  folder      = grafana_folder.betting.id
  
  overwrite = true
}

resource "grafana_folder" "betting" {
  title = "Betting Intelligence"
}
```

### Option 4: Grafana Provisioning

Add to your Grafana provisioning configuration:

```yaml
# dashboards.yaml
apiVersion: 1

providers:
  - name: 'Betting Brain'
    orgId: 1
    folder: 'Intelligence'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/dashboards/betting-brain
```

Then copy `dashboard.json` to the provisioning directory.

---

## 📊 Analytics Engine Data Structure

The dashboard expects data in Cloudflare Analytics Engine with the following structure:

### Index Format

```javascript
{
  indexes: ['<metric_type>'],  // e.g., 'steam_move', 'exposure_alert'
  blobs: [                      // String dimensions
    'event_id',
    'market_type',
    'customer_id',
    'alert_type'
  ],
  doubles: [                    // Numeric values
    'line_change',
    'volume_change',
    'sigma',
    'total_risk',
    'max_exposure',
    'sharp_score',
    'clv',
    'win_rate'
  ]
}
```

### Metric Types (Index Values)

| Index | Purpose | Blobs | Doubles |
|-------|---------|-------|---------|
| `steam_move` | Steam detection | event_id, market_type | line_change, volume_change, sigma |
| `exposure_alert` | Exposure tracking | event_id, alert_type | total_risk, max_exposure |
| `sharp_score` | Sharp customers | customer_id | sharp_score, clv, win_rate |
| `clv_alert` | CLV anomalies | customer_id, alert_type | clv_value |
| `hold_alert` | Hold % monitoring | market_type, alert_type | hold_percentage |

---

## 🎨 Dashboard Features

### Auto-Refresh
- **Default:** 30 seconds
- **Options:** 10s, 30s, 1m, 5m, 15m
- **Configurable** in top-right corner

### Time Range Selection
- **Default:** Last 6 hours
- **Quick Options:** 5m, 15m, 1h, 6h, 12h, 24h, 7d
- **Custom Range:** Available via date picker

### Annotations
Automatic event markers for:
- 🔥 **Steam Moves** (red markers)
- 💰 **Exposure Alerts** (orange markers)

### Alerts
Built-in alert on Panel 15 (Error Rate):
- **Condition:** Error rate > 1%
- **Duration:** 5 minutes
- **Action:** Trigger Grafana alert

---

## 🎯 Use Cases

### 1. Real-Time Monitoring
Watch live betting intelligence metrics:
- Stream move detection
- Exposure tracking
- Sharp customer activity

### 2. Cost Management
Ensure you stay within Cloudflare free tier:
- D1 database operations
- Queue message volume
- Analytics events

### 3. Performance Optimization
Track worker performance:
- Request latency (p50, p95, p99)
- Error rates
- Request volume

### 4. Business Intelligence
Analyze betting patterns:
- Hold percentage by market
- Top sharp customers
- Exposure distribution

---

## 🔧 Customization

### Adding New Panels

1. **Click "Add Panel"** in edit mode
2. **Select Visualization Type**
3. **Configure Query:**
   ```sql
   SELECT 
     timestamp,
     blob1 as dimension,
     double1 as value
   FROM betting_brain_analytics
   WHERE index1 = 'your_metric_type'
     AND timestamp > now() - INTERVAL '1' HOUR
   GROUP BY timestamp, blob1
   ORDER BY timestamp
   ```

### Modifying Thresholds

1. **Edit Panel** (click title → Edit)
2. **Navigate to "Field" tab**
3. **Modify "Thresholds":**
   ```json
   {
     "mode": "absolute",
     "steps": [
       { "value": 0, "color": "green" },
       { "value": 50, "color": "yellow" },
       { "value": 80, "color": "red" }
     ]
   }
   ```

### Adding Alerts

1. **Edit Panel**
2. **Navigate to "Alert" tab**
3. **Configure Rule:**
   - Condition: e.g., `avg() > 100`
   - Evaluation: e.g., every 1m for 5m
   - Notifications: Select channels

---

## 📈 Best Practices

### 1. Data Source Configuration
- ✅ Use separate data source for Analytics Engine and Prometheus
- ✅ Configure appropriate timeouts (30s recommended)
- ✅ Enable query caching for better performance

### 2. Query Optimization
- ✅ Limit result sets (use `LIMIT` clause)
- ✅ Use appropriate time windows
- ✅ Leverage indexes for better performance

### 3. Alert Configuration
- ✅ Set meaningful thresholds based on your SLAs
- ✅ Configure notification channels (Slack, PagerDuty, etc.)
- ✅ Test alerts before going live

### 4. Dashboard Organization
- ✅ Keep critical metrics at the top
- ✅ Use consistent color schemes
- ✅ Add panel descriptions for clarity

---

## 🐛 Troubleshooting

### No Data Appearing

**Check:**
1. Data source configuration is correct
2. Analytics Engine dataset name matches
3. Time range includes data
4. Worker is writing to Analytics Engine

**Debug Query:**
```sql
SELECT count(*) FROM betting_brain_analytics
WHERE timestamp > now() - INTERVAL '1' HOUR
```

### Slow Dashboard Performance

**Solutions:**
1. Reduce time range
2. Add `LIMIT` to queries
3. Increase refresh interval
4. Enable query caching

### Alert Not Triggering

**Verify:**
1. Alert rule is enabled
2. Notification channel is configured
3. Condition threshold is correct
4. Data source is reachable

---

## 📝 Changelog

### Version 1.0 (Current)
- ✅ 17 comprehensive panels
- ✅ Real-time intelligence metrics
- ✅ Cost cap monitoring (4 gauges)
- ✅ Performance tracking
- ✅ Business intelligence
- ✅ Auto-refresh (30s)
- ✅ Annotations for key events
- ✅ Alert on error rate

---

## 🔗 Related Documentation

- [Cloudflare Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Betting-Brain Documentation](../docs/INDEX.md)

---

**Dashboard Version:** 1.0  
**Last Updated:** October 7, 2025  
**Maintained By:** Betting-Brain Team  
**Status:** ✅ Production Ready

