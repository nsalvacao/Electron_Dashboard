/**
 * AI Configuration Manager - Secure configuration management for AI providers
 * Handles encryption, storage, and retrieval of AI provider configurations
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AIConfiguration {
    constructor(dataPath) {
        this.dataPath = dataPath;
        this.configFile = path.join(dataPath, 'ai-config.json');
        this.keyFile = path.join(dataPath, '.ai-key');
        this.encryptionKey = null;
        this.config = {
            activeProvider: null,
            fallbackChain: [],
            providers: {},
            preferences: {
                enableCostTracking: true,
                enablePrivacyFiltering: true,
                enableFallback: true,
                defaultTimeout: 30000,
                maxCostPerMonth: 50.0,
                costAlertThreshold: 0.8
            }
        };
        this.isInitialized = false;
    }
    
    /**
     * Initialize configuration manager
     */
    async initialize() {
        try {
            console.log('🔐 Initializing AI Configuration...');
            
            // Ensure data directory exists
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // Load or generate encryption key
            await this.loadOrGenerateKey();
            
            // Load existing configuration
            await this.loadConfiguration();
            
            this.isInitialized = true;
            console.log('✅ AI Configuration initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize AI Configuration:', error);
            throw error;
        }
    }
    
    /**
     * Load or generate encryption key
     */
    async loadOrGenerateKey() {
        try {
            // Try to load existing key
            const keyData = await fs.readFile(this.keyFile, 'utf8');
            this.encryptionKey = keyData.trim();
            
        } catch (error) {
            // Generate new key if none exists
            console.log('🔑 Generating new encryption key...');
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
            
            // Save key to file with restricted permissions
            await fs.writeFile(this.keyFile, this.encryptionKey, { mode: 0o600 });
            console.log('✅ New encryption key generated and saved');
        }
    }
    
    /**
     * Load configuration from file
     */
    async loadConfiguration() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            const encryptedConfig = JSON.parse(data);
            
            // Decrypt configuration
            this.config = this.decryptConfig(encryptedConfig);
            
            console.log('✅ AI Configuration loaded');
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('ℹ️ No existing configuration found, using defaults');
                await this.saveConfiguration();
            } else {
                console.error('❌ Failed to load configuration:', error);
                throw error;
            }
        }
        
        return this.config;
    }
    
    /**
     * Save configuration to file
     */
    async saveConfiguration() {
        try {
            // Encrypt configuration
            const encryptedConfig = this.encryptConfig(this.config);
            
            // Write to file
            await fs.writeFile(this.configFile, JSON.stringify(encryptedConfig, null, 2));
            
            console.log('✅ AI Configuration saved');
            
        } catch (error) {
            console.error('❌ Failed to save configuration:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt configuration data
     */
    encryptConfig(config) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            algorithm,
            iv: iv.toString('hex'),
            data: encrypted
        };
    }
    
    /**
     * Decrypt configuration data
     */
    decryptConfig(encryptedConfig) {
        const algorithm = encryptedConfig.algorithm;
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = Buffer.from(encryptedConfig.iv, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        
        let decrypted = decipher.update(encryptedConfig.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
    
    /**
     * Configure a provider
     */
    async configureProvider(providerName, config) {
        // Validate provider configuration
        const validation = this.validateProviderConfig(providerName, config);
        if (!validation.valid) {
            throw new Error(`Invalid provider configuration: ${validation.errors.join(', ')}`);
        }
        
        // Encrypt sensitive data
        const encryptedConfig = this.encryptProviderConfig(config);
        
        // Save to configuration
        this.config.providers[providerName] = encryptedConfig;
        
        // Save to file
        await this.saveConfiguration();
        
        console.log(`✅ Provider ${providerName} configured`);
    }
    
    /**
     * Get provider configuration
     */
    getProviderConfig(providerName) {
        if (!this.config.providers[providerName]) {
            return null;
        }
        
        // Decrypt provider configuration
        return this.decryptProviderConfig(this.config.providers[providerName]);
    }
    
    /**
     * Encrypt provider configuration
     */
    encryptProviderConfig(config) {
        const encryptedConfig = { ...config };
        
        // Encrypt sensitive fields
        const sensitiveFields = ['apiKey', 'secretKey', 'token', 'password'];
        
        for (const field of sensitiveFields) {
            if (config[field]) {
                encryptedConfig[field] = this.encryptString(config[field]);
            }
        }
        
        return encryptedConfig;
    }
    
    /**
     * Decrypt provider configuration
     */
    decryptProviderConfig(encryptedConfig) {
        const config = { ...encryptedConfig };
        
        // Decrypt sensitive fields
        const sensitiveFields = ['apiKey', 'secretKey', 'token', 'password'];
        
        for (const field of sensitiveFields) {
            if (encryptedConfig[field] && typeof encryptedConfig[field] === 'object') {
                config[field] = this.decryptString(encryptedConfig[field]);
            }
        }
        
        return config;
    }
    
    /**
     * Encrypt a string
     */
    encryptString(text) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            algorithm,
            iv: iv.toString('hex'),
            data: encrypted
        };
    }
    
    /**
     * Decrypt a string
     */
    decryptString(encryptedData) {
        const algorithm = encryptedData.algorithm;
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    /**
     * Set active provider
     */
    async setActiveProvider(providerName) {
        this.config.activeProvider = providerName;
        await this.saveConfiguration();
    }
    
    /**
     * Get active provider
     */
    getActiveProvider() {
        return this.config.activeProvider;
    }
    
    /**
     * Set fallback chain
     */
    async setFallbackChain(chain) {
        this.config.fallbackChain = chain;
        await this.saveConfiguration();
    }
    
    /**
     * Get fallback chain
     */
    getFallbackChain() {
        return this.config.fallbackChain;
    }
    
    /**
     * Set preference
     */
    async setPreference(key, value) {
        this.config.preferences[key] = value;
        await this.saveConfiguration();
    }
    
    /**
     * Get preference
     */
    getPreference(key) {
        return this.config.preferences[key];
    }
    
    /**
     * Get all preferences
     */
    getPreferences() {
        return { ...this.config.preferences };
    }
    
    /**
     * Validate provider configuration
     */
    validateProviderConfig(providerName, config) {
        const errors = [];
        
        if (!providerName || typeof providerName !== 'string') {
            errors.push('Provider name must be a non-empty string');
        }
        
        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
        }
        
        // Provider-specific validation
        switch (providerName) {
            case 'openai':
                if (!config.apiKey || typeof config.apiKey !== 'string') {
                    errors.push('OpenAI API key is required');
                }
                break;
                
            case 'anthropic':
                if (!config.apiKey || typeof config.apiKey !== 'string') {
                    errors.push('Anthropic API key is required');
                }
                break;
                
            case 'openrouter':
                if (!config.apiKey || typeof config.apiKey !== 'string') {
                    errors.push('OpenRouter API key is required');
                }
                break;
                
            case 'ollama':
                if (config.baseUrl && typeof config.baseUrl !== 'string') {
                    errors.push('Ollama base URL must be a string');
                }
                break;
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Remove provider configuration
     */
    async removeProvider(providerName) {
        if (this.config.providers[providerName]) {
            delete this.config.providers[providerName];
            
            // Remove from active provider if it was active
            if (this.config.activeProvider === providerName) {
                this.config.activeProvider = null;
            }
            
            // Remove from fallback chain
            this.config.fallbackChain = this.config.fallbackChain.filter(name => name !== providerName);
            
            await this.saveConfiguration();
            console.log(`✅ Provider ${providerName} removed`);
        }
    }
    
    /**
     * Get all provider names
     */
    getProviderNames() {
        return Object.keys(this.config.providers);
    }
    
    /**
     * Export configuration (encrypted)
     */
    async exportConfiguration() {
        const exportData = {
            config: this.config,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Import configuration
     */
    async importConfiguration(data) {
        try {
            const importData = JSON.parse(data);
            
            if (!importData.config || !importData.version) {
                throw new Error('Invalid configuration format');
            }
            
            // Validate imported configuration
            const validation = this.validateConfiguration(importData.config);
            if (!validation.valid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            
            // Backup current configuration
            const backupPath = path.join(this.dataPath, `ai-config-backup-${Date.now()}.json`);
            await fs.writeFile(backupPath, JSON.stringify(this.config, null, 2));
            
            // Import new configuration
            this.config = importData.config;
            await this.saveConfiguration();
            
            console.log('✅ Configuration imported successfully');
            
        } catch (error) {
            console.error('❌ Failed to import configuration:', error);
            throw error;
        }
    }
    
    /**
     * Validate configuration structure
     */
    validateConfiguration(config) {
        const errors = [];
        
        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
            return { valid: false, errors };
        }
        
        if (!config.providers || typeof config.providers !== 'object') {
            errors.push('Providers section is required');
        }
        
        if (!config.preferences || typeof config.preferences !== 'object') {
            errors.push('Preferences section is required');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Cleanup configuration
     */
    async cleanup() {
        // Clear sensitive data from memory
        this.encryptionKey = null;
        this.config = {
            activeProvider: null,
            fallbackChain: [],
            providers: {},
            preferences: {}
        };
        
        this.isInitialized = false;
    }
}

module.exports = AIConfiguration;