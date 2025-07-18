/**
 * Anthropic Provider - Integration with Anthropic Claude API
 * Provides interface to Claude models
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class AnthropicProvider extends AIProvider {
    constructor(options = {}) {
        super(options);
        
        this.baseUrl = options.baseUrl || 'https://api.anthropic.com/v1';
        this.apiKey = options.apiKey || null;
        this.version = options.version || '2023-06-01';
        
        this.availableModels = [
            {
                name: 'claude-3-5-sonnet-20241022',
                description: 'Most intelligent Claude model',
                inputCostPer1K: 0.003,
                outputCostPer1K: 0.015,
                maxTokens: 4096,
                contextWindow: 200000
            },
            {
                name: 'claude-3-haiku-20240307',
                description: 'Fast and cost-effective',
                inputCostPer1K: 0.00025,
                outputCostPer1K: 0.00125,
                maxTokens: 4096,
                contextWindow: 200000
            },
            {
                name: 'claude-3-sonnet-20240229',
                description: 'Balanced performance and cost',
                inputCostPer1K: 0.003,
                outputCostPer1K: 0.015,
                maxTokens: 4096,
                contextWindow: 200000
            },
            {
                name: 'claude-3-opus-20240229',
                description: 'Most capable Claude model',
                inputCostPer1K: 0.015,
                outputCostPer1K: 0.075,
                maxTokens: 4096,
                contextWindow: 200000
            }
        ];
        
        this.config = {
            enabled: false,
            apiKey: null,
            defaultModel: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            maxTokens: 2048,
            timeout: 30000,
            ...options.config
        };
        
        this.rateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000,
            maxRequests: 50 // Conservative rate limit
        };
    }
    
    /**
     * Initialize Anthropic provider
     */
    async initialize() {
        try {
            console.log('🔮 Initializing Anthropic provider...');
            
            // Check if API key is configured
            if (this.config.apiKey) {
                this.apiKey = this.config.apiKey;
                
                // Test connection
                const isConnected = await this.testConnection();
                if (isConnected) {
                    this.config.enabled = true;
                    console.log('✅ Anthropic provider initialized and connected');
                } else {
                    console.log('⚠️ Anthropic provider initialized but connection failed');
                }
            } else {
                console.log('ℹ️ Anthropic provider initialized but no API key configured');
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Anthropic provider:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Configure Anthropic provider
     */
    async configure(config) {
        const validation = this.validateConfig(config);
        if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
        
        this.config = { ...this.config, ...config };
        
        // Update API key
        if (config.apiKey) {
            this.apiKey = config.apiKey;
        }
        
        // Test connection with new config
        if (this.apiKey) {
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Failed to connect with new configuration');
            }
            this.config.enabled = true;
        }
        
        console.log('✅ Anthropic provider configured successfully');
    }
    
    /**
     * Test connection to Anthropic
     */
    async testConnection() {
        if (!this.apiKey) {
            return false;
        }
        
        try {
            // Test with a simple message
            const response = await axios.post(`${this.baseUrl}/messages`, {
                model: 'claude-3-haiku-20240307',
                max_tokens: 10,
                messages: [
                    {
                        role: 'user',
                        content: 'Hello'
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': this.version
                },
                timeout: 10000
            });
            
            return response.status === 200;
            
        } catch (error) {
            console.warn('⚠️ Anthropic connection test failed:', error.message);
            return false;
        }
    }
    
    /**
     * Generate AI suggestion using Anthropic Claude
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized || !this.config.enabled || !this.apiKey) {
            throw new Error('Anthropic provider not initialized or configured');
        }
        
        // Check rate limits
        await this.checkRateLimit();
        
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        const maxTokens = options.maxTokens || this.config.maxTokens;
        
        try {
            const startTime = Date.now();
            this.requestCount++;
            
            console.log(`🔮 Generating suggestion with Anthropic model: ${model}`);
            
            const response = await axios.post(`${this.baseUrl}/messages`, {
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                stop_sequences: options.stop || null
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': this.version
                },
                timeout: this.config.timeout
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (response.data && response.data.content && response.data.content.length > 0) {
                const content = response.data.content[0];
                const usage = response.data.usage;
                
                // Calculate cost
                const cost = this.calculateCost(usage, model);
                this.totalCost += cost;
                
                const result = {
                    suggestion: content.text,
                    model,
                    provider: 'anthropic',
                    tokens: usage.output_tokens + usage.input_tokens,
                    promptTokens: usage.input_tokens,
                    completionTokens: usage.output_tokens,
                    duration,
                    cost,
                    timestamp: Date.now()
                };
                
                console.log(`✅ Anthropic suggestion generated in ${duration}ms (${result.tokens} tokens, $${cost.toFixed(4)})`);
                return result;
            }
            
            throw new Error('Invalid response from Anthropic');
            
        } catch (error) {
            console.error('❌ Anthropic suggestion generation failed:', error.message);
            
            // Handle specific Anthropic errors
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 401) {
                    throw new Error('Invalid API key');
                } else if (status === 429) {
                    throw new Error('Rate limit exceeded');
                } else if (status === 400) {
                    throw new Error(`Bad request: ${data.error?.message || 'Unknown error'}`);
                }
            }
            
            this.handleError(error);
        }
    }
    
    /**
     * Get available models
     */
    async getAvailableModels() {
        return this.availableModels;
    }
    
    /**
     * Calculate cost for a request
     */
    calculateCost(usage, model) {
        const modelInfo = this.availableModels.find(m => m.name === model);
        if (!modelInfo) {
            return 0;
        }
        
        const inputCost = (usage.input_tokens / 1000) * modelInfo.inputCostPer1K;
        const outputCost = (usage.output_tokens / 1000) * modelInfo.outputCostPer1K;
        
        return inputCost + outputCost;
    }
    
    /**
     * Check rate limits
     */
    async checkRateLimit() {
        const now = Date.now();
        
        // Reset counter if time window has passed
        if (now > this.rateLimiter.resetTime) {
            this.rateLimiter.requests = 0;
            this.rateLimiter.resetTime = now + 60000;
        }
        
        // Check if we've exceeded rate limit
        if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
            const waitTime = this.rateLimiter.resetTime - now;
            console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Reset after waiting
            this.rateLimiter.requests = 0;
            this.rateLimiter.resetTime = Date.now() + 60000;
        }
        
        this.rateLimiter.requests++;
    }
    
    /**
     * Get provider information
     */
    getProviderInfo() {
        return {
            name: 'Anthropic',
            type: 'external',
            description: 'Anthropic Claude models (Claude 3, Claude 3.5)',
            website: 'https://anthropic.com',
            supportsCustomModels: false,
            requiresApiKey: true,
            isConfigured: !!this.apiKey,
            isEnabled: this.config.enabled,
            availableModels: this.availableModels.length,
            baseUrl: this.baseUrl
        };
    }
    
    /**
     * Validate configuration
     */
    validateConfig(config) {
        const errors = [];
        
        if (config.apiKey && typeof config.apiKey !== 'string') {
            errors.push('apiKey must be a string');
        }
        
        if (config.temperature && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1)) {
            errors.push('temperature must be a number between 0 and 1');
        }
        
        if (config.maxTokens && (typeof config.maxTokens !== 'number' || config.maxTokens < 1)) {
            errors.push('maxTokens must be a positive number');
        }
        
        if (config.defaultModel && typeof config.defaultModel !== 'string') {
            errors.push('defaultModel must be a string');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Handle rate limiting
     */
    async handleRateLimit() {
        const waitTime = 60000; // Wait 1 minute
        console.log(`⏳ Anthropic rate limit hit, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

module.exports = AnthropicProvider;