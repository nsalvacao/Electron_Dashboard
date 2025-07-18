/**
 * Fallback Manager - Handle provider failures and automatic fallback
 */

const EventEmitter = require('events');

class FallbackManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.isInitialized = false;
        this.fallbackChain = [];
        this.failureCount = new Map();
    }
    
    async initialize() {
        this.isInitialized = true;
        console.log('✅ Fallback Manager initialized');
    }
    
    async executeWithFallback(operation, providers) {
        for (const provider of providers) {
            try {
                return await operation(provider);
            } catch (error) {
                console.warn(`⚠️ Provider ${provider} failed, trying next...`);
                continue;
            }
        }
        throw new Error('All providers failed');
    }
    
    async cleanup() {
        this.isInitialized = false;
    }
}

module.exports = FallbackManager;