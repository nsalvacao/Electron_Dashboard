/**
 * OpenAI Provider - Integration with OpenAI API
 * Provides interface to OpenAI's GPT models
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class OpenAIProvider extends AIProvider {
    constructor(options = {}) {
        super(options);
        
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
        this.apiKey = options.apiKey || null;
        this.organization = options.organization || null;
        
        this.availableModels = [
            {
                name: 'gpt-4',
                description: 'Most capable GPT-4 model',
                inputCostPer1K: 0.03,
                outputCostPer1K: 0.06,
                maxTokens: 8192,
                contextWindow: 8192
            },
            {
                name: 'gpt-4-turbo',
                description: 'GPT-4 Turbo with larger context',
                inputCostPer1K: 0.01,
                outputCostPer1K: 0.03,
                maxTokens: 4096,
                contextWindow: 128000
            },
            {
                name: 'gpt-3.5-turbo',
                description: 'Fast and cost-effective',
                inputCostPer1K: 0.001,
                outputCostPer1K: 0.002,
                maxTokens: 4096,
                contextWindow: 16385
            },
            {
                name: 'gpt-3.5-turbo-16k',
                description: 'Extended context version',
                inputCostPer1K: 0.003,
                outputCostPer1K: 0.004,
                maxTokens: 16384,
                contextWindow: 16385
            }
        ];
        
        this.config = {
            enabled: false,
            apiKey: null,
            organization: null,
            defaultModel: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2048,
            timeout: 30000,
            ...options.config
        };
        
        this.rateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000, // Reset every minute
            maxRequests: 60 // Default rate limit
        };
    }
    
    /**
     * Initialize OpenAI provider
     */
    async initialize() {
        try {
            console.log('🤖 Initializing OpenAI provider...');
            
            // Check if API key is configured
            if (this.config.apiKey) {
                this.apiKey = this.config.apiKey;
                
                // Test connection
                const isConnected = await this.testConnection();
                if (isConnected) {
                    this.config.enabled = true;
                    console.log('✅ OpenAI provider initialized and connected');
                } else {
                    console.log('⚠️ OpenAI provider initialized but connection failed');
                }
            } else {
                console.log('ℹ️ OpenAI provider initialized but no API key configured');
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize OpenAI provider:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Configure OpenAI provider
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
        
        // Update organization
        if (config.organization) {
            this.organization = config.organization;
        }
        
        // Test connection with new config
        if (this.apiKey) {
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Failed to connect with new configuration');
            }
            this.config.enabled = true;
        }
        
        console.log('✅ OpenAI provider configured successfully');
    }
    
    /**
     * Test connection to OpenAI
     */
    async testConnection() {
        if (!this.apiKey) {
            return false;
        }
        
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(this.organization && { 'OpenAI-Organization': this.organization })
                },
                timeout: 10000
            });
            
            return response.status === 200;
            
        } catch (error) {
            console.warn('⚠️ OpenAI connection test failed:', error.message);
            return false;
        }
    }
    
    /**
     * Generate AI suggestion using OpenAI
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized || !this.config.enabled || !this.apiKey) {
            throw new Error('OpenAI provider not initialized or configured');
        }
        
        // Check rate limits
        await this.checkRateLimit();
        
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        const maxTokens = options.maxTokens || this.config.maxTokens;
        
        try {
            const startTime = Date.now();
            this.requestCount++;
            
            console.log(`🤖 Generating suggestion with OpenAI model: ${model}`);
            
            const response = await axios.post(`${this.baseUrl}/chat/completions`, {
                model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature,
                max_tokens: maxTokens,
                stop: options.stop || null
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(this.organization && { 'OpenAI-Organization': this.organization })
                },
                timeout: this.config.timeout
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const choice = response.data.choices[0];
                const usage = response.data.usage;
                
                // Calculate cost
                const cost = this.calculateCost(usage, model);
                this.totalCost += cost;
                
                const result = {
                    suggestion: choice.message.content,
                    model,
                    provider: 'openai',
                    tokens: usage.total_tokens,
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    duration,
                    cost,
                    timestamp: Date.now()
                };
                
                console.log(`✅ OpenAI suggestion generated in ${duration}ms (${usage.total_tokens} tokens, $${cost.toFixed(4)})`);
                return result;
            }
            
            throw new Error('Invalid response from OpenAI');
            
        } catch (error) {
            console.error('❌ OpenAI suggestion generation failed:', error.message);
            
            // Handle specific OpenAI errors
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
        if (!this.apiKey) {
            return this.availableModels;
        }
        
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(this.organization && { 'OpenAI-Organization': this.organization })
                },
                timeout: 10000
            });
            
            if (response.data && response.data.data) {
                const apiModels = response.data.data
                    .filter(model => model.id.includes('gpt'))
                    .map(model => ({
                        name: model.id,
                        description: `OpenAI ${model.id}`,
                        owned_by: model.owned_by,
                        created: model.created
                    }));
                
                // Merge with static model info
                return apiModels.map(apiModel => {
                    const staticModel = this.availableModels.find(m => m.name === apiModel.name);
                    return {
                        ...apiModel,
                        ...staticModel
                    };
                });
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to fetch OpenAI models:', error.message);
        }
        
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
        
        const inputCost = (usage.prompt_tokens / 1000) * modelInfo.inputCostPer1K;
        const outputCost = (usage.completion_tokens / 1000) * modelInfo.outputCostPer1K;
        
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
            name: 'OpenAI',
            type: 'external',
            description: 'OpenAI GPT models (GPT-3.5, GPT-4)',
            website: 'https://openai.com',
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
        
        if (config.organization && typeof config.organization !== 'string') {
            errors.push('organization must be a string');
        }
        
        if (config.temperature && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
            errors.push('temperature must be a number between 0 and 2');
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
        console.log(`⏳ OpenAI rate limit hit, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

module.exports = OpenAIProvider;