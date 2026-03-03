enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  maxFailures: number;
  cooldownMs: number;
  name: string;
}

const DB_NAME = 'marketpulse-cache';
const STORE_NAME = 'responses';
const DB_VERSION = 1;

function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastGoodResult: T | null = null;

  private readonly maxFailures: number;
  private readonly cooldownMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.maxFailures = options.maxFailures;
    this.cooldownMs = options.cooldownMs;
    this.name = options.name;
  }

  async execute(fn: () => Promise<T>): Promise<T> {
    switch (this.state) {
      case CircuitState.CLOSED:
        return this.executeClosed(fn);
      case CircuitState.OPEN:
        return this.executeOpen(fn);
      case CircuitState.HALF_OPEN:
        return this.executeHalfOpen(fn);
    }
  }

  private async executeClosed(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.failureCount = 0;
      this.lastGoodResult = result;
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.maxFailures) {
        this.state = CircuitState.OPEN;
        this.lastFailureTime = Date.now();
        console.warn(`[CircuitBreaker:${this.name}] Opened after ${this.failureCount} failures`);
      }
      throw error;
    }
  }

  private async executeOpen(fn: () => Promise<T>): Promise<T> {
    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed >= this.cooldownMs) {
      this.state = CircuitState.HALF_OPEN;
      console.warn(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
      return this.executeHalfOpen(fn);
    }

    if (this.lastGoodResult !== null) {
      console.warn(`[CircuitBreaker:${this.name}] Circuit OPEN, returning stale result`);
      return this.lastGoodResult;
    }

    throw new Error(`[CircuitBreaker:${this.name}] Circuit OPEN and no cached result available`);
  }

  private async executeHalfOpen(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.lastGoodResult = result;
      console.warn(`[CircuitBreaker:${this.name}] Recovery successful, circuit CLOSED`);
      return result;
    } catch (error) {
      this.state = CircuitState.OPEN;
      this.lastFailureTime = Date.now();
      console.warn(`[CircuitBreaker:${this.name}] Half-open test failed, circuit re-OPENED`);

      if (this.lastGoodResult !== null) {
        return this.lastGoodResult;
      }
      throw error;
    }
  }

  async cacheResult(key: string, data: T): Promise<void> {
    try {
      const db = await openCacheDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ data, timestamp: Date.now() }, key);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (error) {
      console.warn(`[CircuitBreaker:${this.name}] Failed to cache result for key "${key}":`, error);
    }
  }

  async getCached(key: string): Promise<T | null> {
    try {
      const db = await openCacheDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      const result = await new Promise<T | null>((resolve, reject) => {
        request.onsuccess = () => {
          const entry = request.result;
          resolve(entry ? entry.data : null);
        };
        request.onerror = () => reject(request.error);
      });
      db.close();
      return result;
    } catch (error) {
      console.warn(`[CircuitBreaker:${this.name}] Failed to read cache for key "${key}":`, error);
      return null;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getName(): string {
    return this.name;
  }
}
