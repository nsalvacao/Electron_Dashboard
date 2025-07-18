/**
 * Hugging Face Provider - Integration with Hugging Face Inference API
 * Provides access to open source models through Hugging Face
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class HuggingFaceProvider extends AIProvider {
    constructor(options = {}) {
        super(options);
        
        this.baseUrl = options.baseUrl || 'https://api-inference.huggingface.co/models';
        this.apiKey = options.apiKey || null;
        
        this.availableModels = [
            {
                name: 'microsoft/DialoGPT-large',
                description: 'Large-scale conversational model',
                inputCostPer1K: 0, // Free tier
                outputCostPer1K: 0,
                maxTokens: 1024,
                contextWindow: 1024,
                type: 'conversational'
            },
            {
                name: 'EleutherAI/gpt-neo-2.7B',
                description: 'GPT-Neo 2.7B parameter model',
                inputCostPer1K: 0,
                outputCostPer1K: 0,
                maxTokens: 2048,
                contextWindow: 2048,
                type: 'text-generation'
            },
            {
                name: 'facebook/blenderbot-400M-distill',
                description: 'Conversational AI model',
                inputCostPer1K: 0,
                outputCostPer1K: 0,
                maxTokens: 128,
                contextWindow: 128,
                type: 'conversational'
            },
            {
                name: 'microsoft/DialoGPT-medium',
                description: 'Medium-scale conversational model',
                inputCostPer1K: 0,
                outputCostPer1K: 0,
                maxTokens: 1024,
                contextWindow: 1024,
                type: 'conversational'
            },
            {
                name: 'distilbert-base-uncased-finetuned-sst-2-english',
                description: 'Sentiment analysis model',
                inputCostPer1K: 0,
                outputCostPer1K: 0,
                maxTokens: 512,
                contextWindow: 512,
                type: 'classification'
            }
        ];
        
        this.config = {
            enabled: false,
            apiKey: null,
            defaultModel: 'microsoft/DialoGPT-large',
            temperature: 0.7,
            maxTokens: 1024,
            timeout: 30000,
            waitForModel: true,
            ...options.config
        };
        
        this.rateLimiter = {
            requests: 0,
            resetTime: Date.now() + 60000,
            maxRequests: 30 // Conservative for free tier
        };
    }
    
    /**
     * Initialize Hugging Face provider
     */
    async initialize() {
        try {
            console.log('🤗 Initializing Hugging Face provider...');
            
            // Check if API key is configured
            if (this.config.apiKey) {
                this.apiKey = this.config.apiKey;
                
                // Test connection
                const isConnected = await this.testConnection();
                if (isConnected) {
                    this.config.enabled = true;
                    console.log('✅ Hugging Face provider initialized and connected');
                } else {
                    console.log('⚠️ Hugging Face provider initialized but connection failed');
                }
            } else {
                console.log('ℹ️ Hugging Face provider initialized but no API key configured');
                // Hugging Face has a free tier, so we can still try to use it
                this.config.enabled = true;
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Hugging Face provider:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Configure Hugging Face provider
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
        const isConnected = await this.testConnection();
        if (!isConnected) {
            console.warn('⚠️ Connection test failed, but continuing with configuration');
        }
        
        this.config.enabled = true;
        console.log('✅ Hugging Face provider configured successfully');
    }
    
    /**
     * Test connection to Hugging Face
     */
    async testConnection() {
        try {
            const testModel = 'microsoft/DialoGPT-medium';
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            
            const response = await axios.post(`${this.baseUrl}/${testModel}`, {
                inputs: 'Hello',
                parameters: {
                    max_length: 10,
                    temperature: 0.7
                },
                options: {
                    wait_for_model: true,
                    use_cache: true
                }
            }, {
                headers,
                timeout: 10000
            });
            
            return response.status === 200;
            
        } catch (error) {
            console.warn('⚠️ Hugging Face connection test failed:', error.message);
            return false;
        }
    }
    
    /**
     * Generate AI suggestion using Hugging Face
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized || !this.config.enabled) {
            throw new Error('Hugging Face provider not initialized or enabled');
        }
        
        // Check rate limits
        await this.checkRateLimit();
        
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        const maxTokens = options.maxTokens || this.config.maxTokens;
        
        try {
            const startTime = Date.now();
            this.requestCount++;
            
            console.log(`🤗 Generating suggestion with Hugging Face model: ${model}`);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            
            const requestData = {
                inputs: prompt,
                parameters: {
                    max_length: maxTokens,
                    temperature: temperature,
                    return_full_text: false
                },
                options: {
                    wait_for_model: this.config.waitForModel,
                    use_cache: true
                }
            };
            
            const response = await axios.post(`${this.baseUrl}/${model}`, requestData, {
                headers,
                timeout: this.config.timeout
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (response.data) {
                let suggestion = '';
                
                // Handle different response formats
                if (Array.isArray(response.data)) {
                    if (response.data.length > 0) {
                        const firstResult = response.data[0];
                        if (firstResult.generated_text) {
                            suggestion = firstResult.generated_text;
                        } else if (firstResult.translation_text) {
                            suggestion = firstResult.translation_text;
                        } else if (firstResult.summary_text) {
                            suggestion = firstResult.summary_text;
                        } else {
                            suggestion = JSON.stringify(firstResult);
                        }
                    }
                } else if (response.data.generated_text) {
                    suggestion = response.data.generated_text;
                } else {
                    suggestion = JSON.stringify(response.data);
                }
                
                // Estimate tokens (rough approximation)
                const tokens = Math.ceil(suggestion.length / 4);
                
                const result = {
                    suggestion: suggestion,
                    model,
                    provider: 'huggingface',
                    tokens,
                    promptTokens: Math.ceil(prompt.length / 4),
                    completionTokens: tokens,
                    duration,
                    cost: 0, // Hugging Face free tier
                    timestamp: Date.now()
                };
                
                console.log(`✅ Hugging Face suggestion generated in ${duration}ms (~${tokens} tokens)`);
                return result;
            }
            
            throw new Error('Invalid response from Hugging Face');
            
        } catch (error) {
            console.error('❌ Hugging Face suggestion generation failed:', error.message);
            
            // Handle specific Hugging Face errors
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 401) {
                    throw new Error('Invalid API key');
                } else if (status === 429) {
                    throw new Error('Rate limit exceeded');
                } else if (status === 503) {
                    throw new Error('Model is currently loading, please try again later');
                } else if (status === 400) {
                    throw new Error(`Bad request: ${data.error || 'Unknown error'}`);
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
     * Search for models on Hugging Face Hub
     */
    async searchModels(query, limit = 10) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            
            const response = await axios.get(`https://huggingface.co/api/models`, {
                params: {
                    search: query,
                    limit,
                    filter: 'text-generation'
                },
                headers,
                timeout: 10000
            });
            
            if (response.data && Array.isArray(response.data)) {
                return response.data.map(model => ({
                    name: model.modelId,
                    description: model.description || `${model.modelId} from Hugging Face`,
                    downloads: model.downloads || 0,
                    likes: model.likes || 0,
                    tags: model.tags || []
                }));
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to search Hugging Face models:', error.message);
        }
        
        return [];
    }
    
    /**
     * Calculate cost for a request
     */
    calculateCost(usage, model) {
        return 0; // Hugging Face free tier
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
            name: 'Hugging Face',
            type: 'external',
            description: 'Open source AI models via Hugging Face',
            website: 'https://huggingface.co',
            supportsCustomModels: true,
            requiresApiKey: false,
            isConfigured: true,
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
        console.log(`⏳ Hugging Face rate limit hit, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

module.exports = HuggingFaceProvider;