/**
 * AI Integration Module - Main exports
 */

const AIProviderManager = require('./AIProviderManager');

// Providers
const AIProvider = require('./providers/AIProvider');
const OllamaProvider = require('./providers/OllamaProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');
const OpenRouterProvider = require('./providers/OpenRouterProvider');
const HuggingFaceProvider = require('./providers/HuggingFaceProvider');

// Utils
const AIConfiguration = require('./utils/AIConfiguration');
const CostTracker = require('./utils/CostTracker');
const UsageMonitor = require('./utils/UsageMonitor');
const FallbackManager = require('./utils/FallbackManager');
const PrivacyManager = require('./utils/PrivacyManager');

module.exports = {
    // Main manager
    AIProviderManager,
    
    // Providers
    AIProvider,
    OllamaProvider,
    OpenAIProvider,
    AnthropicProvider,
    OpenRouterProvider,
    HuggingFaceProvider,
    
    // Utils
    AIConfiguration,
    CostTracker,
    UsageMonitor,
    FallbackManager,
    PrivacyManager
};