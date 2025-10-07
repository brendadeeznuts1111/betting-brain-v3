# 🏢 Agent Risk Summary - User Guide

## 📊 Overview

The Enhanced Agent Risk Summary provides comprehensive risk analysis and performance tracking for all betting agents in your system. It helps identify high-risk agents, monitor performance, and make data-driven decisions about agent management.

---

## 🎯 Key Features

### **Risk Overview Cards**
- **Total Agents**: Count of active agents
- **High Risk**: Number of agents with risk score > 70
- **Total Action**: Combined action across all agents
- **Average Risk**: Mean risk score across all agents

### **Enhanced Agent Table**
- **Risk Score**: 0-100 score with color-coded badges
- **Win Rate**: Estimated based on wager types
- **Average Wager Size**: Per-agent wager analysis
- **Customer Count**: Number of customers per agent
- **View Details**: Click to see detailed agent breakdown

### **View Toggle**
- **📊 Risk View**: Sorted by risk score (highest first)
- **💰 Performance View**: Sorted by total action (highest first)

### **Export Functionality**
- **CSV Export**: Download complete agent analysis
- **Risk Metrics**: All calculated risk scores included
- **Performance Data**: Win rates, wager sizes, etc.

---

## 🧮 Risk Scoring Algorithm

### **Volume Risk (0-40 points)**
```
Score = min(40, (Total Action / $1,000,000) × 40)
```
- Higher total action = higher risk
- Caps at 40 points for very large volumes

### **Customer Concentration Risk (0-30 points)**
```
Score = min(30, (Customer Count / 50) × 30)
```
- More customers = higher risk
- Caps at 30 points for very large customer bases

### **Wager Size Risk (0-20 points)**
```
Score = min(20, (Avg Wager Size / $50,000) × 20)
```
- Larger average wagers = higher risk
- Caps at 20 points for very large wagers

### **Win Rate Risk (0-10 points)**
```
Score = max(0, 10 - (Win Rate × 20))
```
- Lower win rate = higher risk
- Based on estimated win rates from wager types

---

## 🎨 Risk Badge System

| Risk Score | Badge | Color | Action Required |
|------------|-------|-------|-----------------|
| 80-100 | 🔥 Critical | Red | Immediate review |
| 60-79 | ⚠️ High | Orange | Monitor closely |
| 40-59 | ⚡ Medium | Yellow | Regular monitoring |
| 0-39 | ✅ Low | Green | Normal operations |

---

## 📈 Win Rate Estimation

The system estimates win rates based on wager types:

- **Straight Bets (S)**: 55% estimated win rate
- **Parlays (P)**: 25% estimated win rate
- **Moneyline (M)**: 50% estimated win rate
- **Other Types**: 45% estimated win rate

**Formula:**
```
Win Rate = (Straight × 0.55 + Parlay × 0.25 + Other × 0.45) / Total Wagers
```

---

## 🔍 Agent Details Modal

Click the "👁️ View" button to see:

### **Key Metrics**
- Total Action
- Customer Count
- Wager Count
- Risk Score

### **Customer List**
- All customers under this agent
- Scrollable list for large customer bases

---

## 📊 Export Data

The CSV export includes:

| Column | Description |
|--------|-------------|
| Agent | Agent ID |
| Total Action | Total amount wagered |
| Net Exposure | Estimated exposure (10% of action) |
| Risk Score | Calculated risk score (0-100) |
| Customers | Number of customers |
| Wagers | Number of wagers |
| Avg Wager | Average wager size |
| Win Rate | Estimated win rate (%) |
| Concentration Risk | Customer concentration risk (%) |

---

## 🚨 Risk Management Workflow

### **Daily Review**
1. Check **High Risk** agents (score > 70)
2. Review **Critical** agents (score > 80)
3. Monitor **Total Action** trends
4. Export data for reporting

### **Weekly Analysis**
1. Compare risk scores over time
2. Identify agents with increasing risk
3. Review customer concentration
4. Analyze win rate trends

### **Monthly Review**
1. Full risk assessment
2. Agent performance evaluation
3. Customer distribution analysis
4. Risk mitigation strategies

---

## ⚙️ Configuration

### **Risk Thresholds**
- **High Risk**: Score > 70
- **Critical Risk**: Score > 80
- **Volume Cap**: $1M for max volume risk
- **Customer Cap**: 50 customers for max concentration risk
- **Wager Cap**: $50K for max wager size risk

### **Win Rate Assumptions**
- **Straight Bets**: 55% win rate
- **Parlays**: 25% win rate
- **Other Types**: 45% win rate

---

## 🔧 Troubleshooting

### **No Data Showing**
- Ensure you have fresh betting data
- Check that agents have wagers
- Verify data filtering is working

### **Risk Scores Seem Wrong**
- Check agent total action amounts
- Verify customer counts
- Review wager type distribution

### **Export Not Working**
- Check browser download permissions
- Ensure data is loaded before exporting
- Try refreshing the page

---

## 📞 Support

For questions about the Agent Risk Summary:

1. Check this guide first
2. Review the risk scoring algorithm
3. Test with sample data
4. Contact system administrator

---

**🎯 The Enhanced Agent Risk Summary gives you complete visibility into agent performance and risk levels, helping you make informed decisions about your betting operations!**
