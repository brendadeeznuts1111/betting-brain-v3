# 🔧 Tools & Utilities

This directory contains HTML tools and utilities for the Betting-Brain v3 system.

## 📊 Data Capture Tools

### **Live Data Capture**
**File:** `capture-live-data.html`  
**Purpose:** Guided tool to capture fresh betting data  
**Usage:**
1. Open from fantasy402.com domain
2. Follow step-by-step instructions
3. Capture data with valid authentication

### **Console Script Method**
**File:** `test-interceptor-with-auth.html`  
**Purpose:** Console script for quick data capture  
**Usage:**
1. Open fantasy402.com
2. Press F12 → Console
3. Copy/paste provided script
4. Press Enter

## 🧪 Testing Tools

### **Data Filtering Test**
**File:** `test-data-filtering.html`  
**Purpose:** Test data filtering and parsing logic  
**Features:**
- Test valid JSON responses
- Test HTML error filtering
- Live data validation
- Error counting

### **Dashboard Test**
**File:** `test-dashboard.html`  
**Purpose:** Basic dashboard functionality test  
**Features:**
- API endpoint testing
- CORS validation
- Browser compatibility
- Response parsing

### **Diagnostic Suite**
**File:** `diagnostic-suite.html`  
**Purpose:** Comprehensive system diagnostics  
**Features:**
- Worker health check
- KV storage test
- API connectivity
- Performance metrics
- Error analysis

## 🚀 Quick Start

### **Capture Fresh Data (Recommended)**
```bash
# Method 1: Browser Extension
1. Install browser extension
2. Use fantasy402.com normally
3. Data auto-captured

# Method 2: Console Script
1. Open fantasy402.com
2. F12 → Console
3. Run provided script

# Method 3: Capture Tool
1. Open tools/capture-live-data.html
2. Follow guided steps
3. Capture from active session
```

### **Test System Health**
```bash
# Open diagnostic suite
tools/diagnostic-suite.html

# Test data filtering
tools/test-data-filtering.html

# Basic functionality test
tools/test-dashboard.html
```

## 🔍 Troubleshooting

### **No Data in Dashboards**
1. Check if you have fresh data
2. Use capture tools to get new data
3. Verify worker is running
4. Check console for errors

### **Authentication Issues**
1. Must capture from fantasy402.com domain
2. Ensure you're logged in
3. Use browser extension for automatic capture
4. Check JWT token validity

### **CORS Errors**
1. Ensure dashboards are served from localhost
2. Check worker CORS headers
3. Use proper fetch configuration
4. Verify worker URL is correct

## 📖 Documentation

- **[Start Here Guide](../docs/guides/START_HERE.md)** - Complete setup guide
- **[Agent Risk Guide](../docs/guides/AGENT_RISK_GUIDE.md)** - Risk analysis
- **[Logging Guide](../docs/guides/LOGGING_GUIDE.md)** - System logging
- **[Dashboard Collection](../docs/dashboards/README.md)** - Dashboard overview

## 🎯 Best Practices

1. **Always capture fresh data** before using dashboards
2. **Use browser extension** for ongoing data capture
3. **Test system health** regularly with diagnostic tools
4. **Check console logs** for debugging information
5. **Export data regularly** for backup and analysis

---

**🔧 These tools ensure your betting intelligence system runs smoothly and captures accurate data!**
