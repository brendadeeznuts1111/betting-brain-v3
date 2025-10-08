#!/usr/bin/env bun
/**
 * Enhanced Log Monitor - Real-time extension log monitoring
 * Monitors logs from the Cloudflare Worker and displays them in real-time
 */

const WORKER_URL = 'http://localhost:8787';
const LOG_ENDPOINT = `${WORKER_URL}/logs`;
const MONITOR_INTERVAL_MS = 2000; // Fetch logs every 2 seconds
const SESSION_ID = `monitor-${Date.now()}`;
const MAX_LOG_ENTRIES = 1000;

class LogMonitor {
  constructor() {
    this.logs = [];
    this.lastLogTimestamp = new Date().toISOString();
    this.isRunning = false;
    this.stats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      startTime: new Date()
    };
  }

  start() {
    console.log('🔍 Starting Enhanced Extension Log Monitor...');
    console.log('📡 Worker URL:', WORKER_URL);
    console.log('🆔 Session ID:', SESSION_ID);
    console.log('📝 Press Ctrl+C to stop');
    console.log('=' .repeat(60));

    this.isRunning = true;
    this.displayHeader();
    
    // Initial fetch and then poll
    this.fetchAndDisplayLogs();
    this.intervalId = setInterval(() => this.fetchAndDisplayLogs(), MONITOR_INTERVAL_MS);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down log monitor...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.displaySummary();
  }

  async fetchAndDisplayLogs() {
    try {
      const response = await fetch(`${LOG_ENDPOINT}?since=${this.lastLogTimestamp}&limit=50`, {
        headers: {
          'X-Session-ID': SESSION_ID,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Worker log endpoint error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();

      if (data.logs && data.logs.length > 0) {
        data.logs.forEach(log => {
          this.displayLog(log);
          this.updateStats(log);
        });
        this.lastLogTimestamp = data.logs[data.logs.length - 1].timestamp;
      }

      // Display status
      this.displayStatus(data);

    } catch (error) {
      console.error('❌ Error fetching logs:', error.message);
    }
  }

  displayLog(log) {
    const level = log.level?.toUpperCase() || 'LOG';
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const message = log.message || 'No message';
    
    const levelEmoji = {
      'ERROR': '❌',
      'WARN': '⚠️',
      'INFO': 'ℹ️',
      'DEBUG': '🔍',
      'LOG': '📝'
    }[level] || '📝';

    const levelColor = {
      'ERROR': '\x1b[31m', // Red
      'WARN': '\x1b[33m',  // Yellow
      'INFO': '\x1b[36m',  // Cyan
      'DEBUG': '\x1b[35m', // Magenta
      'LOG': '\x1b[37m'    // White
    }[level] || '\x1b[37m';

    const resetColor = '\x1b[0m';

    console.log(`${levelColor}${levelEmoji} [${timestamp}] ${level}: ${message}${resetColor}`);
    
    // Show metadata for important logs
    if (log.level === 'error' || message.includes('DEBUG:') || message.includes('🎯')) {
      console.log(`    📍 URL: ${log.url || 'unknown'}`);
      console.log(`    🔧 Extension ID: ${log.extensionId || 'unknown'}`);
    }

    // Store log for analysis
    this.logs.push(log);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.shift();
    }
  }

  updateStats(log) {
    this.stats.totalLogs++;
    
    switch (log.level?.toLowerCase()) {
      case 'error':
        this.stats.errorCount++;
        break;
      case 'warn':
        this.stats.warningCount++;
        break;
      case 'info':
        this.stats.infoCount++;
        break;
      case 'debug':
        this.stats.debugCount++;
        break;
    }
  }

  displayStatus(data) {
    const uptime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000);
    const uptimeStr = `${Math.floor(uptime / 60)}:${(uptime % 60).toString().padStart(2, '0')}`;
    
    process.stdout.write(`\r✅ Worker healthy (${data.duration || 'N/A'}) - Logs: ${data.logs?.length || 0} - Uptime: ${uptimeStr} - Total: ${this.stats.totalLogs}`);
  }

  displayHeader() {
    console.log('📊 Log Monitor Statistics:');
    console.log('   • Total Logs: 0');
    console.log('   • Errors: 0');
    console.log('   • Warnings: 0');
    console.log('   • Info: 0');
    console.log('   • Debug: 0');
    console.log('=' .repeat(60));
  }

  displaySummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 LOG MONITOR SUMMARY');
    console.log('=' .repeat(60));
    console.log(`📈 Total Logs Processed: ${this.stats.totalLogs}`);
    console.log(`❌ Errors: ${this.stats.errorCount}`);
    console.log(`⚠️  Warnings: ${this.stats.warningCount}`);
    console.log(`ℹ️  Info: ${this.stats.infoCount}`);
    console.log(`🔍 Debug: ${this.stats.debugCount}`);
    
    const uptime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000);
    console.log(`⏱️  Total Uptime: ${Math.floor(uptime / 60)}:${(uptime % 60).toString().padStart(2, '0')}`);
    
    if (this.stats.totalLogs > 0) {
      const avgLogsPerMinute = Math.round((this.stats.totalLogs / uptime) * 60);
      console.log(`📊 Average Logs/Minute: ${avgLogsPerMinute}`);
    }

    // Show recent errors
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .slice(-5);
    
    if (recentErrors.length > 0) {
      console.log('\n❌ Recent Errors:');
      recentErrors.forEach(error => {
        const timestamp = new Date(error.timestamp).toLocaleTimeString();
        console.log(`   [${timestamp}] ${error.message}`);
      });
    }

    console.log('=' .repeat(60));
  }
}

// Main execution
if (import.meta.main) {
  const monitor = new LogMonitor();
  monitor.start();
}

export { LogMonitor };