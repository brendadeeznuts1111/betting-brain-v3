/**
 * Fantasy402 WebSocket Client
 * 
 * Maintains persistent connection to Cloudflare Worker for real-time data streaming
 * Replaces HTTP polling with WebSocket push for 90% bandwidth reduction
 */

const WORKER_URL = 'wss://betting-brain-v3.nolarose1968-806.workers.dev/ws';
const DEBUG = true;

class Fantasy402WebSocket {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Start at 1 second
        this.isIntentionallyClosed = false;
        this.messageQueue = [];
        this.connectionEstablished = false;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            if (DEBUG) console.log('[Fantasy402 WS] Already connected');
            return;
        }

        if (DEBUG) console.log('[Fantasy402 WS] 🔌 Connecting to:', this.url);
        
        try {
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => this.handleOpen();
            this.socket.onmessage = (event) => this.handleMessage(event);
            this.socket.onerror = (error) => this.handleError(error);
            this.socket.onclose = (event) => this.handleClose(event);
            
        } catch (error) {
            console.error('[Fantasy402 WS] ❌ Connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle connection open
     */
    handleOpen() {
        if (DEBUG) console.log('[Fantasy402 WS] ✅ Connected successfully');
        
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.connectionEstablished = true;
        
        // Send any queued messages
        this.flushMessageQueue();
        
        // Optional: Send authentication or identification
        this.send({
            type: 'auth',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            source: 'fantasy402-extension'
        });
    }

    /**
     * Handle incoming messages from Worker
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (DEBUG) {
                console.log('[Fantasy402 WS] 📥 Received:', data.type || 'unknown');
            }
            
            switch (data.type) {
                case 'ack':
                    // Acknowledgment from server
                    if (DEBUG) console.log('[Fantasy402 WS] ✅ Message acknowledged');
                    break;
                    
                case 'data':
                    // Real-time data update from server
                    this.handleDataUpdate(data);
                    break;
                    
                case 'ping':
                    // Heartbeat from server
                    this.send({ type: 'pong', timestamp: new Date().toISOString() });
                    break;
                    
                case 'error':
                    console.error('[Fantasy402 WS] ❌ Server error:', data.message);
                    break;
                    
                default:
                    if (DEBUG) console.log('[Fantasy402 WS] Unknown message type:', data.type);
            }
            
        } catch (error) {
            console.error('[Fantasy402 WS] ❌ Error parsing message:', error);
        }
    }

    /**
     * Handle data updates from server
     */
    handleDataUpdate(data) {
        if (DEBUG) {
            console.log('[Fantasy402 WS] 📊 Data update:', {
                operation: data.operation,
                timestamp: data.timestamp
            });
        }
        
        // Emit custom event that other parts of extension can listen to
        window.dispatchEvent(new CustomEvent('fantasy402-data-update', {
            detail: data
        }));
    }

    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('[Fantasy402 WS] ❌ Error:', error);
    }

    /**
     * Handle connection close
     */
    handleClose(event) {
        this.connectionEstablished = false;
        
        if (this.isIntentionallyClosed) {
            if (DEBUG) console.log('[Fantasy402 WS] 🔌 Connection closed intentionally');
            return;
        }
        
        if (DEBUG) {
            console.log('[Fantasy402 WS] 🔌 Disconnected:', {
                code: event.code,
                reason: event.reason || 'Unknown',
                wasClean: event.wasClean
            });
        }
        
        this.scheduleReconnect();
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Fantasy402 WS] ❌ Max reconnection attempts reached');
            console.error('[Fantasy402 WS] ⚠️  Falling back to HTTP polling');
            
            // Emit event to notify other parts that WebSocket failed
            window.dispatchEvent(new CustomEvent('fantasy402-ws-failed'));
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            30000 // Max 30 seconds
        );
        
        if (DEBUG) {
            console.log(`[Fantasy402 WS] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }
        
        setTimeout(() => this.connect(), delay);
    }

    /**
     * Send message to server
     */
    send(data) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            // Queue message for later
            this.messageQueue.push(data);
            
            if (DEBUG) {
                console.log('[Fantasy402 WS] ⏳ Message queued (not connected)');
            }
            return false;
        }

        try {
            this.socket.send(JSON.stringify(data));
            
            if (DEBUG && data.type !== 'pong') {
                console.log('[Fantasy402 WS] 📤 Sent:', data.type || 'data');
            }
            
            return true;
        } catch (error) {
            console.error('[Fantasy402 WS] ❌ Send failed:', error);
            this.messageQueue.push(data);
            return false;
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        if (this.messageQueue.length === 0) return;
        
        if (DEBUG) {
            console.log(`[Fantasy402 WS] 📤 Flushing ${this.messageQueue.length} queued messages`);
        }
        
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        
        queue.forEach(data => this.send(data));
    }

    /**
     * Close connection
     */
    close() {
        this.isIntentionallyClosed = true;
        
        if (this.socket) {
            this.socket.close(1000, 'Intentional disconnect');
        }
        
        if (DEBUG) console.log('[Fantasy402 WS] 🔌 Connection closed');
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    /**
     * Get connection state
     */
    getState() {
        if (!this.socket) return 'DISCONNECTED';
        
        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: return 'CONNECTING';
            case WebSocket.OPEN: return 'CONNECTED';
            case WebSocket.CLOSING: return 'CLOSING';
            case WebSocket.CLOSED: return 'DISCONNECTED';
            default: return 'UNKNOWN';
        }
    }
}

// Initialize WebSocket connection
const fantasy402WS = new Fantasy402WebSocket(WORKER_URL);

// Auto-connect on load
if (typeof window !== 'undefined') {
    // Connect after a short delay to ensure other scripts are loaded
    setTimeout(() => {
        fantasy402WS.connect();
    }, 1000);
    
    // Make available globally
    window.fantasy402WS = fantasy402WS;
    
    // Listen for data updates
    window.addEventListener('fantasy402-data-update', (event) => {
        if (DEBUG) {
            console.log('[Fantasy402 WS] 📊 Received data update:', event.detail);
        }
        // You can add custom handling here
    });
    
    // Listen for WebSocket failures
    window.addEventListener('fantasy402-ws-failed', () => {
        console.log('[Fantasy402 WS] ⚠️  WebSocket unavailable, using HTTP fallback');
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        fantasy402WS.close();
    });
}

if (DEBUG) {
    console.log('[Fantasy402 WS] 🚀 WebSocket client initialized');
}

