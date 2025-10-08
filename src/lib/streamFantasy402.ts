/**
 * Fantasy402 Real-Time Streaming Adapter
 *
 * WebSocket connection to fantasy402.com for real-time bet settlement data
 * Falls back to polling if WebSocket unavailable
 *
 * Usage:
 *   const ws = startStream(customerId, token, (data) => {
 *     console.log('Bet settled:', data);
 *   });
 */

import { WebSocket } from 'ws';

export interface StreamData {
  eventId: string;
  timestamp: string;
  volume: number;
  hold: number;
  source: 'fantasy402';
}

export interface StreamOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  pollInterval?: number; // Fallback polling interval (ms)
}

const DEFAULT_OPTIONS: StreamOptions = {
  reconnectDelay: 5000,
  maxReconnectAttempts: 10,
  pollInterval: 10000,
};

/**
 * Start WebSocket stream to fantasy402.com
 * Auto-reconnects on disconnect with exponential backoff
 */
export function startStream(
  customerId: string,
  token: string,
  onData: (data: StreamData) => void,
  options: StreamOptions = {}
): WebSocket {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let reconnectAttempts = 0;

  const connect = (): WebSocket => {
    const ws = new WebSocket('wss://fantasy402.com/stream', {
      headers: {
        authorization: `Bearer ${token}`,
        'x-customer-id': customerId,
      },
    });

    ws.on('open', () => {
      console.log(`[stream] WebSocket connected for customer ${customerId}`);
      reconnectAttempts = 0; // Reset on successful connection
    });

    ws.on('message', (buffer: Buffer) => {
      try {
        const msg = JSON.parse(buffer.toString());

        if (msg.type === 'bet_settled') {
          const data: StreamData = {
            eventId: `f402-${msg.betId}`,
            timestamp: msg.settledAt,
            volume: msg.stake,
            hold: msg.stake > 0 ? (msg.profit / msg.stake) : 0, // % hold
            source: 'fantasy402',
          };
          onData(data);
        }
      } catch (error) {
        console.error('[stream] Error parsing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('[stream] WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`[stream] WebSocket closed: ${code} ${reason.toString()}`);

      if (reconnectAttempts < (opts.maxReconnectAttempts || 10)) {
        const delay = opts.reconnectDelay! * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[stream] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
        setTimeout(() => {
          const newWs = connect();
          Object.assign(ws, newWs); // Replace ws instance
        }, delay);
      } else {
        console.error('[stream] Max reconnect attempts reached, switching to polling');
        startPolling(customerId, token, onData, opts);
      }
    });

    return ws;
  };

  return connect();
}

/**
 * Fallback polling mechanism when WebSocket unavailable
 */
function startPolling(
  customerId: string,
  token: string,
  onData: (data: StreamData) => void,
  options: StreamOptions
): NodeJS.Timer {
  let lastTimestamp = new Date().toISOString();

  const poll = async () => {
    try {
      const response = await fetch(
        `https://fantasy402.com/cloud/api/Bet/getSettledBets?customerId=${customerId}&since=${lastTimestamp}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`[stream] Polling error: ${response.status}`);
        return;
      }

      const bets = await response.json();

      for (const bet of bets) {
        const data: StreamData = {
          eventId: `f402-${bet.betId}`,
          timestamp: bet.settledAt,
          volume: bet.stake,
          hold: bet.stake > 0 ? (bet.profit / bet.stake) : 0,
          source: 'fantasy402',
        };
        onData(data);
        lastTimestamp = bet.settledAt;
      }
    } catch (error) {
      console.error('[stream] Polling error:', error);
    }
  };

  console.log(`[stream] Starting polling every ${options.pollInterval}ms`);
  const interval = setInterval(poll, options.pollInterval);

  // Initial poll
  poll();

  return interval;
}

/**
 * Stop streaming (close WebSocket or stop polling)
 */
export function stopStream(ws: WebSocket | NodeJS.Timer) {
  if (ws instanceof WebSocket) {
    ws.close();
  } else {
    clearInterval(ws);
  }
}
