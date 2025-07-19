/**
 * AI Intelligence Features - Main module exports
 * Central exports for all AI Intelligence components
 */

// Core AI Intelligence Components
const SmartCategorizationEngine = require('./SmartCategorizationEngine');
const ContextAwareSuggestions = require('./ContextAwareSuggestions');
const PatternLearningSystem = require('./PatternLearningSystem');
const BatchOperationsInterface = require('./BatchOperationsInterface');
const UsageAnalytics = require('./UsageAnalytics');
const NaturalLanguageInterface = require('./NaturalLanguageInterface');

module.exports = {
    // Core Components
    SmartCategorizationEngine,
    ContextAwareSuggestions,
    PatternLearningSystem,
    BatchOperationsInterface,
    UsageAnalytics,
    NaturalLanguageInterface,
    
    // Convenience factory functions
    createSmartCategorizationEngine: (aiProviderManager, hybridDataManager, options) => {
        return new SmartCategorizationEngine(aiProviderManager, hybridDataManager, options);
    },
    
    createContextAwareSuggestions: (aiProviderManager, hybridDataManager, options) => {
        return new ContextAwareSuggestions(aiProviderManager, hybridDataManager, options);
    },
    
    createPatternLearningSystem: (aiProviderManager, hybridDataManager, options) => {
        return new PatternLearningSystem(aiProviderManager, hybridDataManager, options);
    },
    
    createBatchOperationsInterface: (aiProviderManager, hybridDataManager, smartCategorizationEngine, options) => {
        return new BatchOperationsInterface(aiProviderManager, hybridDataManager, smartCategorizationEngine, options);
    },
    
    createUsageAnalytics: (aiProviderManager, hybridDataManager, patternLearningSystem, options) => {
        return new UsageAnalytics(aiProviderManager, hybridDataManager, patternLearningSystem, options);
    },
    
    createNaturalLanguageInterface: (aiProviderManager, hybridDataManager, smartCategorizationEngine, batchOperationsInterface, usageAnalytics, options) => {
        return new NaturalLanguageInterface(aiProviderManager, hybridDataManager, smartCategorizationEngine, batchOperationsInterface, usageAnalytics, options);
    }
};