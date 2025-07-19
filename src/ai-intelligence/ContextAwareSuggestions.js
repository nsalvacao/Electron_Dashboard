/**
 * Context-Aware Suggestions - Intelligent recommendations based on usage patterns
 * Provides contextual suggestions for applications and bookmarks
 */

const EventEmitter = require('events');

class ContextAwareSuggestions extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.options = {
            enableTimeBasedSuggestions: options.enableTimeBasedSuggestions !== false,
            enableUsageBasedSuggestions: options.enableUsageBasedSuggestions !== false,
            enableContextualSuggestions: options.enableContextualSuggestions !== false,
            maxSuggestions: options.maxSuggestions || 5,
            confidenceThreshold: options.confidenceThreshold || 0.6,
            cacheExpiry: options.cacheExpiry || 300000, // 5 minutes
            ...options
        };
        
        this.isInitialized = false;
        this.usagePatterns = new Map();
        this.contextualData = new Map();
        this.suggestionCache = new Map();
        this.statistics = {
            totalSuggestions: 0,
            acceptedSuggestions: 0,
            rejectedSuggestions: 0,
            averageConfidence: 0
        };
        
        // Time-based patterns
        this.timePatterns = {
            morning: { start: 6, end: 12, apps: [], bookmarks: [] },
            afternoon: { start: 12, end: 18, apps: [], bookmarks: [] },
            evening: { start: 18, end: 23, apps: [], bookmarks: [] },
            night: { start: 23, end: 6, apps: [], bookmarks: [] }
        };
        
        // Context types
        this.contextTypes = {
            'work': {
                keywords: ['office', 'work', 'business', 'productivity', 'meeting', 'document'],
                weight: 0.8
            },
            'development': {
                keywords: ['code', 'programming', 'git', 'terminal', 'debug', 'build'],
                weight: 0.9
            },
            'entertainment': {
                keywords: ['game', 'music', 'video', 'movie', 'social', 'fun'],
                weight: 0.7
            },
            'learning': {
                keywords: ['course', 'tutorial', 'documentation', 'learn', 'study'],
                weight: 0.8
            },
            'creative': {
                keywords: ['design', 'art', 'photo', 'creative', 'edit', 'draw'],
                weight: 0.75
            }
        };
    }
    
    /**
     * Initialize Context-Aware Suggestions
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Context-Aware Suggestions...');
            
            // Load usage patterns
            await this.loadUsagePatterns();
            
            // Load contextual data
            await this.loadContextualData();
            
            // Initialize AI provider
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            this.isInitialized = true;
            console.log('✅ Context-Aware Suggestions initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Context-Aware Suggestions:', error);
            throw error;
        }
    }
    
    /**
     * Load usage patterns from data
     */
    async loadUsagePatterns() {
        try {
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            // Analyze usage patterns
            allItems.forEach(item => {
                if (item.metadata?.usage) {
                    const usage = item.metadata.usage;
                    this.usagePatterns.set(item.id, {
                        lastUsed: usage.lastUsed,
                        frequency: usage.frequency || 0,
                        timeOfDay: usage.timeOfDay || [],
                        dayOfWeek: usage.dayOfWeek || [],
                        context: usage.context || []
                    });
                }
            });
            
            console.log(`📊 Loaded usage patterns for ${this.usagePatterns.size} items`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load usage patterns:', error.message);
        }
    }
    
    /**
     * Load contextual data
     */
    async loadContextualData() {
        try {
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            // Build contextual relationships
            allItems.forEach(item => {
                const context = this.extractContext(item);
                if (context.length > 0) {
                    this.contextualData.set(item.id, context);
                }
            });
            
            console.log(`🔍 Loaded contextual data for ${this.contextualData.size} items`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load contextual data:', error.message);
        }
    }
    
    /**
     * Extract context from item
     */
    extractContext(item) {
        const text = `${item.core.name} ${item.core.description || ''} ${item.metadata?.merged?.category || ''}`.toLowerCase();
        const contexts = [];
        
        for (const [contextType, contextData] of Object.entries(this.contextTypes)) {
            let score = 0;
            
            for (const keyword of contextData.keywords) {
                if (text.includes(keyword)) {
                    score += contextData.weight;
                }
            }
            
            if (score > 0) {
                contexts.push({
                    type: contextType,
                    score,
                    confidence: Math.min(score, 1.0)
                });
            }
        }
        
        return contexts.sort((a, b) => b.score - a.score);
    }
    
    /**
     * Get contextual suggestions
     */
    async getContextualSuggestions(options = {}) {
        if (!this.isInitialized) {
            throw new Error('Context-Aware Suggestions not initialized');
        }
        
        const context = {
            timeOfDay: this.getCurrentTimeOfDay(),
            dayOfWeek: new Date().getDay(),
            userContext: options.context || 'general',
            recentActivity: options.recentActivity || [],
            ...options
        };
        
        // Check cache
        const cacheKey = this.getCacheKey(context);
        if (this.suggestionCache.has(cacheKey)) {
            const cached = this.suggestionCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.options.cacheExpiry) {
                console.log('💾 Using cached contextual suggestions');
                return cached.suggestions;
            }
        }
        
        const suggestions = [];
        
        // Time-based suggestions
        if (this.options.enableTimeBasedSuggestions) {
            const timeBasedSuggestions = await this.getTimeBasedSuggestions(context);
            suggestions.push(...timeBasedSuggestions);
        }
        
        // Usage-based suggestions
        if (this.options.enableUsageBasedSuggestions) {
            const usageBasedSuggestions = await this.getUsageBasedSuggestions(context);
            suggestions.push(...usageBasedSuggestions);
        }
        
        // AI-powered contextual suggestions
        if (this.options.enableContextualSuggestions) {
            const aiSuggestions = await this.getAIContextualSuggestions(context);
            suggestions.push(...aiSuggestions);
        }
        
        // Sort by confidence and limit
        const sortedSuggestions = suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, this.options.maxSuggestions);
        
        // Cache results
        this.suggestionCache.set(cacheKey, {
            suggestions: sortedSuggestions,
            timestamp: Date.now()
        });
        
        console.log(`💡 Generated ${sortedSuggestions.length} contextual suggestions`);
        
        return sortedSuggestions;
    }
    
    /**
     * Get time-based suggestions
     */
    async getTimeBasedSuggestions(context) {
        const suggestions = [];
        const currentTime = context.timeOfDay;
        
        // Find items commonly used at this time
        for (const [itemId, patterns] of this.usagePatterns.entries()) {
            if (patterns.timeOfDay.includes(currentTime)) {
                const item = await this.getItemById(itemId);
                if (item) {
                    suggestions.push({
                        item,
                        type: 'time-based',
                        confidence: 0.7,
                        reasoning: `Usually used during ${currentTime}`,
                        context: { timeOfDay: currentTime }
                    });
                }
            }
        }
        
        return suggestions;
    }
    
    /**
     * Get usage-based suggestions
     */
    async getUsageBasedSuggestions(context) {
        const suggestions = [];
        
        // Find frequently used items
        const frequentItems = Array.from(this.usagePatterns.entries())
            .sort((a, b) => b[1].frequency - a[1].frequency)
            .slice(0, 10);
        
        for (const [itemId, patterns] of frequentItems) {
            const item = await this.getItemById(itemId);
            if (item) {
                const daysSinceLastUsed = patterns.lastUsed ? 
                    Math.floor((Date.now() - patterns.lastUsed) / (1000 * 60 * 60 * 24)) : 999;
                
                if (daysSinceLastUsed <= 7) { // Used within last week
                    suggestions.push({
                        item,
                        type: 'usage-based',
                        confidence: Math.max(0.8 - (daysSinceLastUsed * 0.1), 0.3),
                        reasoning: `Frequently used (${patterns.frequency} times, last used ${daysSinceLastUsed} days ago)`,
                        context: { frequency: patterns.frequency, daysSinceLastUsed }
                    });
                }
            }
        }
        
        return suggestions;
    }
    
    /**
     * Get AI-powered contextual suggestions
     */
    async getAIContextualSuggestions(context) {
        try {
            const prompt = this.buildContextualPrompt(context);
            
            const response = await this.aiProviderManager.generateSuggestion(prompt, {
                temperature: 0.4,
                maxTokens: 300
            });
            
            const suggestions = this.parseAISuggestions(response.suggestion, context);
            
            return suggestions.map(suggestion => ({
                ...suggestion,
                type: 'ai-contextual',
                provider: response.provider,
                model: response.model,
                cost: response.cost || 0
            }));
            
        } catch (error) {
            console.error('❌ AI contextual suggestions failed:', error);
            return [];
        }
    }
    
    /**
     * Build contextual prompt for AI
     */
    buildContextualPrompt(context) {
        const timeOfDay = context.timeOfDay;
        const userContext = context.userContext;
        const recentActivity = context.recentActivity.slice(0, 3);
        
        return `You are an intelligent assistant that suggests relevant applications and bookmarks based on context.

Current Context:
- Time of day: ${timeOfDay}
- User context: ${userContext}
- Recent activity: ${recentActivity.length > 0 ? recentActivity.join(', ') : 'None'}

Based on this context, suggest 3-5 applications or bookmarks that would be most relevant right now.

For each suggestion, provide:
1. Type (application or bookmark)
2. Category (development, productivity, entertainment, etc.)
3. Confidence (0.0-1.0)
4. Reasoning (why this is relevant now)

Format your response as:
Item: [name]
Type: [application/bookmark]
Category: [category]
Confidence: [0.0-1.0]
Reasoning: [explanation]

---

Focus on items that are contextually appropriate for the current time and user context.`;
    }
    
    /**
     * Parse AI suggestions response
     */
    parseAISuggestions(response, context) {
        const suggestions = [];
        const sections = response.split('---').filter(section => section.trim());
        
        for (const section of sections) {
            const lines = section.split('\n').filter(line => line.trim());
            
            let item = null;
            let type = 'application';
            let category = 'general';
            let confidence = 0.5;
            let reasoning = 'AI suggestion';
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                if (trimmed.startsWith('Item:')) {
                    item = trimmed.replace('Item:', '').trim();
                } else if (trimmed.startsWith('Type:')) {
                    type = trimmed.replace('Type:', '').trim();
                } else if (trimmed.startsWith('Category:')) {
                    category = trimmed.replace('Category:', '').trim();
                } else if (trimmed.startsWith('Confidence:')) {
                    confidence = parseFloat(trimmed.replace('Confidence:', '').trim()) || 0.5;
                } else if (trimmed.startsWith('Reasoning:')) {
                    reasoning = trimmed.replace('Reasoning:', '').trim();
                }
            }
            
            if (item) {
                suggestions.push({
                    item: {
                        core: {
                            name: item,
                            type: type
                        },
                        metadata: {
                            merged: {
                                category: category
                            }
                        }
                    },
                    confidence,
                    reasoning,
                    context
                });
            }
        }
        
        return suggestions;
    }
    
    /**
     * Get suggestions based on similar items
     */
    async getSimilarItemSuggestions(itemId) {
        try {
            const targetItem = await this.getItemById(itemId);
            if (!targetItem) {
                return [];
            }
            
            const targetContext = this.contextualData.get(itemId) || [];
            const suggestions = [];
            
            // Find items with similar context
            for (const [otherItemId, otherContext] of this.contextualData.entries()) {
                if (otherItemId === itemId) continue;
                
                const similarity = this.calculateContextSimilarity(targetContext, otherContext);
                
                if (similarity > 0.5) {
                    const otherItem = await this.getItemById(otherItemId);
                    if (otherItem) {
                        suggestions.push({
                            item: otherItem,
                            type: 'similar-item',
                            confidence: similarity,
                            reasoning: `Similar to ${targetItem.core.name}`,
                            context: { similarity, targetItem: targetItem.core.name }
                        });
                    }
                }
            }
            
            return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
            
        } catch (error) {
            console.error('❌ Failed to get similar item suggestions:', error);
            return [];
        }
    }
    
    /**
     * Calculate context similarity between two items
     */
    calculateContextSimilarity(context1, context2) {
        if (!context1.length || !context2.length) return 0;
        
        let totalSimilarity = 0;
        let matchCount = 0;
        
        for (const ctx1 of context1) {
            for (const ctx2 of context2) {
                if (ctx1.type === ctx2.type) {
                    totalSimilarity += Math.min(ctx1.confidence, ctx2.confidence);
                    matchCount++;
                }
            }
        }
        
        return matchCount > 0 ? totalSimilarity / matchCount : 0;
    }
    
    /**
     * Record suggestion feedback
     */
    async recordSuggestionFeedback(suggestionId, accepted, userFeedback) {
        const feedback = {
            suggestionId,
            accepted,
            userFeedback,
            timestamp: Date.now()
        };
        
        // Update statistics
        this.statistics.totalSuggestions++;
        if (accepted) {
            this.statistics.acceptedSuggestions++;
        } else {
            this.statistics.rejectedSuggestions++;
        }
        
        // Emit feedback event
        this.emit('suggestion-feedback', feedback);
        
        console.log(`📝 Recorded suggestion feedback: ${accepted ? 'accepted' : 'rejected'}`);
    }
    
    /**
     * Get current time of day
     */
    getCurrentTimeOfDay() {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 23) return 'evening';
        return 'night';
    }
    
    /**
     * Get item by ID
     */
    async getItemById(itemId) {
        try {
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            return allItems.find(item => item.id === itemId);
            
        } catch (error) {
            console.error('❌ Failed to get item by ID:', error);
            return null;
        }
    }
    
    /**
     * Get cache key for context
     */
    getCacheKey(context) {
        return `${context.timeOfDay}_${context.userContext}_${context.recentActivity.join(',')}_${context.dayOfWeek}`;
    }
    
    /**
     * Get suggestion statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            usagePatterns: this.usagePatterns.size,
            contextualData: this.contextualData.size,
            cacheSize: this.suggestionCache.size,
            acceptanceRate: this.statistics.totalSuggestions > 0 ? 
                (this.statistics.acceptedSuggestions / this.statistics.totalSuggestions) : 0
        };
    }
    
    /**
     * Clear suggestion cache
     */
    clearCache() {
        this.suggestionCache.clear();
        console.log('🗑️ Suggestion cache cleared');
    }
    
    /**
     * Export suggestion data
     */
    exportData() {
        return {
            usagePatterns: Object.fromEntries(this.usagePatterns),
            contextualData: Object.fromEntries(this.contextualData),
            statistics: this.statistics,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import suggestion data
     */
    async importData(data) {
        if (data.usagePatterns) {
            this.usagePatterns = new Map(Object.entries(data.usagePatterns));
        }
        
        if (data.contextualData) {
            this.contextualData = new Map(Object.entries(data.contextualData));
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        console.log('📥 Suggestion data imported');
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        this.usagePatterns.clear();
        this.contextualData.clear();
        this.suggestionCache.clear();
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Context-Aware Suggestions cleanup complete');
    }
}

module.exports = ContextAwareSuggestions;