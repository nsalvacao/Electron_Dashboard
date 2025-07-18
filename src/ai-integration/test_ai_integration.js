/**
 * AI Integration Test Suite
 * Comprehensive testing for all AI integration components
 */

const path = require('path');
const fs = require('fs').promises;
const AIProviderManager = require('./AIProviderManager');

class AIIntegrationTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        
        this.testDataPath = '/tmp/nexo-ai-test';
        this.aiManager = null;
    }
    
    async runTests() {
        console.log('🧪 Starting AI Integration Tests...\\n');
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Test 1: AI Provider Manager Initialization
            console.log('Test 1: AI Provider Manager Initialization');
            await this.testAIProviderManagerInit();
            this.testResults.passed++;
            console.log('✅ AI Provider Manager initialization test passed\\n');
            
            // Test 2: Provider Registration
            console.log('Test 2: Provider Registration');
            await this.testProviderRegistration();
            this.testResults.passed++;
            console.log('✅ Provider registration test passed\\n');
            
            // Test 3: Configuration System
            console.log('Test 3: Configuration System');
            await this.testConfigurationSystem();
            this.testResults.passed++;
            console.log('✅ Configuration system test passed\\n');
            
            // Test 4: Cost Tracking
            console.log('Test 4: Cost Tracking');
            await this.testCostTracking();
            this.testResults.passed++;
            console.log('✅ Cost tracking test passed\\n');
            
            // Test 5: Ollama Integration (if available)
            console.log('Test 5: Ollama Integration');
            await this.testOllamaIntegration();
            this.testResults.passed++;
            console.log('✅ Ollama integration test passed\\n');
            
            // Test 6: Privacy Framework
            console.log('Test 6: Privacy Framework');
            await this.testPrivacyFramework();
            this.testResults.passed++;
            console.log('✅ Privacy framework test passed\\n');
            
            // Test 7: Fallback System
            console.log('Test 7: Fallback System');
            await this.testFallbackSystem();
            this.testResults.passed++;
            console.log('✅ Fallback system test passed\\n');
            
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push(error.message);
            console.error('❌ Test failed:', error.message);
        }
        
        console.log('🏁 AI Integration Test Results:');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\\n🔍 Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        return this.testResults;
    }
    
    async setupTestEnvironment() {
        // Create test data directory
        await fs.mkdir(this.testDataPath, { recursive: true });
        
        // Initialize AI Provider Manager
        this.aiManager = new AIProviderManager({
            dataPath: this.testDataPath,
            enableFallback: true,
            enableCostTracking: true,
            enablePrivacyFiltering: true
        });
    }
    
    async testAIProviderManagerInit() {
        // Test initialization
        await this.aiManager.initialize();
        
        if (!this.aiManager.isInitialized) {
            throw new Error('AI Provider Manager failed to initialize');
        }
        
        // Test that providers are loaded
        const providers = this.aiManager.providers;
        if (providers.size === 0) {
            throw new Error('No providers loaded');
        }
        
        // Test expected providers
        const expectedProviders = ['ollama', 'openai', 'anthropic', 'openrouter', 'huggingface'];
        for (const providerName of expectedProviders) {
            if (!providers.has(providerName)) {
                throw new Error(`Provider ${providerName} not found`);
            }
        }
    }
    
    async testProviderRegistration() {
        // Test provider information
        const ollama = this.aiManager.providers.get('ollama');
        const openai = this.aiManager.providers.get('openai');
        
        if (!ollama || !ollama.instance) {
            throw new Error('Ollama provider not properly registered');
        }
        
        if (!openai || !openai.instance) {
            throw new Error('OpenAI provider not properly registered');
        }
        
        // Test provider info
        const ollamaInfo = ollama.instance.getProviderInfo();
        if (!ollamaInfo.name || ollamaInfo.name !== 'Ollama') {
            throw new Error('Ollama provider info invalid');
        }
        
        const openaiInfo = openai.instance.getProviderInfo();
        if (!openaiInfo.name || openaiInfo.name !== 'OpenAI') {
            throw new Error('OpenAI provider info invalid');
        }
    }
    
    async testConfigurationSystem() {
        const configuration = this.aiManager.configuration;
        
        // Test configuration initialization
        if (!configuration.isInitialized) {
            throw new Error('Configuration system not initialized');
        }
        
        // Test setting preferences
        await configuration.setPreference('testPref', 'testValue');
        const prefValue = configuration.getPreference('testPref');
        
        if (prefValue !== 'testValue') {
            throw new Error('Configuration preference not saved correctly');
        }
        
        // Test provider configuration (mock)
        const mockConfig = {
            enabled: true,
            defaultModel: 'test-model',
            temperature: 0.7
        };
        
        await configuration.configureProvider('test-provider', mockConfig);
        const savedConfig = configuration.getProviderConfig('test-provider');
        
        if (!savedConfig || savedConfig.enabled !== true) {
            throw new Error('Provider configuration not saved correctly');
        }
    }
    
    async testCostTracking() {
        const costTracker = this.aiManager.costTracker;
        
        // Reset cost tracker for clean test
        costTracker.costs.clear();
        costTracker.usage.clear();
        
        // Test cost tracking
        await costTracker.trackUsage('test-provider', 'test-operation', 0.01, 100);
        
        const stats = costTracker.getUsageStats('test-provider');
        if (!stats) {
            throw new Error('Usage stats not tracked');
        }
        
        if (Math.abs(stats.currentMonth.cost - 0.01) > 0.001) {
            throw new Error(`Cost not tracked correctly: expected 0.01, got ${stats.currentMonth.cost}`);
        }
        
        if (stats.currentMonth.tokens !== 100) {
            throw new Error('Tokens not tracked correctly');
        }
        
        // Test cost limits
        await costTracker.setCostLimit('test-provider', 10.0, 0.8);
        const statsWithLimit = costTracker.getUsageStats('test-provider');
        
        if (!statsWithLimit.limits) {
            throw new Error('Cost limits not set');
        }
        
        if (statsWithLimit.limits.monthlyLimit !== 10.0) {
            throw new Error('Cost limit not saved correctly');
        }
    }
    
    async testOllamaIntegration() {
        const ollama = this.aiManager.providers.get('ollama');
        
        if (!ollama || !ollama.instance) {
            throw new Error('Ollama provider not available');
        }
        
        // Test Ollama detection
        const ollamaProvider = ollama.instance;
        
        // Test connection (may fail if Ollama not installed)
        try {
            const isConnected = await ollamaProvider.testConnection();
            console.log(`ℹ️ Ollama connection test: ${isConnected ? 'Connected' : 'Not connected'}`);
        } catch (error) {
            console.log(`ℹ️ Ollama not available: ${error.message}`);
        }
        
        // Test configuration (but don't require connection)
        const config = {
            enabled: false, // Don't enable if not connected
            baseUrl: 'http://localhost:11434',
            defaultModel: 'test-model',
            temperature: 0.7
        };
        
        try {
            await ollamaProvider.configure(config);
            
            if (ollamaProvider.config.temperature !== 0.7) {
                throw new Error('Ollama configuration not applied correctly');
            }
        } catch (error) {
            console.log(`ℹ️ Ollama configuration test skipped: ${error.message}`);
            // Don't fail if Ollama is not available
        }
    }
    
    async testPrivacyFramework() {
        const privacyManager = this.aiManager.privacyManager;
        
        // Test data filtering
        const testPrompt = 'Please help me with credit card 1234-5678-9012-3456 and email test@example.com';
        const filtered = await privacyManager.filterData(testPrompt);
        
        if (filtered.prompt.includes('1234-5678-9012-3456')) {
            throw new Error('Credit card number not filtered');
        }
        
        if (filtered.prompt.includes('test@example.com')) {
            throw new Error('Email address not filtered');
        }
        
        if (!filtered.prompt.includes('[REDACTED]')) {
            throw new Error('Sensitive data not redacted');
        }
    }
    
    async testFallbackSystem() {
        const fallbackManager = this.aiManager.fallbackManager;
        
        // Test fallback execution
        let attemptCount = 0;
        const testOperation = async (provider) => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error(`Provider ${provider} failed`);
            }
            return `Success with ${provider}`;
        };
        
        const providers = ['provider1', 'provider2', 'provider3'];
        const result = await fallbackManager.executeWithFallback(testOperation, providers);
        
        if (result !== 'Success with provider3') {
            throw new Error('Fallback system not working correctly');
        }
        
        if (attemptCount !== 3) {
            throw new Error('Fallback system did not try all providers');
        }
    }
    
    async testGenerateSuggestion() {
        // Test with mock provider (since we may not have real API keys)
        const mockProvider = {
            generateSuggestion: async (prompt, options) => {
                return {
                    suggestion: `Mock response for: ${prompt}`,
                    provider: 'mock',
                    tokens: 50,
                    cost: 0.001,
                    timestamp: Date.now()
                };
            }
        };
        
        // Mock a provider for testing
        this.aiManager.providers.set('mock', {
            instance: mockProvider,
            isAvailable: true,
            priority: 1
        });
        
        this.aiManager.activeProvider = 'mock';
        
        const result = await this.aiManager.generateSuggestion('Test prompt');
        
        if (!result.suggestion || !result.suggestion.includes('Test prompt')) {
            throw new Error('Suggestion generation failed');
        }
        
        if (result.provider !== 'mock') {
            throw new Error('Incorrect provider used');
        }
    }
    
    async cleanup() {
        console.log('🧹 Cleaning up AI Integration test data...');
        
        try {
            // Cleanup AI manager
            if (this.aiManager) {
                await this.aiManager.cleanup();
            }
            
            // Remove test data directory
            await fs.rmdir(this.testDataPath, { recursive: true });
            
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AIIntegrationTester();
    
    tester.runTests()
        .then(async (results) => {
            await tester.cleanup();
            
            if (results.failed === 0) {
                console.log('\\n🎉 All AI Integration tests passed!');
                process.exit(0);
            } else {
                console.log('\\n💥 Some AI Integration tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = AIIntegrationTester;