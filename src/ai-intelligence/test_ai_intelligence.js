/**
 * Test Suite for AI Intelligence Features
 * Comprehensive tests for all AI Intelligence components
 */

const path = require('path');
const fs = require('fs');

// Import AI Intelligence components
const {
    SmartCategorizationEngine,
    ContextAwareSuggestions,
    PatternLearningSystem,
    BatchOperationsInterface,
    UsageAnalytics,
    NaturalLanguageInterface
} = require('./index');

// Import dependencies from AI integration
const { AIProviderManager } = require('../ai-integration');
const HybridDataManager = require('../data-management/HybridDataManager');

class AIIntelligenceTestSuite {
    constructor() {
        this.testResults = [];
        this.testStartTime = Date.now();
        this.mockData = null;
        this.aiProviderManager = null;
        this.hybridDataManager = null;
        this.components = {};
    }
    
    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting AI Intelligence Features Test Suite...\n');
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Run component tests
            await this.testSmartCategorizationEngine();
            await this.testContextAwareSuggestions();
            await this.testPatternLearningSystem();
            await this.testBatchOperationsInterface();
            await this.testUsageAnalytics();
            await this.testNaturalLanguageInterface();
            
            // Run integration tests
            await this.testComponentIntegration();
            
            // Display results
            this.displayTestResults();
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.recordTest('Test Suite', false, error.message);
            throw error;
        } finally {
            // Cleanup
            await this.cleanupTestEnvironment();
        }
    }
    
    /**
     * Setup test environment
     */
    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        try {
            // Create mock data
            this.mockData = this.createMockData();
            
            // Initialize AI Provider Manager
            this.aiProviderManager = new AIProviderManager({
                enableCostTracking: false,
                enableFallback: false
            });
            
            // Initialize Hybrid Data Manager
            this.hybridDataManager = new HybridDataManager({
                dataPath: path.join(__dirname, '../../data_test'),
                backupEnabled: false
            });
            
            // Initialize components
            await this.initializeComponents();
            
            console.log('✅ Test environment setup complete');
            
        } catch (error) {
            console.error('❌ Test environment setup failed:', error);
            throw error;
        }
    }
    
    /**
     * Create mock data for testing
     */
    createMockData() {
        return {
            apps: [
                {
                    id: 'app_1',
                    core: {
                        name: 'Visual Studio Code',
                        type: 'application',
                        path: '/usr/bin/code',
                        description: 'Code editor'
                    },
                    metadata: {
                        merged: {
                            category: 'development',
                            tags: ['code', 'editor', 'development']
                        },
                        usage: {
                            frequency: 50,
                            lastUsed: Date.now() - 3600000,
                            timeOfDay: [9, 10, 14, 15, 16],
                            dayOfWeek: [1, 2, 3, 4, 5]
                        }
                    }
                },
                {
                    id: 'app_2',
                    core: {
                        name: 'Photoshop',
                        type: 'application',
                        path: '/usr/bin/photoshop',
                        description: 'Image editor'
                    },
                    metadata: {
                        merged: {
                            category: 'design',
                            tags: ['design', 'image', 'creative']
                        },
                        usage: {
                            frequency: 25,
                            lastUsed: Date.now() - 7200000,
                            timeOfDay: [13, 14, 15, 16],
                            dayOfWeek: [1, 2, 3, 4, 5]
                        }
                    }
                }
            ],
            bookmarks: [
                {
                    id: 'bookmark_1',
                    core: {
                        name: 'GitHub',
                        type: 'bookmark',
                        url: 'https://github.com',
                        description: 'Code repository'
                    },
                    metadata: {
                        merged: {
                            category: 'development',
                            tags: ['git', 'repository', 'development']
                        },
                        usage: {
                            frequency: 30,
                            lastUsed: Date.now() - 1800000,
                            timeOfDay: [9, 10, 11, 14, 15],
                            dayOfWeek: [1, 2, 3, 4, 5]
                        }
                    }
                }
            ]
        };
    }
    
    /**
     * Initialize AI Intelligence components
     */
    async initializeComponents() {
        console.log('🚀 Initializing AI Intelligence components...');
        
        // Mock hybrid data manager methods
        this.hybridDataManager.getAllMergedData = async () => this.mockData;
        this.hybridDataManager.updateCustomData = async (id, data) => {
            console.log(`Mock update for ${id}:`, data);
            return true;
        };
        this.hybridDataManager.removeItem = async (id) => {
            console.log(`Mock remove for ${id}`);
            return true;
        };
        
        // Initialize components
        this.components.smartCategorization = new SmartCategorizationEngine(
            this.aiProviderManager,
            this.hybridDataManager,
            { enableLearning: false, batchSize: 5 }
        );
        
        this.components.contextAware = new ContextAwareSuggestions(
            this.aiProviderManager,
            this.hybridDataManager,
            { maxSuggestions: 3 }
        );
        
        this.components.patternLearning = new PatternLearningSystem(
            this.aiProviderManager,
            this.hybridDataManager,
            { enableDeepLearning: false }
        );
        
        this.components.batchOperations = new BatchOperationsInterface(
            this.aiProviderManager,
            this.hybridDataManager,
            this.components.smartCategorization,
            { maxBatchSize: 10 }
        );
        
        this.components.usageAnalytics = new UsageAnalytics(
            this.aiProviderManager,
            this.hybridDataManager,
            this.components.patternLearning,
            { enableRealTimeAnalysis: false }
        );
        
        this.components.naturalLanguage = new NaturalLanguageInterface(
            this.aiProviderManager,
            this.hybridDataManager,
            this.components.smartCategorization,
            this.components.batchOperations,
            this.components.usageAnalytics,
            { enableContextualMemory: false }
        );
        
        console.log('✅ Components initialized');
    }
    
    /**
     * Test Smart Categorization Engine
     */
    async testSmartCategorizationEngine() {
        console.log('🧠 Testing Smart Categorization Engine...');
        
        try {
            const engine = this.components.smartCategorization;
            
            // Test initialization
            await engine.initialize();
            this.recordTest('Smart Categorization - Initialization', engine.isInitialized, 'Component not initialized');
            
            // Test rule-based categorization
            const testItem = this.mockData.apps[0];
            const ruleBasedResult = await engine.ruleBasedCategorization(testItem);
            this.recordTest('Smart Categorization - Rule-based', 
                ruleBasedResult.category !== 'uncategorized', 
                'Rule-based categorization failed');
            
            // Test categorization with mock item
            const mockItem = {
                id: 'test_app',
                core: {
                    name: 'Test IDE',
                    type: 'application',
                    path: '/usr/bin/test-ide',
                    description: 'Development environment'
                }
            };
            
            const categorization = await engine.categorizeItem(mockItem);
            this.recordTest('Smart Categorization - Item categorization', 
                categorization.category && categorization.confidence >= 0, 
                'Item categorization failed');
            
            // Test statistics
            const stats = engine.getStatistics();
            this.recordTest('Smart Categorization - Statistics', 
                stats && typeof stats.totalCategorized === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Smart Categorization Engine tests completed');
            
        } catch (error) {
            console.error('❌ Smart Categorization Engine test failed:', error);
            this.recordTest('Smart Categorization Engine', false, error.message);
        }
    }
    
    /**
     * Test Context-Aware Suggestions
     */
    async testContextAwareSuggestions() {
        console.log('💡 Testing Context-Aware Suggestions...');
        
        try {
            const suggestions = this.components.contextAware;
            
            // Test initialization
            await suggestions.initialize();
            this.recordTest('Context-Aware Suggestions - Initialization', 
                suggestions.isInitialized, 
                'Component not initialized');
            
            // Test contextual suggestions
            const context = {
                timeOfDay: 'morning',
                userContext: 'work',
                recentActivity: ['Visual Studio Code', 'GitHub']
            };
            
            const contextSuggestions = await suggestions.getContextualSuggestions(context);
            this.recordTest('Context-Aware Suggestions - Generation', 
                Array.isArray(contextSuggestions), 
                'Suggestions generation failed');
            
            // Test similar item suggestions
            const similarSuggestions = await suggestions.getSimilarItemSuggestions('app_1');
            this.recordTest('Context-Aware Suggestions - Similar items', 
                Array.isArray(similarSuggestions), 
                'Similar suggestions failed');
            
            // Test statistics
            const stats = suggestions.getStatistics();
            this.recordTest('Context-Aware Suggestions - Statistics', 
                stats && typeof stats.totalSuggestions === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Context-Aware Suggestions tests completed');
            
        } catch (error) {
            console.error('❌ Context-Aware Suggestions test failed:', error);
            this.recordTest('Context-Aware Suggestions', false, error.message);
        }
    }
    
    /**
     * Test Pattern Learning System
     */
    async testPatternLearningSystem() {
        console.log('📚 Testing Pattern Learning System...');
        
        try {
            const patterns = this.components.patternLearning;
            
            // Test initialization
            await patterns.initialize();
            this.recordTest('Pattern Learning - Initialization', 
                patterns.isInitialized, 
                'Component not initialized');
            
            // Test behavior recording
            const behavior = {
                type: 'app_launch',
                itemId: 'app_1',
                itemType: 'application',
                itemName: 'Visual Studio Code',
                category: 'development',
                duration: 3600000
            };
            
            patterns.recordBehavior(behavior);
            this.recordTest('Pattern Learning - Behavior recording', 
                true, 
                'Behavior recording failed');
            
            // Test prediction
            const context = {
                timeOfDay: 'morning',
                dayOfWeek: 1,
                isWorkingHours: true
            };
            
            const prediction = await patterns.predictPreferences(context);
            this.recordTest('Pattern Learning - Prediction', 
                prediction && typeof prediction.confidence === 'number', 
                'Prediction generation failed');
            
            // Test statistics
            const stats = patterns.getStatistics();
            this.recordTest('Pattern Learning - Statistics', 
                stats && typeof stats.totalPatterns === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Pattern Learning System tests completed');
            
        } catch (error) {
            console.error('❌ Pattern Learning System test failed:', error);
            this.recordTest('Pattern Learning System', false, error.message);
        }
    }
    
    /**
     * Test Batch Operations Interface
     */
    async testBatchOperationsInterface() {
        console.log('🔄 Testing Batch Operations Interface...');
        
        try {
            const batchOps = this.components.batchOperations;
            
            // Test initialization
            await batchOps.initialize();
            this.recordTest('Batch Operations - Initialization', 
                batchOps.isInitialized, 
                'Component not initialized');
            
            // Test available operations
            const availableOps = batchOps.getAvailableOperations();
            this.recordTest('Batch Operations - Available operations', 
                Array.isArray(availableOps) && availableOps.length > 0, 
                'Available operations retrieval failed');
            
            // Test cleanup operation (with mock data)
            const mockItems = this.mockData.apps.slice(0, 2);
            const cleanupResult = await batchOps.executeBatchOperation('cleanup', mockItems);
            this.recordTest('Batch Operations - Cleanup execution', 
                cleanupResult && typeof cleanupResult.successful === 'number', 
                'Cleanup operation failed');
            
            // Test statistics
            const stats = batchOps.getStatistics();
            this.recordTest('Batch Operations - Statistics', 
                stats && typeof stats.totalOperations === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Batch Operations Interface tests completed');
            
        } catch (error) {
            console.error('❌ Batch Operations Interface test failed:', error);
            this.recordTest('Batch Operations Interface', false, error.message);
        }
    }
    
    /**
     * Test Usage Analytics
     */
    async testUsageAnalytics() {
        console.log('📊 Testing Usage Analytics...');
        
        try {
            const analytics = this.components.usageAnalytics;
            
            // Test initialization
            await analytics.initialize();
            this.recordTest('Usage Analytics - Initialization', 
                analytics.isInitialized, 
                'Component not initialized');
            
            // Test usage event recording
            const usageEvent = {
                itemId: 'app_1',
                itemType: 'application',
                itemName: 'Visual Studio Code',
                category: 'development',
                eventType: 'launch',
                duration: 3600000
            };
            
            analytics.recordUsageEvent(usageEvent);
            this.recordTest('Usage Analytics - Event recording', 
                true, 
                'Event recording failed');
            
            // Test analytics report generation
            const report = await analytics.generateAnalyticsReport();
            this.recordTest('Usage Analytics - Report generation', 
                report && report.summary && report.categories, 
                'Report generation failed');
            
            // Test dashboard data
            const dashboardData = await analytics.getDashboardData();
            this.recordTest('Usage Analytics - Dashboard data', 
                dashboardData && dashboardData.summary && dashboardData.charts, 
                'Dashboard data retrieval failed');
            
            // Test statistics
            const stats = analytics.getStatistics();
            this.recordTest('Usage Analytics - Statistics', 
                stats && typeof stats.totalEvents === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Usage Analytics tests completed');
            
        } catch (error) {
            console.error('❌ Usage Analytics test failed:', error);
            this.recordTest('Usage Analytics', false, error.message);
        }
    }
    
    /**
     * Test Natural Language Interface
     */
    async testNaturalLanguageInterface() {
        console.log('🗣️ Testing Natural Language Interface...');
        
        try {
            const nlInterface = this.components.naturalLanguage;
            
            // Test initialization
            await nlInterface.initialize();
            this.recordTest('Natural Language - Initialization', 
                nlInterface.isInitialized, 
                'Component not initialized');
            
            // Test command processing
            const searchCommand = "find development apps";
            const searchResult = await nlInterface.processCommand(searchCommand);
            this.recordTest('Natural Language - Search command', 
                searchResult && searchResult.success !== undefined, 
                'Search command processing failed');
            
            // Test help command
            const helpCommand = "help";
            const helpResult = await nlInterface.processCommand(helpCommand);
            this.recordTest('Natural Language - Help command', 
                helpResult && helpResult.response, 
                'Help command processing failed');
            
            // Test conversation history
            const history = nlInterface.getConversationHistory();
            this.recordTest('Natural Language - Conversation history', 
                Array.isArray(history) && history.length > 0, 
                'Conversation history retrieval failed');
            
            // Test statistics
            const stats = nlInterface.getStatistics();
            this.recordTest('Natural Language - Statistics', 
                stats && typeof stats.totalCommands === 'number', 
                'Statistics retrieval failed');
            
            console.log('✅ Natural Language Interface tests completed');
            
        } catch (error) {
            console.error('❌ Natural Language Interface test failed:', error);
            this.recordTest('Natural Language Interface', false, error.message);
        }
    }
    
    /**
     * Test component integration
     */
    async testComponentIntegration() {
        console.log('🔗 Testing Component Integration...');
        
        try {
            // Test data flow between components
            const testItem = this.mockData.apps[0];
            
            // Categorize item
            const categorization = await this.components.smartCategorization.categorizeItem(testItem);
            
            // Get suggestions based on categorization
            const suggestions = await this.components.contextAware.getContextualSuggestions({
                userContext: categorization.category,
                timeOfDay: 'morning'
            });
            
            // Record behavior
            this.components.patternLearning.recordBehavior({
                type: 'categorization',
                itemId: testItem.id,
                category: categorization.category,
                suggestions: suggestions.length
            });
            
            // Record analytics event
            this.components.usageAnalytics.recordUsageEvent({
                itemId: testItem.id,
                itemType: testItem.core.type,
                itemName: testItem.core.name,
                category: categorization.category,
                eventType: 'integration_test'
            });
            
            this.recordTest('Component Integration - Data flow', 
                true, 
                'Component integration failed');
            
            // Test natural language coordination
            const nlResult = await this.components.naturalLanguage.processCommand("show usage statistics");
            this.recordTest('Component Integration - NL coordination', 
                nlResult && nlResult.success, 
                'Natural language coordination failed');
            
            console.log('✅ Component Integration tests completed');
            
        } catch (error) {
            console.error('❌ Component Integration test failed:', error);
            this.recordTest('Component Integration', false, error.message);
        }
    }
    
    /**
     * Record test result
     */
    recordTest(testName, success, errorMessage = null) {
        this.testResults.push({
            name: testName,
            success: success,
            error: errorMessage,
            timestamp: Date.now()
        });
        
        const status = success ? '✅' : '❌';
        const message = success ? 'PASSED' : `FAILED: ${errorMessage}`;
        console.log(`   ${status} ${testName} - ${message}`);
    }
    
    /**
     * Display test results
     */
    displayTestResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.success).length;
        const failedTests = totalTests - passedTests;
        const testDuration = Date.now() - this.testStartTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('🧪 AI INTELLIGENCE FEATURES TEST RESULTS');
        console.log('='.repeat(80));
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`⏱️  Duration: ${testDuration}ms`);
        console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(test => !test.success).forEach(test => {
                console.log(`   • ${test.name}: ${test.error}`);
            });
        }
        
        console.log('\n' + '='.repeat(80));
        
        if (failedTests === 0) {
            console.log('🎉 All AI Intelligence Features tests passed!');
        } else {
            console.log(`⚠️  ${failedTests} test(s) failed. Please review the implementation.`);
        }
        
        console.log('='.repeat(80));
    }
    
    /**
     * Cleanup test environment
     */
    async cleanupTestEnvironment() {
        console.log('\n🧹 Cleaning up test environment...');
        
        try {
            // Cleanup components
            for (const [name, component] of Object.entries(this.components)) {
                if (component && typeof component.cleanup === 'function') {
                    await component.cleanup();
                }
            }
            
            // Cleanup test data directory
            const testDataPath = path.join(__dirname, '../../data_test');
            if (fs.existsSync(testDataPath)) {
                fs.rmSync(testDataPath, { recursive: true, force: true });
            }
            
            console.log('✅ Test environment cleanup complete');
            
        } catch (error) {
            console.warn('⚠️ Test environment cleanup had issues:', error.message);
        }
    }
}

// Main execution
async function main() {
    const testSuite = new AIIntelligenceTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        
        const passedTests = results.filter(test => test.success).length;
        const totalTests = results.length;
        
        if (passedTests === totalTests) {
            console.log('\n🎉 All tests passed! AI Intelligence Features are working correctly.');
            process.exit(0);
        } else {
            console.log(`\n⚠️ ${totalTests - passedTests} test(s) failed. Please review the issues.`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = AIIntelligenceTestSuite;