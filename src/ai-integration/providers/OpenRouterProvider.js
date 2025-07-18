/**
 * OpenRouter Provider - Integration with OpenRouter API
 * Provides access to multiple AI models through OpenRouter
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class OpenRouterProvider extends AIProvider {
    constructor(options = {}) {
        super(options);
        
        this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
        this.apiKey = options.apiKey || null;
        this.appName = options.appName || 'Nexo Dashboard';
        this.appUrl = options.appUrl || 'https://github.com/nsalvacao/Nexo_Dashboard';
        
        this.availableModels = [
            {
                name: 'anthropic/claude-3.5-sonnet',
                description: 'Claude 3.5 Sonnet via OpenRouter',
                inputCostPer1K: 0.003,
                outputCostPer1K: 0.015,
                maxTokens: 4096,
                contextWindow: 200000
            },
            {
                name: 'anthropic/claude-3-haiku',
                description: 'Claude 3 Haiku via OpenRouter',
                inputCostPer1K: 0.00025,
                outputCostPer1K: 0.00125,
                maxTokens: 4096,
                contextWindow: 200000
            },
            {
                name: 'openai/gpt-4-turbo',
                description: 'GPT-4 Turbo via OpenRouter',
                inputCostPer1K: 0.01,
                outputCostPer1K: 0.03,
                maxTokens: 4096,
                contextWindow: 128000
            },
            {
                name: 'openai/gpt-3.5-turbo',
                description: 'GPT-3.5 Turbo via OpenRouter',
                inputCostPer1K: 0.001,
                outputCostPer1K: 0.002,
                maxTokens: 4096,
                contextWindow: 16385
            },
            {
                name: 'meta-llama/llama-3-70b-instruct',
                description: 'Llama 3 70B Instruct',
                inputCostPer1K: 0.0009,
                outputCostPer1K: 0.0009,
                maxTokens: 4096,
                contextWindow: 8192
            },
            {
                name: 'mistralai/mistral-7b-instruct',
                description: 'Mistral 7B Instruct',
                inputCostPer1K: 0.0002,
                outputCostPer1K: 0.0002,
                maxTokens: 4096,
                contextWindow: 8192
            }
        ];
        
        this.config = {
            enabled: false,
            apiKey: null,
            defaultModel: 'anthropic/claude-3-haiku',
            temperature: 0.7,
            maxTokens: 2048,
            timeout: 30000,
            ...options.config
        };
        
        this.rateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000,
            maxRequests: 100 // OpenRouter has generous limits
        };
    }
    
    /**
     * Initialize OpenRouter provider
     */
    async initialize() {
        try {
            console.log('🚀 Initializing OpenRouter provider...');
            
            // Check if API key is configured
            if (this.config.apiKey) {
                this.apiKey = this.config.apiKey;
                
                // Test connection
                const isConnected = await this.testConnection();
                if (isConnected) {
                    this.config.enabled = true;
                    console.log('✅ OpenRouter provider initialized and connected');
                } else {
                    console.log('⚠️ OpenRouter provider initialized but connection failed');
                }
            } else {
                console.log('ℹ️ OpenRouter provider initialized but no API key configured');
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize OpenRouter provider:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Configure OpenRouter provider
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
        
        console.log('✅ OpenRouter provider configured successfully');
    }
    
    /**
     * Test connection to OpenRouter
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
                    'HTTP-Referer': this.appUrl,
                    'X-Title': this.appName
                },
                timeout: 10000
            });
            
            return response.status === 200;
            
        } catch (error) {
            console.warn('⚠️ OpenRouter connection test failed:', error.message);
            return false;
        }
    }
    
    /**
     * Generate AI suggestion using OpenRouter
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized || !this.config.enabled || !this.apiKey) {
            throw new Error('OpenRouter provider not initialized or configured');
        }
        
        // Check rate limits
        await this.checkRateLimit();
        
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        const maxTokens = options.maxTokens || this.config.maxTokens;
        
        try {
            const startTime = Date.now();
            this.requestCount++;
            
            console.log(`🚀 Generating suggestion with OpenRouter model: ${model}`);
            
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
                    'HTTP-Referer': this.appUrl,
                    'X-Title': this.appName
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
                    provider: 'openrouter',
                    tokens: usage.total_tokens,
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    duration,
                    cost,
                    timestamp: Date.now()
                };
                
                console.log(`✅ OpenRouter suggestion generated in ${duration}ms (${usage.total_tokens} tokens, $${cost.toFixed(4)})`);
                return result;
            }
            
            throw new Error('Invalid response from OpenRouter');
            
        } catch (error) {
            console.error('❌ OpenRouter suggestion generation failed:', error.message);
            
            // Handle specific OpenRouter errors
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 401) {
                    throw new Error('Invalid API key');
                } else if (status === 429) {
                    throw new Error('Rate limit exceeded');
                } else if (status === 400) {
                    throw new Error(`Bad request: ${data.error?.message || 'Unknown error'}`);
                } else if (status === 402) {
                    throw new Error('Insufficient credits');
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
                    'HTTP-Referer': this.appUrl,
                    'X-Title': this.appName
                },
                timeout: 10000
            });
            
            if (response.data && response.data.data) {
                const apiModels = response.data.data.map(model => ({
                    name: model.id,
                    description: model.description || `${model.id} via OpenRouter`,
                    inputCostPer1K: model.pricing?.prompt || 0,
                    outputCostPer1K: model.pricing?.completion || 0,
                    maxTokens: model.top_provider?.max_completion_tokens || 4096,
                    contextWindow: model.context_length || 8192
                }));
                
                return apiModels;
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to fetch OpenRouter models:', error.message);
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
            name: 'OpenRouter',
            type: 'external',
            description: 'Access to multiple AI models through OpenRouter',
            website: 'https://openrouter.ai',
            supportsCustomModels: true,
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
        console.log(`⏳ OpenRouter rate limit hit, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

module.exports = OpenRouterProvider;