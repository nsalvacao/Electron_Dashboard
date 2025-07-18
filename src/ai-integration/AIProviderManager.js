/**
 * AI Provider Manager - Central coordination system for AI providers
 * Manages multiple AI providers with fallback, cost tracking, and unified interface
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

// Import providers
const OllamaProvider = require('./providers/OllamaProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');
const OpenRouterProvider = require('./providers/OpenRouterProvider');
const HuggingFaceProvider = require('./providers/HuggingFaceProvider');

// Import utilities
const CostTracker = require('./utils/CostTracker');
const UsageMonitor = require('./utils/UsageMonitor');
const FallbackManager = require('./utils/FallbackManager');
const PrivacyManager = require('./utils/PrivacyManager');
const AIConfiguration = require('./utils/AIConfiguration');

class AIProviderManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            dataPath: options.dataPath || path.join(__dirname, '../../data/ai-config'),
            enableFallback: options.enableFallback !== false,
            enableCostTracking: options.enableCostTracking !== false,
            enablePrivacyFiltering: options.enablePrivacyFiltering !== false,
            ...options
        };
        
        // Core components
        this.providers = new Map();
        this.activeProvider = null;
        this.fallbackChain = [];
        this.isInitialized = false;
        
        // Utility components
        this.costTracker = new CostTracker();
        this.usageMonitor = new UsageMonitor();
        this.fallbackManager = new FallbackManager();
        this.privacyManager = new PrivacyManager();
        this.configuration = new AIConfiguration(this.options.dataPath);
        
        // State
        this.operationQueue = [];
        this.isProcessing = false;
        this.healthStatus = new Map();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Initialize the AI Provider Manager
     */
    async initialize() {
        try {
            console.log('🤖 Initializing AI Provider Manager...');
            
            // Ensure data directory exists
            await fs.mkdir(this.options.dataPath, { recursive: true });
            
            // Initialize configuration
            await this.configuration.initialize();
            
            // Initialize utility components
            await this.costTracker.initialize();
            await this.usageMonitor.initialize();
            await this.privacyManager.initialize();
            
            // Initialize providers
            await this.initializeProviders();
            
            // Load configuration
            await this.loadConfiguration();
            
            // Setup fallback chain
            await this.setupFallbackChain();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('✅ AI Provider Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize AI Provider Manager:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Initialize all AI providers
     */
    async initializeProviders() {
        const providersToInit = [
            { name: 'ollama', class: OllamaProvider, priority: 1 },
            { name: 'openai', class: OpenAIProvider, priority: 2 },
            { name: 'anthropic', class: AnthropicProvider, priority: 3 },
            { name: 'openrouter', class: OpenRouterProvider, priority: 4 },
            { name: 'huggingface', class: HuggingFaceProvider, priority: 5 }
        ];
        
        for (const { name, class: ProviderClass, priority } of providersToInit) {
            try {
                console.log(`🔧 Initializing ${name} provider...`);
                
                const provider = new ProviderClass({
                    dataPath: this.options.dataPath,
                    costTracker: this.costTracker,
                    usageMonitor: this.usageMonitor
                });
                
                await provider.initialize();
                
                this.providers.set(name, {
                    instance: provider,
                    priority,
                    isAvailable: false,
                    lastHealthCheck: null,
                    config: {}
                });
                
                console.log(`✅ ${name} provider initialized`);
                
            } catch (error) {
                console.warn(`⚠️ Failed to initialize ${name} provider:`, error.message);
                this.providers.set(name, {
                    instance: null,
                    priority,
                    isAvailable: false,
                    lastHealthCheck: null,
                    config: {},
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Load configuration from storage
     */
    async loadConfiguration() {
        try {
            const config = await this.configuration.loadConfiguration();
            
            // Apply configuration to providers
            for (const [providerName, providerConfig] of Object.entries(config.providers || {})) {
                const provider = this.providers.get(providerName);
                if (provider && provider.instance) {
                    await provider.instance.configure(providerConfig);
                    provider.config = providerConfig;
                    provider.isAvailable = providerConfig.enabled && await this.testProviderHealth(providerName);
                }
            }
            
            // Set active provider
            if (config.activeProvider && this.providers.has(config.activeProvider)) {
                this.activeProvider = config.activeProvider;
            }
            
            // Set fallback chain
            if (config.fallbackChain && Array.isArray(config.fallbackChain)) {
                this.fallbackChain = config.fallbackChain.filter(name => this.providers.has(name));
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to load AI configuration:', error.message);
        }
    }
    
    /**
     * Setup fallback chain based on priority and availability
     */
    async setupFallbackChain() {
        const availableProviders = Array.from(this.providers.entries())
            .filter(([name, provider]) => provider.isAvailable)
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([name]) => name);
        
        this.fallbackChain = availableProviders;
        
        // Set primary provider if not already set
        if (!this.activeProvider && availableProviders.length > 0) {
            this.activeProvider = availableProviders[0];
        }
        
        console.log('🔄 Fallback chain setup:', this.fallbackChain);
    }
    
    /**
     * Test provider health
     */
    async testProviderHealth(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider || !provider.instance) {
            return false;
        }
        
        try {
            const isHealthy = await provider.instance.testConnection();
            provider.lastHealthCheck = Date.now();
            this.healthStatus.set(providerName, isHealthy);
            return isHealthy;
        } catch (error) {
            console.warn(`⚠️ Health check failed for ${providerName}:`, error.message);
            this.healthStatus.set(providerName, false);
            return false;
        }
    }
    
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        setInterval(async () => {
            for (const providerName of this.providers.keys()) {
                await this.testProviderHealth(providerName);
            }
            this.emit('health-check-completed', this.healthStatus);
        }, 30000); // Check every 30 seconds
    }
    
    /**
     * Generate AI suggestion using the best available provider
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('AI Provider Manager not initialized');
        }
        
        const operation = {
            type: 'generate_suggestion',
            prompt,
            options,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        try {
            // Apply privacy filtering if enabled
            if (this.options.enablePrivacyFiltering) {
                const filteredData = await this.privacyManager.filterData(prompt, options);
                operation.prompt = filteredData.prompt;
                operation.options = filteredData.options;
            }
            
            // Execute with fallback
            const result = await this.executeWithFallback(operation);
            
            // Track usage and cost
            if (this.options.enableCostTracking) {
                await this.costTracker.trackUsage(
                    result.provider,
                    operation.type,
                    result.cost || 0,
                    result.tokens || 0
                );
            }
            
            this.emit('operation-completed', {
                operation,
                result,
                provider: result.provider
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ AI suggestion generation failed:', error);
            this.emit('operation-failed', { operation, error });
            throw error;
        }
    }
    
    /**
     * Execute operation with fallback support
     */
    async executeWithFallback(operation) {
        const providersToTry = this.activeProvider ? 
            [this.activeProvider, ...this.fallbackChain.filter(p => p !== this.activeProvider)] :
            this.fallbackChain;
        
        for (const providerName of providersToTry) {
            const provider = this.providers.get(providerName);
            
            if (!provider || !provider.instance || !provider.isAvailable) {
                continue;
            }
            
            try {
                console.log(`🔄 Attempting operation with ${providerName}`);
                
                const result = await provider.instance.generateSuggestion(
                    operation.prompt,
                    operation.options
                );
                
                return {
                    ...result,
                    provider: providerName,
                    operationId: operation.id
                };
                
            } catch (error) {
                console.warn(`⚠️ Operation failed with ${providerName}:`, error.message);
                
                // Mark provider as temporarily unavailable
                provider.isAvailable = false;
                
                // Continue to next provider in fallback chain
                continue;
            }
        }
        
        throw new Error('All AI providers failed or unavailable');
    }
    
    /**
     * Get available providers
     */
    getAvailableProviders() {
        return Array.from(this.providers.entries())
            .filter(([name, provider]) => provider.isAvailable)
            .map(([name, provider]) => ({
                name,
                priority: provider.priority,
                lastHealthCheck: provider.lastHealthCheck,
                config: provider.config
            }));
    }
    
    /**
     * Get provider status
     */
    getProviderStatus(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            return null;
        }
        
        return {
            name: providerName,
            isAvailable: provider.isAvailable,
            priority: provider.priority,
            lastHealthCheck: provider.lastHealthCheck,
            health: this.healthStatus.get(providerName),
            config: provider.config,
            error: provider.error
        };
    }
    
    /**
     * Get system statistics
     */
    async getStats() {
        const stats = {
            initialized: this.isInitialized,
            activeProvider: this.activeProvider,
            fallbackChain: this.fallbackChain,
            availableProviders: this.getAvailableProviders().length,
            totalProviders: this.providers.size,
            usage: await this.usageMonitor.getStats(),
            costs: await this.costTracker.getStats(),
            health: Object.fromEntries(this.healthStatus)
        };
        
        return stats;
    }
    
    /**
     * Configure a provider
     */
    async configureProvider(providerName, config) {
        const provider = this.providers.get(providerName);
        if (!provider || !provider.instance) {
            throw new Error(`Provider ${providerName} not found`);
        }
        
        try {
            await provider.instance.configure(config);
            provider.config = config;
            provider.isAvailable = config.enabled && await this.testProviderHealth(providerName);
            
            // Save configuration
            await this.configuration.saveProviderConfig(providerName, config);
            
            // Update fallback chain
            await this.setupFallbackChain();
            
            this.emit('provider-configured', { providerName, config });
            
        } catch (error) {
            console.error(`❌ Failed to configure ${providerName}:`, error);
            throw error;
        }
    }
    
    /**
     * Set active provider
     */
    async setActiveProvider(providerName) {
        if (!this.providers.has(providerName)) {
            throw new Error(`Provider ${providerName} not found`);
        }
        
        const provider = this.providers.get(providerName);
        if (!provider.isAvailable) {
            throw new Error(`Provider ${providerName} is not available`);
        }
        
        this.activeProvider = providerName;
        await this.configuration.saveActiveProvider(providerName);
        
        this.emit('active-provider-changed', providerName);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.on('provider-failed', (providerName) => {
            const provider = this.providers.get(providerName);
            if (provider) {
                provider.isAvailable = false;
            }
        });
        
        this.on('cost-limit-reached', (data) => {
            console.warn('⚠️ Cost limit reached:', data);
            // Implement cost limit handling
        });
        
        this.on('usage-threshold-exceeded', (data) => {
            console.warn('⚠️ Usage threshold exceeded:', data);
            // Implement usage threshold handling
        });
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up AI Provider Manager...');
        
        // Stop health monitoring
        this.removeAllListeners();
        
        // Cleanup providers
        for (const [name, provider] of this.providers.entries()) {
            if (provider.instance && typeof provider.instance.cleanup === 'function') {
                await provider.instance.cleanup();
            }
        }
        
        // Cleanup utility components
        await this.costTracker.cleanup();
        await this.usageMonitor.cleanup();
        await this.privacyManager.cleanup();
        
        this.isInitialized = false;
    }
}

module.exports = AIProviderManager;