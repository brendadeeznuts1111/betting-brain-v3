/**
 * Fantasy402 WebSocket Handler
 * 
 * Cloudflare Worker WebSocket handler for persistent connections
 * Enables real-time data streaming to browser extensions
 */

import type { Env } from '../types/cloudflare';

interface WebSocketSession {
    id: string;
    connectedAt: Date;
    lastActivity: Date;
    isAuthenticated: boolean;
}

/**
 * Handle WebSocket upgrade request
 * 
 * @example
 * if (url.pathname === '/ws') {
 *   return handleWebSocketUpgrade(request, env);
 * }
 */
export async function handleWebSocketUpgrade(
    request: Request,
    env: Env
): Promise<Response> {
    const requestId = Date.now().toString(36);
    
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade request', {
            status: 426,
            headers: {
                'Content-Type': 'text/plain',
                'Upgrade': 'websocket'
            }
        });
    }

    // Create a WebSocket pair
    // client: sent to the browser
    // server: handled by our Worker
    const [client, server] = Object.values(new WebSocketPair());

    // Accept the WebSocket connection
    server.accept();

    // Initialize session
    const session: WebSocketSession = {
        id: requestId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        isAuthenticated: false
    };

    console.log(`[${requestId}] 🔌 WebSocket connected`);

    // Set up session handler
    handleWebSocketSession(server, session, env, requestId);

    // Return 101 Switching Protocols with the client WebSocket
    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

/**
 * Handle WebSocket session lifecycle
 */
async function handleWebSocketSession(
    webSocket: WebSocket,
    session: WebSocketSession,
    env: Env,
    requestId: string
): Promise<void> {
    
    // Send welcome message
    webSocket.send(JSON.stringify({
        type: 'connected',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        message: 'Welcome to Fantasy402 WebSocket'
    }));

    // Set up heartbeat (ping every 30 seconds)
    const heartbeatInterval = setInterval(() => {
        try {
            webSocket.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error(`[${requestId}] ❌ Heartbeat failed:`, error);
            clearInterval(heartbeatInterval);
        }
    }, 30000);

    // Handle incoming messages
    webSocket.addEventListener('message', async (event) => {
        session.lastActivity = new Date();
        
        try {
            const data = JSON.parse(event.data as string);
            
            console.log(`[${requestId}] 📥 Message:`, data.type || 'unknown');
            
            switch (data.type) {
                case 'auth':
                    // Handle authentication
                    await handleAuth(webSocket, data, session, env, requestId);
                    break;
                    
                case 'pong':
                    // Heartbeat response
                    if (session.isAuthenticated) {
                        console.log(`[${requestId}] 💓 Pong received`);
                    }
                    break;
                    
                case 'subscribe':
                    // Subscribe to specific data streams
                    await handleSubscribe(webSocket, data, session, env, requestId);
                    break;
                    
                default:
                    webSocket.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown message type',
                        timestamp: new Date().toISOString()
                    }));
            }
            
        } catch (error) {
            console.error(`[${requestId}] ❌ Error parsing message:`, error);
            webSocket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
                timestamp: new Date().toISOString()
            }));
        }
    });

    // Handle connection close
    webSocket.addEventListener('close', (event) => {
        clearInterval(heartbeatInterval);
        
        const duration = new Date().getTime() - session.connectedAt.getTime();
        console.log(`[${requestId}] 🔌 WebSocket closed:`, {
            code: event.code,
            reason: event.reason || 'Unknown',
            duration: `${Math.round(duration / 1000)}s`
        });
    });

    // Handle errors
    webSocket.addEventListener('error', (event) => {
        console.error(`[${requestId}] ❌ WebSocket error:`, event);
    });
}

/**
 * Handle authentication message
 */
async function handleAuth(
    webSocket: WebSocket,
    data: any,
    session: WebSocketSession,
    env: Env,
    requestId: string
): Promise<void> {
    // Simple authentication (you can enhance this)
    const { token, userAgent, source } = data;
    
    // For now, just accept any connection from the extension
    if (source === 'fantasy402-extension') {
        session.isAuthenticated = true;
        
        webSocket.send(JSON.stringify({
            type: 'auth-success',
            sessionId: session.id,
            timestamp: new Date().toISOString()
        }));
        
        console.log(`[${requestId}] ✅ Authenticated: ${source}`);
    } else {
        webSocket.send(JSON.stringify({
            type: 'auth-failed',
            message: 'Invalid authentication',
            timestamp: new Date().toISOString()
        }));
        
        console.log(`[${requestId}] ❌ Authentication failed`);
    }
}

/**
 * Handle subscription to data streams
 */
async function handleSubscribe(
    webSocket: WebSocket,
    data: any,
    session: WebSocketSession,
    env: Env,
    requestId: string
): Promise<void> {
    if (!session.isAuthenticated) {
        webSocket.send(JSON.stringify({
            type: 'error',
            message: 'Not authenticated',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    const { streams } = data;
    
    console.log(`[${requestId}] 📡 Subscribed to:`, streams);
    
    webSocket.send(JSON.stringify({
        type: 'subscribed',
        streams: streams,
        timestamp: new Date().toISOString()
    }));
}

/**
 * Broadcast data to connected WebSocket clients
 * 
 * This would be called from your queue consumer when new data arrives
 * 
 * @example
 * // In queue consumer:
 * if (env.WEBSOCKET_SESSIONS) {
 *   await broadcastToWebSockets(env.WEBSOCKET_SESSIONS, {
 *     type: 'data',
 *     operation: 'getBetTicker',
 *     data: parsedData
 *   });
 * }
 */
export async function broadcastToWebSockets(
    sessions: Map<string, WebSocket>,
    message: any
): Promise<void> {
    const payload = JSON.stringify(message);
    const promises: Promise<void>[] = [];
    
    for (const [sessionId, webSocket] of sessions.entries()) {
        promises.push(
            (async () => {
                try {
                    webSocket.send(payload);
                } catch (error) {
                    console.error(`Failed to send to session ${sessionId}:`, error);
                    // Remove dead connection
                    sessions.delete(sessionId);
                }
            })()
        );
    }
    
    await Promise.allSettled(promises);
}

/**
 * Send data to a specific WebSocket client
 */
export function sendToWebSocket(
    webSocket: WebSocket,
    data: any
): boolean {
    try {
        webSocket.send(JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to send to WebSocket:', error);
        return false;
    }
}

