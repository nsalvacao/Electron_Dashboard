/**
 * Abstract AI Provider Base Class
 * Defines the interface that all AI providers must implement
 */

class AIProvider {
    constructor(options = {}) {
        this.options = options;
        this.isInitialized = false;
        this.config = {};
        this.rateLimiter = null;
        this.costCalculator = null;
        this.lastError = null;
        this.requestCount = 0;
        this.totalCost = 0;
    }
    
    /**
     * Initialize the provider
     * Must be implemented by subclasses
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclasses');
    }
    
    /**
     * Configure the provider with user settings
     * Must be implemented by subclasses
     */
    async configure(config) {
        throw new Error('configure() must be implemented by subclasses');
    }
    
    /**
     * Test connection to the provider
     * Must be implemented by subclasses
     */
    async testConnection() {
        throw new Error('testConnection() must be implemented by subclasses');
    }
    
    /**
     * Generate AI suggestion
     * Must be implemented by subclasses
     */
    async generateSuggestion(prompt, options = {}) {
        throw new Error('generateSuggestion() must be implemented by subclasses');
    }
    
    /**
     * Get available models
     * Must be implemented by subclasses
     */
    async getAvailableModels() {
        throw new Error('getAvailableModels() must be implemented by subclasses');
    }
    
    /**
     * Get provider information
     * Must be implemented by subclasses
     */
    getProviderInfo() {
        throw new Error('getProviderInfo() must be implemented by subclasses');
    }
    
    /**
     * Calculate cost for a request
     * Can be overridden by subclasses
     */
    calculateCost(tokens, model) {
        return 0; // Default implementation for free providers
    }
    
    /**
     * Get usage statistics
     */
    getUsageStats() {
        return {
            requestCount: this.requestCount,
            totalCost: this.totalCost,
            lastError: this.lastError,
            isInitialized: this.isInitialized,
            config: this.config
        };
    }
    
    /**
     * Reset usage statistics
     */
    resetUsageStats() {
        this.requestCount = 0;
        this.totalCost = 0;
        this.lastError = null;
    }
    
    /**
     * Validate configuration
     * Can be overridden by subclasses
     */
    validateConfig(config) {
        return { valid: true, errors: [] };
    }
    
    /**
     * Handle rate limiting
     * Can be overridden by subclasses
     */
    async handleRateLimit() {
        // Default implementation - wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    /**
     * Handle errors
     * Can be overridden by subclasses
     */
    handleError(error) {
        this.lastError = {
            message: error.message,
            timestamp: Date.now(),
            stack: error.stack
        };
        
        console.error(`❌ ${this.getProviderInfo().name} error:`, error);
        throw error;
    }
    
    /**
     * Cleanup resources
     * Can be overridden by subclasses
     */
    async cleanup() {
        this.isInitialized = false;
    }
}

module.exports = AIProvider;