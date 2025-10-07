// Log Forwarder - Real-time extension log monitoring
// This script captures all console logs and forwards them to a monitoring endpoint

class LogForwarder {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.forwardingEnabled = true;
    this.endpoint = 'https://betting-brain-v3.nolarose1968-806.workers.dev/logs';
    this.sessionId = this.generateSessionId();
    
    this.init();
  }

  generateSessionId() {
    return `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    console.log('🔍 Log Forwarder initialized', {
      sessionId: this.sessionId,
      endpoint: this.endpoint,
      timestamp: new Date().toISOString()
    });

    // Capture console methods
    this.captureConsole();
    
    // Capture unhandled errors
    this.captureErrors();
    
    // Start periodic forwarding
    this.startPeriodicForwarding();
    
    // Forward immediately on page load
    setTimeout(() => this.forwardLogs(), 2000);
  }

  captureConsole() {
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    Object.keys(originalMethods).forEach(method => {
      console[method] = (...args) => {
        // Call original method
        originalMethods[method].apply(console, args);
        
        // Capture for forwarding
        this.captureLog(method, args);
      };
    });
  }

  captureErrors() {
    window.addEventListener('error', (event) => {
      this.captureLog('error', [
        `Unhandled Error: ${event.error?.message || event.message}`,
        `File: ${event.filename}:${event.lineno}:${event.colno}`,
        event.error?.stack
      ]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason?.stack
      ]);
    });
  }

  captureLog(level, args) {
    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      url: window.location.href,
      userAgent: navigator.userAgent,
      extensionId: chrome?.runtime?.id || 'unknown'
    };

    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Forward critical logs immediately
    if (level === 'error' || logEntry.message.includes('DEBUG:') || logEntry.message.includes('🎯')) {
      this.forwardLogs();
    }
  }

  async forwardLogs() {
    if (!this.forwardingEnabled || this.logs.length === 0) return;

    try {
      const logsToForward = [...this.logs];
      this.logs = []; // Clear after forwarding

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
          'X-Extension-ID': chrome?.runtime?.id || 'unknown'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          logs: logsToForward,
          metadata: {
            url: window.location.href,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
            extensionVersion: chrome?.runtime?.getManifest?.()?.version || 'unknown'
          }
        })
      });

      if (response.ok) {
        console.log('✅ Logs forwarded successfully', { count: logsToForward.length });
      } else {
        console.warn('⚠️ Log forwarding failed', { status: response.status });
      }
    } catch (error) {
      console.error('❌ Log forwarding error:', error);
    }
  }

  startPeriodicForwarding() {
    // Forward logs every 10 seconds
    setInterval(() => {
      if (this.logs.length > 0) {
        this.forwardLogs();
      }
    }, 10000);
  }

  // Manual trigger for immediate forwarding
  forceForward() {
    this.forwardLogs();
  }

  // Get current logs for debugging
  getLogs() {
    return this.logs;
  }
}

// Initialize log forwarder
window.logForwarder = new LogForwarder();

// Expose for manual control
window.forwardLogs = () => window.logForwarder.forceForward();
window.getExtensionLogs = () => window.logForwarder.getLogs();

console.log('🔍 Log Forwarder ready for real-time monitoring');
