/**
 * Fantasy402 Configuration Cache Manager
 * 
 * Multi-tier caching for bootstrap data:
 * 1. IndexedDB (Client) - Instant load
 * 2. Worker KV (Edge) - Fast fetch
 * 3. Origin API (Source of truth)
 * 
 * Usage:
 *   const config = await Fantasy402ConfigCache.get();
 *   if (config) {
 *     renderUI(config.sports);
 *   }
 */

const DB_NAME = 'fantasy402-cache';
const DB_VERSION = 1;
const STORE_NAME = 'appConfig';
const CONFIG_KEY = 'bootstrap';
const WORKER_URL = 'https://betting-brain-v3.nolarose1968-806.workers.dev';

class Fantasy402ConfigCache {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[Config Cache] Failed to open DB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[Config Cache] ✅ DB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                    console.log('[Config Cache] 📦 Object store created');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Get configuration from cache
     * 
     * Flow:
     * 1. Try IndexedDB (instant)
     * 2. If miss, fetch from Worker (fast)
     * 3. Cache in IndexedDB for next time
     * 
     * @returns {Promise<Object|null>} Configuration object or null
     */
    async get() {
        try {
            await this.init();

            // Try IndexedDB first
            const cached = await this.getFromIndexedDB();

            if (cached && this.isValid(cached)) {
                console.log('[Config Cache] ✅ Served from IndexedDB');
                return cached;
            }

            // Cache miss or stale - fetch from Worker
            console.log('[Config Cache] ⚠️  IndexedDB miss, fetching from Worker');
            const fresh = await this.fetchFromWorker();

            if (fresh) {
                // Cache in IndexedDB for next time
                await this.setInIndexedDB(fresh);
                return fresh;
            }

            // Fallback to stale cache if available
            return cached || null;

        } catch (error) {
            console.error('[Config Cache] ❌ Error:', error);
            return null;
        }
    }

    /**
     * Get from IndexedDB
     */
    async getFromIndexedDB() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(CONFIG_KEY);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('[Config Cache] IndexedDB read error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Save to IndexedDB
     */
    async setInIndexedDB(config) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Add timestamp
            const dataToStore = {
                ...config,
                cachedAt: Date.now()
            };

            const request = store.put(dataToStore, CONFIG_KEY);

            request.onsuccess = () => {
                console.log('[Config Cache] ✅ Cached in IndexedDB');
                resolve();
            };

            request.onerror = () => {
                console.error('[Config Cache] IndexedDB write error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Fetch from Worker (which checks KV cache)
     */
    async fetchFromWorker() {
        try {
            const response = await fetch(`${WORKER_URL}/api/fantasy402/config`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Worker fetch failed: ${response.status}`);
            }

            const config = await response.json();
            console.log('[Config Cache] ✅ Fetched from Worker');

            return config;

        } catch (error) {
            console.error('[Config Cache] ❌ Worker fetch error:', error);
            return null;
        }
    }

    /**
     * Check if cached config is still valid
     * 
     * Config is considered valid if:
     * - Cached less than 24 hours ago
     * - Has all required fields
     */
    isValid(config) {
        if (!config) return false;

        // Check age (24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const age = Date.now() - (config.cachedAt || 0);

        if (age > maxAge) {
            console.log('[Config Cache] ⚠️  Cache expired');
            return false;
        }

        // Check required fields
        const required = ['sports', 'wagerTypes', 'teaserTypes', 'bettingRules'];
        const hasAllFields = required.every(field => config[field]);

        if (!hasAllFields) {
            console.log('[Config Cache] ⚠️  Missing required fields');
            return false;
        }

        return true;
    }

    /**
     * Clear cache (force refresh)
     */
    async clear() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(CONFIG_KEY);

            request.onsuccess = () => {
                console.log('[Config Cache] ✅ Cache cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('[Config Cache] Clear error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Refresh cache (fetch and store fresh data)
     */
    async refresh() {
        console.log('[Config Cache] 🔄 Refreshing cache');

        const fresh = await this.fetchFromWorker();

        if (fresh) {
            await this.setInIndexedDB(fresh);
            return fresh;
        }

        return null;
    }
}

// Create singleton instance
const fantasy402ConfigCache = new Fantasy402ConfigCache();

// Make available globally
if (typeof window !== 'undefined') {
    window.fantasy402ConfigCache = fantasy402ConfigCache;
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        // Pre-fetch config in background
        console.log('[Config Cache] 🚀 Pre-fetching configuration');
        await fantasy402ConfigCache.get();
    });
}

console.log('[Config Cache] 📦 Configuration cache manager loaded');

