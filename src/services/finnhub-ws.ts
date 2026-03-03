const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string;
const WS_URL = `wss://ws.finnhub.io?token=${API_KEY}`;

type TradeCallback = (symbol: string, price: number, volume: number, timestamp: number) => void;

export class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private callbacks = new Map<string, Set<TradeCallback>>();
  private globalCallbacks = new Set<TradeCallback>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isDestroyed = false;

  connect(): void {
    if (this.isDestroyed || !API_KEY) return;
    this.cleanup();

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[FinnhubWS] Connected');
        this.reconnectDelay = 1000;
        // Re-subscribe all symbols
        for (const symbol of this.subscriptions) {
          this.sendSubscribe(symbol);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'trade' && Array.isArray(msg.data)) {
            for (const trade of msg.data) {
              const symbol = trade.s as string;
              const price = trade.p as number;
              const volume = trade.v as number;
              const timestamp = trade.t as number;

              // Fire symbol-specific callbacks
              const cbs = this.callbacks.get(symbol);
              if (cbs) {
                for (const cb of cbs) cb(symbol, price, volume, timestamp);
              }

              // Fire global callbacks
              for (const cb of this.globalCallbacks) cb(symbol, price, volume, timestamp);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed) {
          console.log(`[FinnhubWS] Disconnected, reconnecting in ${this.reconnectDelay}ms`);
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after this
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  subscribe(symbol: string, callback?: TradeCallback): void {
    this.subscriptions.add(symbol);
    if (callback) {
      if (!this.callbacks.has(symbol)) this.callbacks.set(symbol, new Set());
      this.callbacks.get(symbol)!.add(callback);
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(symbol);
    }
  }

  subscribeMany(symbols: string[], callback?: TradeCallback): void {
    for (const s of symbols) this.subscribe(s, callback);
  }

  onTrade(callback: TradeCallback): void {
    this.globalCallbacks.add(callback);
  }

  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
    this.callbacks.delete(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  private sendSubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.cleanup();
    this.subscriptions.clear();
    this.callbacks.clear();
    this.globalCallbacks.clear();
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
