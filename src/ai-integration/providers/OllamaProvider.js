/**
 * Ollama Provider - Local AI model integration
 * Provides interface to locally running Ollama models
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class OllamaProvider extends AIProvider {
    constructor(options = {}) {
        super(options);
        
        this.baseUrl = options.baseUrl || 'http://localhost:11434';
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;
        
        this.availableModels = [];
        this.installedModels = [];
        this.isOllamaInstalled = false;
        this.isOllamaRunning = false;
        this.resourceMonitor = null;
        
        this.config = {
            enabled: false,
            baseUrl: this.baseUrl,
            defaultModel: 'llama2',
            temperature: 0.7,
            maxTokens: 2048,
            timeout: this.timeout,
            ...options.config
        };
    }
    
    /**
     * Initialize Ollama provider
     */
    async initialize() {
        try {
            console.log('🦙 Initializing Ollama provider...');
            
            // Check if Ollama is installed
            await this.detectOllamaInstallation();
            
            if (this.isOllamaInstalled) {
                // Check if Ollama is running
                await this.checkOllamaStatus();
                
                if (this.isOllamaRunning) {
                    // Get available models
                    await this.refreshAvailableModels();
                    
                    // Start resource monitoring
                    this.startResourceMonitoring();
                    
                    this.config.enabled = true;
                }
            }
            
            this.isInitialized = true;
            
            console.log(`✅ Ollama provider initialized - Running: ${this.isOllamaRunning}, Models: ${this.installedModels.length}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Ollama provider:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Detect Ollama installation
     */
    async detectOllamaInstallation() {
        try {
            // Try to run ollama --version
            const { stdout, stderr } = await this.execCommand('ollama --version');
            
            if (stdout.includes('ollama version')) {
                this.isOllamaInstalled = true;
                console.log('✅ Ollama installation detected');
                return true;
            }
            
        } catch (error) {
            console.log('ℹ️ Ollama not found in PATH, checking common locations...');
            
            // Check common installation paths
            const commonPaths = [
                '/usr/local/bin/ollama',
                '/usr/bin/ollama',
                'C:\\\\Program Files\\\\Ollama\\\\ollama.exe',
                'C:\\\\Users\\\\' + process.env.USERNAME + '\\\\AppData\\\\Local\\\\Programs\\\\Ollama\\\\ollama.exe'
            ];
            
            for (const path of commonPaths) {
                try {
                    await fs.access(path);
                    this.isOllamaInstalled = true;
                    console.log(`✅ Ollama found at: ${path}`);
                    return true;
                } catch (e) {
                    // Continue checking
                }
            }
        }
        
        console.log('ℹ️ Ollama not detected. Please install Ollama from https://ollama.ai');
        return false;
    }
    
    /**
     * Check if Ollama is running
     */
    async checkOllamaStatus() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/version`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                this.isOllamaRunning = true;
                console.log('✅ Ollama is running');
                return true;
            }
            
        } catch (error) {
            console.log('ℹ️ Ollama is not running. Attempting to start...');
            
            // Try to start Ollama
            try {
                await this.startOllama();
                // Wait a bit and check again
                await new Promise(resolve => setTimeout(resolve, 3000));
                return await this.checkOllamaStatus();
                
            } catch (startError) {
                console.warn('⚠️ Failed to start Ollama:', startError.message);
            }
        }
        
        return false;
    }
    
    /**
     * Start Ollama service
     */
    async startOllama() {
        return new Promise((resolve, reject) => {
            const process = spawn('ollama', ['serve'], {
                detached: true,
                stdio: 'ignore'
            });
            
            process.unref();
            
            process.on('error', reject);
            process.on('spawn', () => {
                console.log('🚀 Ollama service started');
                resolve();
            });
        });
    }
    
    /**
     * Refresh available models
     */
    async refreshAvailableModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 10000
            });
            
            if (response.data && response.data.models) {
                this.installedModels = response.data.models.map(model => ({
                    name: model.name,
                    size: model.size,
                    modified: model.modified_at,
                    digest: model.digest
                }));
                
                console.log(`📦 Found ${this.installedModels.length} Ollama models`);
                
                // Set default model if not configured
                if (!this.config.defaultModel && this.installedModels.length > 0) {
                    this.config.defaultModel = this.installedModels[0].name;
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to refresh Ollama models:', error.message);
        }
    }
    
    /**
     * Test connection to Ollama
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/version`, {
                timeout: 5000
            });
            
            return response.status === 200;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Configure Ollama provider
     */
    async configure(config) {
        const validation = this.validateConfig(config);
        if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
        
        this.config = { ...this.config, ...config };
        
        // Update base URL if changed
        if (config.baseUrl && config.baseUrl !== this.baseUrl) {
            this.baseUrl = config.baseUrl;
        }
        
        // Test connection with new config (only if enabled)
        if (config.enabled) {
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Failed to connect with new configuration');
            }
        }
        
        // Refresh models
        await this.refreshAvailableModels();
        
        console.log('✅ Ollama provider configured successfully');
    }
    
    /**
     * Generate AI suggestion using Ollama
     */
    async generateSuggestion(prompt, options = {}) {
        if (!this.isInitialized || !this.isOllamaRunning) {
            throw new Error('Ollama provider not initialized or not running');
        }
        
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        const maxTokens = options.maxTokens || this.config.maxTokens;
        
        try {
            const startTime = Date.now();
            this.requestCount++;
            
            console.log(`🦙 Generating suggestion with Ollama model: ${model}`);
            
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model,
                prompt,
                options: {
                    temperature,
                    num_predict: maxTokens,
                    stop: options.stop || []
                },
                stream: false
            }, {
                timeout: this.config.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (response.data && response.data.response) {
                const result = {
                    suggestion: response.data.response,
                    model,
                    provider: 'ollama',
                    tokens: response.data.eval_count || 0,
                    duration,
                    cost: 0, // Ollama is free
                    timestamp: Date.now()
                };
                
                console.log(`✅ Ollama suggestion generated in ${duration}ms`);
                return result;
            }
            
            throw new Error('Invalid response from Ollama');
            
        } catch (error) {
            console.error('❌ Ollama suggestion generation failed:', error.message);
            this.handleError(error);
        }
    }
    
    /**
     * Get available models
     */
    async getAvailableModels() {
        await this.refreshAvailableModels();
        return this.installedModels;
    }
    
    /**
     * Pull/download a model
     */
    async pullModel(modelName) {
        try {
            console.log(`📥 Pulling Ollama model: ${modelName}`);
            
            const response = await axios.post(`${this.baseUrl}/api/pull`, {
                name: modelName
            }, {
                timeout: 300000, // 5 minutes timeout for model downloads
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 200) {
                console.log(`✅ Model ${modelName} pulled successfully`);
                await this.refreshAvailableModels();
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Failed to pull model ${modelName}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Delete a model
     */
    async deleteModel(modelName) {
        try {
            console.log(`🗑️ Deleting Ollama model: ${modelName}`);
            
            const response = await axios.delete(`${this.baseUrl}/api/delete`, {
                data: { name: modelName },
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 200) {
                console.log(`✅ Model ${modelName} deleted successfully`);
                await this.refreshAvailableModels();
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Failed to delete model ${modelName}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Get provider information
     */
    getProviderInfo() {
        return {
            name: 'Ollama',
            type: 'local',
            description: 'Local AI models via Ollama',
            website: 'https://ollama.ai',
            supportsCustomModels: true,
            requiresApiKey: false,
            isInstalled: this.isOllamaInstalled,
            isRunning: this.isOllamaRunning,
            installedModels: this.installedModels.length,
            baseUrl: this.baseUrl
        };
    }
    
    /**
     * Validate configuration
     */
    validateConfig(config) {
        const errors = [];
        
        if (config.baseUrl && typeof config.baseUrl !== 'string') {
            errors.push('baseUrl must be a string');
        }
        
        if (config.temperature && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1)) {
            errors.push('temperature must be a number between 0 and 1');
        }
        
        if (config.maxTokens && (typeof config.maxTokens !== 'number' || config.maxTokens < 1)) {
            errors.push('maxTokens must be a positive number');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Start resource monitoring
     */
    startResourceMonitoring() {
        if (this.resourceMonitor) {
            return;
        }
        
        this.resourceMonitor = setInterval(async () => {
            try {
                // Monitor system resources when Ollama is running
                const memoryUsage = process.memoryUsage();
                const cpuUsage = process.cpuUsage();
                
                // Emit resource usage event
                this.emit('resource-usage', {
                    memory: memoryUsage,
                    cpu: cpuUsage,
                    timestamp: Date.now()
                });
                
            } catch (error) {
                console.warn('⚠️ Resource monitoring error:', error.message);
            }
        }, 10000); // Monitor every 10 seconds
    }
    
    /**
     * Execute command
     */
    async execCommand(command) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        return await execAsync(command);
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.resourceMonitor) {
            clearInterval(this.resourceMonitor);
            this.resourceMonitor = null;
        }
        
        await super.cleanup();
    }
}

module.exports = OllamaProvider;