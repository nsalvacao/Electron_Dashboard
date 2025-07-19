/**
 * Smart Categorization Engine - AI-powered automatic categorization
 * Uses AI providers to intelligently categorize applications and bookmarks
 */

const EventEmitter = require('events');

class SmartCategorizationEngine extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.options = {
            enableLearning: options.enableLearning !== false,
            batchSize: options.batchSize || 10,
            confidenceThreshold: options.confidenceThreshold || 0.7,
            maxRetries: options.maxRetries || 3,
            cacheResults: options.cacheResults !== false,
            ...options
        };
        
        this.isInitialized = false;
        this.categories = new Map();
        this.categorizationCache = new Map();
        this.learningData = new Map();
        this.statistics = {
            totalCategorized: 0,
            correctPredictions: 0,
            userCorrections: 0,
            averageConfidence: 0
        };
        
        // Predefined category mappings
        this.categoryMappings = {
            'development': {
                keywords: ['code', 'ide', 'programming', 'git', 'developer', 'terminal', 'debug', 'compiler'],
                patterns: [/visual studio/i, /intellij/i, /eclipse/i, /vscode/i, /sublime/i, /atom/i],
                confidence: 0.9
            },
            'productivity': {
                keywords: ['office', 'document', 'spreadsheet', 'presentation', 'email', 'calendar', 'note'],
                patterns: [/microsoft office/i, /google workspace/i, /notion/i, /obsidian/i, /evernote/i],
                confidence: 0.8
            },
            'design': {
                keywords: ['design', 'graphic', 'photo', 'image', 'creative', 'art', 'drawing'],
                patterns: [/photoshop/i, /illustrator/i, /figma/i, /sketch/i, /canva/i, /gimp/i],
                confidence: 0.85
            },
            'communication': {
                keywords: ['chat', 'message', 'video', 'call', 'social', 'meeting', 'conference'],
                patterns: [/discord/i, /slack/i, /teams/i, /zoom/i, /skype/i, /whatsapp/i],
                confidence: 0.8
            },
            'entertainment': {
                keywords: ['game', 'music', 'video', 'movie', 'stream', 'media', 'player'],
                patterns: [/spotify/i, /netflix/i, /youtube/i, /steam/i, /vlc/i, /media player/i],
                confidence: 0.75
            },
            'utilities': {
                keywords: ['utility', 'tool', 'system', 'file', 'manager', 'cleaner', 'antivirus'],
                patterns: [/ccleaner/i, /7-zip/i, /winrar/i, /notepad/i, /calculator/i],
                confidence: 0.7
            },
            'finance': {
                keywords: ['finance', 'money', 'bank', 'trading', 'investment', 'crypto', 'budget'],
                patterns: [/quickbooks/i, /excel/i, /mint/i, /paypal/i, /coinbase/i],
                confidence: 0.8
            },
            'education': {
                keywords: ['education', 'learning', 'course', 'study', 'research', 'academic'],
                patterns: [/coursera/i, /udemy/i, /khan academy/i, /duolingo/i, /mendeley/i],
                confidence: 0.75
            }
        };
    }
    
    /**
     * Initialize the Smart Categorization Engine
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Smart Categorization Engine...');
            
            // Load existing categories
            await this.loadCategories();
            
            // Load learning data
            await this.loadLearningData();
            
            // Initialize AI provider
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            this.isInitialized = true;
            console.log('✅ Smart Categorization Engine initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Smart Categorization Engine:', error);
            throw error;
        }
    }
    
    /**
     * Load existing categories from data manager
     */
    async loadCategories() {
        try {
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            // Extract existing categories
            const categorySet = new Set();
            allItems.forEach(item => {
                if (item.metadata?.merged?.category) {
                    categorySet.add(item.metadata.merged.category.toLowerCase());
                }
            });
            
            // Initialize category statistics
            categorySet.forEach(category => {
                this.categories.set(category, {
                    name: category,
                    count: 0,
                    confidence: 0,
                    lastUpdated: Date.now()
                });
            });
            
            console.log(`📊 Loaded ${categorySet.size} existing categories`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load categories:', error.message);
        }
    }
    
    /**
     * Load learning data from storage
     */
    async loadLearningData() {
        // TODO: Implement learning data persistence
        console.log('📚 Learning data system ready');
    }
    
    /**
     * Categorize a single item using AI
     */
    async categorizeItem(item) {
        if (!this.isInitialized) {
            throw new Error('Smart Categorization Engine not initialized');
        }
        
        try {
            // Check cache first
            const cacheKey = this.getCacheKey(item);
            if (this.categorizationCache.has(cacheKey)) {
                const cached = this.categorizationCache.get(cacheKey);
                console.log(`💾 Using cached categorization for ${item.core.name}`);
                return cached;
            }
            
            // Try rule-based categorization first
            const ruleBasedResult = await this.ruleBasedCategorization(item);
            if (ruleBasedResult.confidence >= this.options.confidenceThreshold) {
                console.log(`📋 Rule-based categorization: ${item.core.name} → ${ruleBasedResult.category}`);
                
                if (this.options.cacheResults) {
                    this.categorizationCache.set(cacheKey, ruleBasedResult);
                }
                
                return ruleBasedResult;
            }
            
            // Use AI for more complex categorization
            const aiResult = await this.aiBasedCategorization(item);
            
            if (this.options.cacheResults) {
                this.categorizationCache.set(cacheKey, aiResult);
            }
            
            // Update statistics
            this.statistics.totalCategorized++;
            this.statistics.averageConfidence = 
                (this.statistics.averageConfidence * (this.statistics.totalCategorized - 1) + aiResult.confidence) / 
                this.statistics.totalCategorized;
            
            console.log(`🤖 AI categorization: ${item.core.name} → ${aiResult.category} (${(aiResult.confidence * 100).toFixed(1)}%)`);
            
            return aiResult;
            
        } catch (error) {
            console.error(`❌ Failed to categorize ${item.core.name}:`, error);
            return {
                category: 'uncategorized',
                confidence: 0,
                method: 'error',
                reasoning: `Error: ${error.message}`
            };
        }
    }
    
    /**
     * Rule-based categorization using predefined mappings
     */
    async ruleBasedCategorization(item) {
        const itemText = `${item.core.name} ${item.core.description || ''} ${item.core.path || item.core.url || ''}`.toLowerCase();
        
        let bestMatch = {
            category: 'uncategorized',
            confidence: 0,
            method: 'rule-based',
            reasoning: 'No matching rules found'
        };
        
        for (const [category, mapping] of Object.entries(this.categoryMappings)) {
            let confidence = 0;
            let matchedKeywords = [];
            let matchedPatterns = [];
            
            // Check keyword matches
            for (const keyword of mapping.keywords) {
                if (itemText.includes(keyword)) {
                    confidence += 0.1;
                    matchedKeywords.push(keyword);
                }
            }
            
            // Check pattern matches
            for (const pattern of mapping.patterns) {
                if (pattern.test(itemText)) {
                    confidence += 0.3;
                    matchedPatterns.push(pattern.toString());
                }
            }
            
            // Apply base confidence
            if (confidence > 0) {
                confidence *= mapping.confidence;
            }
            
            // Update best match
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    category,
                    confidence,
                    method: 'rule-based',
                    reasoning: `Matched keywords: [${matchedKeywords.join(', ')}], patterns: [${matchedPatterns.join(', ')}]`,
                    matchedKeywords,
                    matchedPatterns
                };
            }
        }
        
        return bestMatch;
    }
    
    /**
     * AI-based categorization using language models
     */
    async aiBasedCategorization(item) {
        const availableCategories = Array.from(this.categories.keys()).concat(
            Object.keys(this.categoryMappings)
        );
        
        const prompt = this.buildCategorizationPrompt(item, availableCategories);
        
        try {
            const response = await this.aiProviderManager.generateSuggestion(prompt, {
                temperature: 0.3,
                maxTokens: 200
            });
            
            const result = this.parseAIResponse(response.suggestion);
            
            return {
                category: result.category,
                confidence: result.confidence,
                method: 'ai-based',
                reasoning: result.reasoning,
                provider: response.provider,
                model: response.model,
                cost: response.cost || 0
            };
            
        } catch (error) {
            console.error('❌ AI categorization failed:', error);
            return {
                category: 'uncategorized',
                confidence: 0,
                method: 'ai-error',
                reasoning: `AI categorization failed: ${error.message}`
            };
        }
    }
    
    /**
     * Build categorization prompt for AI
     */
    buildCategorizationPrompt(item, availableCategories) {
        const categoriesStr = availableCategories.join(', ');
        
        return `You are a smart categorization system. Analyze this item and suggest the most appropriate category.

Item Details:
- Name: ${item.core.name}
- Description: ${item.core.description || 'N/A'}
- Path/URL: ${item.core.path || item.core.url || 'N/A'}
- Type: ${item.core.type}

Available Categories: ${categoriesStr}

Please respond in this exact format:
Category: [category_name]
Confidence: [0.0-1.0]
Reasoning: [brief explanation]

Choose the most appropriate category from the available list. If none fit well, suggest 'uncategorized'.`;
    }
    
    /**
     * Parse AI response into structured result
     */
    parseAIResponse(response) {
        const lines = response.split('\n');
        let category = 'uncategorized';
        let confidence = 0;
        let reasoning = 'No reasoning provided';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('Category:')) {
                category = trimmed.replace('Category:', '').trim().toLowerCase();
            } else if (trimmed.startsWith('Confidence:')) {
                const confidenceStr = trimmed.replace('Confidence:', '').trim();
                confidence = parseFloat(confidenceStr) || 0;
            } else if (trimmed.startsWith('Reasoning:')) {
                reasoning = trimmed.replace('Reasoning:', '').trim();
            }
        }
        
        // Validate category
        if (!this.categories.has(category) && !this.categoryMappings[category]) {
            category = 'uncategorized';
            confidence = Math.min(confidence, 0.5);
        }
        
        return { category, confidence, reasoning };
    }
    
    /**
     * Categorize multiple items in batch
     */
    async categorizeItems(items) {
        const results = [];
        const batchSize = this.options.batchSize;
        
        console.log(`🔄 Categorizing ${items.length} items in batches of ${batchSize}`);
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            const batchResults = await Promise.allSettled(
                batch.map(item => this.categorizeItem(item))
            );
            
            // Process batch results
            for (let j = 0; j < batchResults.length; j++) {
                const result = batchResults[j];
                
                if (result.status === 'fulfilled') {
                    results.push({
                        item: batch[j],
                        categorization: result.value,
                        success: true
                    });
                } else {
                    results.push({
                        item: batch[j],
                        categorization: {
                            category: 'uncategorized',
                            confidence: 0,
                            method: 'batch-error',
                            reasoning: result.reason.message
                        },
                        success: false,
                        error: result.reason
                    });
                }
            }
            
            // Emit progress
            this.emit('batch-progress', {
                processed: Math.min(i + batchSize, items.length),
                total: items.length,
                percentage: Math.round((Math.min(i + batchSize, items.length) / items.length) * 100)
            });
            
            // Small delay to prevent overwhelming the AI provider
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }
    
    /**
     * Apply categorization results to items
     */
    async applyCategorization(results) {
        const updates = [];
        
        for (const result of results) {
            if (result.success && result.categorization.confidence >= this.options.confidenceThreshold) {
                const item = result.item;
                const category = result.categorization.category;
                
                // Update item metadata
                const updateData = {
                    category,
                    aiCategorization: {
                        confidence: result.categorization.confidence,
                        method: result.categorization.method,
                        reasoning: result.categorization.reasoning,
                        timestamp: Date.now()
                    }
                };
                
                updates.push({
                    itemId: item.id,
                    updateData
                });
            }
        }
        
        // Apply updates to data manager
        if (updates.length > 0) {
            console.log(`📝 Applying ${updates.length} categorization updates`);
            
            for (const update of updates) {
                await this.hybridDataManager.updateCustomData(update.itemId, update.updateData);
            }
        }
        
        return updates;
    }
    
    /**
     * Learn from user corrections
     */
    async learnFromCorrection(itemId, originalCategory, correctedCategory, userFeedback) {
        if (!this.options.enableLearning) {
            return;
        }
        
        // Store learning data
        const learningEntry = {
            itemId,
            originalCategory,
            correctedCategory,
            userFeedback,
            timestamp: Date.now()
        };
        
        const itemKey = `item_${itemId}`;
        if (!this.learningData.has(itemKey)) {
            this.learningData.set(itemKey, []);
        }
        
        this.learningData.get(itemKey).push(learningEntry);
        
        // Update statistics
        this.statistics.userCorrections++;
        
        // Emit learning event
        this.emit('learning-update', learningEntry);
        
        console.log(`📚 Learning from correction: ${originalCategory} → ${correctedCategory}`);
    }
    
    /**
     * Get categorization statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            totalCategories: this.categories.size,
            cacheSize: this.categorizationCache.size,
            learningEntries: this.learningData.size,
            accuracy: this.statistics.userCorrections > 0 ? 
                (this.statistics.correctPredictions / (this.statistics.correctPredictions + this.statistics.userCorrections)) : 0
        };
    }
    
    /**
     * Get cache key for item
     */
    getCacheKey(item) {
        return `${item.core.name}_${item.core.type}_${item.core.path || item.core.url || ''}`;
    }
    
    /**
     * Clear categorization cache
     */
    clearCache() {
        this.categorizationCache.clear();
        console.log('🗑️ Categorization cache cleared');
    }
    
    /**
     * Export categorization data
     */
    exportData() {
        return {
            categories: Object.fromEntries(this.categories),
            statistics: this.statistics,
            learningData: Object.fromEntries(this.learningData),
            timestamp: Date.now()
        };
    }
    
    /**
     * Import categorization data
     */
    async importData(data) {
        if (data.categories) {
            this.categories = new Map(Object.entries(data.categories));
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        if (data.learningData) {
            this.learningData = new Map(Object.entries(data.learningData));
        }
        
        console.log('📥 Categorization data imported');
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        this.categories.clear();
        this.categorizationCache.clear();
        this.learningData.clear();
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Smart Categorization Engine cleanup complete');
    }
}

module.exports = SmartCategorizationEngine;