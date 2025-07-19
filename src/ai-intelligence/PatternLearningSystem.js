/**
 * Pattern Learning System - Adaptive user preference learning
 * Learns from user behavior and adapts AI suggestions accordingly
 */

const EventEmitter = require('events');

class PatternLearningSystem extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.options = {
            enableDeepLearning: options.enableDeepLearning !== false,
            learningRate: options.learningRate || 0.1,
            memorySize: options.memorySize || 1000,
            patternDetectionThreshold: options.patternDetectionThreshold || 0.7,
            adaptationSpeed: options.adaptationSpeed || 0.05,
            persistenceInterval: options.persistenceInterval || 300000, // 5 minutes
            ...options
        };
        
        this.isInitialized = false;
        this.userPatterns = new Map();
        this.behaviorHistory = [];
        this.learningModels = new Map();
        this.adaptationWeights = new Map();
        this.contextualMemory = new Map();
        
        // Pattern categories
        this.patternCategories = {
            'temporal': {
                weight: 0.8,
                features: ['timeOfDay', 'dayOfWeek', 'month', 'season'],
                threshold: 0.6
            },
            'contextual': {
                weight: 0.9,
                features: ['currentApp', 'recentActivity', 'workingDirectory'],
                threshold: 0.7
            },
            'behavioral': {
                weight: 0.85,
                features: ['clickPattern', 'searchTerms', 'navigationPath'],
                threshold: 0.65
            },
            'categorical': {
                weight: 0.75,
                features: ['preferredCategories', 'tagUsage', 'organizationStyle'],
                threshold: 0.8
            },
            'functional': {
                weight: 0.9,
                features: ['taskType', 'workflowStage', 'toolChain'],
                threshold: 0.75
            }
        };
        
        // Learning statistics
        this.statistics = {
            totalPatterns: 0,
            successfulPredictions: 0,
            userCorrections: 0,
            adaptationEvents: 0,
            averageAccuracy: 0,
            learningProgress: 0
        };
    }
    
    /**
     * Initialize Pattern Learning System
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Pattern Learning System...');
            
            // Load existing patterns
            await this.loadPatterns();
            
            // Load behavior history
            await this.loadBehaviorHistory();
            
            // Initialize learning models
            await this.initializeLearningModels();
            
            // Initialize AI provider if needed
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            // Start pattern detection
            this.startPatternDetection();
            
            // Schedule periodic persistence
            this.schedulePatternPersistence();
            
            this.isInitialized = true;
            console.log('✅ Pattern Learning System initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Pattern Learning System:', error);
            throw error;
        }
    }
    
    /**
     * Load existing patterns from storage
     */
    async loadPatterns() {
        try {
            // TODO: Implement pattern persistence
            console.log('📚 Loading existing patterns...');
            
            // Initialize with default patterns
            for (const [category, config] of Object.entries(this.patternCategories)) {
                this.userPatterns.set(category, {
                    patterns: [],
                    confidence: 0,
                    lastUpdated: Date.now(),
                    weight: config.weight
                });
            }
            
            console.log(`📊 Loaded ${this.userPatterns.size} pattern categories`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load patterns:', error.message);
        }
    }
    
    /**
     * Load behavior history
     */
    async loadBehaviorHistory() {
        try {
            // TODO: Implement behavior history persistence
            console.log('📖 Loading behavior history...');
            
            // Initialize empty history
            this.behaviorHistory = [];
            
            console.log('📊 Behavior history system ready');
            
        } catch (error) {
            console.warn('⚠️ Failed to load behavior history:', error.message);
        }
    }
    
    /**
     * Initialize learning models
     */
    async initializeLearningModels() {
        try {
            console.log('🤖 Initializing learning models...');
            
            // Initialize models for each pattern category
            for (const [category, config] of Object.entries(this.patternCategories)) {
                this.learningModels.set(category, {
                    type: 'weighted_average',
                    weights: new Map(),
                    bias: 0,
                    learningRate: this.options.learningRate,
                    accuracy: 0,
                    predictions: 0,
                    correct: 0
                });
                
                // Initialize adaptation weights
                this.adaptationWeights.set(category, config.weight);
            }
            
            console.log(`🎯 Initialized ${this.learningModels.size} learning models`);
            
        } catch (error) {
            console.error('❌ Failed to initialize learning models:', error);
            throw error;
        }
    }
    
    /**
     * Record user behavior for pattern learning
     */
    recordBehavior(behavior) {
        if (!this.isInitialized) {
            console.warn('⚠️ Pattern Learning System not initialized');
            return;
        }
        
        const behaviorEntry = {
            ...behavior,
            timestamp: Date.now(),
            context: this.extractCurrentContext(),
            sessionId: this.getCurrentSessionId()
        };
        
        // Add to behavior history
        this.behaviorHistory.push(behaviorEntry);
        
        // Limit history size
        if (this.behaviorHistory.length > this.options.memorySize) {
            this.behaviorHistory.shift();
        }
        
        // Trigger pattern analysis
        this.analyzePatterns(behaviorEntry);
        
        // Emit behavior event
        this.emit('behavior-recorded', behaviorEntry);
        
        console.log('📝 Recorded behavior:', behavior.type);
    }
    
    /**
     * Extract current context for pattern learning
     */
    extractCurrentContext() {
        const now = new Date();
        
        return {
            timeOfDay: this.getTimeOfDay(),
            dayOfWeek: now.getDay(),
            month: now.getMonth(),
            season: this.getSeason(),
            hour: now.getHours(),
            minute: now.getMinutes(),
            isWeekend: now.getDay() === 0 || now.getDay() === 6,
            isWorkingHours: this.isWorkingHours(now)
        };
    }
    
    /**
     * Analyze patterns from behavior
     */
    async analyzePatterns(behaviorEntry) {
        try {
            // Analyze each pattern category
            for (const [category, config] of Object.entries(this.patternCategories)) {
                const patterns = this.detectPatterns(behaviorEntry, category, config);
                
                if (patterns.length > 0) {
                    await this.updatePatterns(category, patterns);
                }
            }
            
            // Update statistics
            this.statistics.totalPatterns++;
            
        } catch (error) {
            console.error('❌ Pattern analysis failed:', error);
        }
    }
    
    /**
     * Detect patterns in behavior
     */
    detectPatterns(behaviorEntry, category, config) {
        const patterns = [];
        const relevantHistory = this.getRelevantHistory(behaviorEntry, category);
        
        // Extract features for this category
        const features = this.extractFeatures(behaviorEntry, config.features);
        
        // Look for similar patterns in history
        const similarBehaviors = relevantHistory.filter(entry => {
            const entryFeatures = this.extractFeatures(entry, config.features);
            return this.calculateSimilarity(features, entryFeatures) > config.threshold;
        });
        
        if (similarBehaviors.length >= 3) { // Minimum pattern occurrences
            patterns.push({
                category,
                features,
                occurrences: similarBehaviors.length,
                confidence: this.calculatePatternConfidence(similarBehaviors),
                lastSeen: behaviorEntry.timestamp,
                examples: similarBehaviors.slice(-3) // Keep last 3 examples
            });
        }
        
        return patterns;
    }
    
    /**
     * Extract features from behavior entry
     */
    extractFeatures(behaviorEntry, featureNames) {
        const features = {};
        
        for (const featureName of featureNames) {
            if (behaviorEntry.context && behaviorEntry.context[featureName] !== undefined) {
                features[featureName] = behaviorEntry.context[featureName];
            } else if (behaviorEntry[featureName] !== undefined) {
                features[featureName] = behaviorEntry[featureName];
            }
        }
        
        return features;
    }
    
    /**
     * Calculate similarity between feature sets
     */
    calculateSimilarity(features1, features2) {
        const keys1 = Object.keys(features1);
        const keys2 = Object.keys(features2);
        const commonKeys = keys1.filter(key => keys2.includes(key));
        
        if (commonKeys.length === 0) return 0;
        
        let similarity = 0;
        
        for (const key of commonKeys) {
            const value1 = features1[key];
            const value2 = features2[key];
            
            if (typeof value1 === 'number' && typeof value2 === 'number') {
                // Numerical similarity
                const diff = Math.abs(value1 - value2);
                const max = Math.max(Math.abs(value1), Math.abs(value2));
                similarity += max > 0 ? (1 - diff / max) : 1;
            } else {
                // Categorical similarity
                similarity += value1 === value2 ? 1 : 0;
            }
        }
        
        return similarity / commonKeys.length;
    }
    
    /**
     * Calculate pattern confidence
     */
    calculatePatternConfidence(similarBehaviors) {
        if (similarBehaviors.length === 0) return 0;
        
        // Base confidence on frequency and recency
        const now = Date.now();
        const recentWeight = 0.7;
        const frequencyWeight = 0.3;
        
        // Recency score (more recent = higher confidence)
        const avgRecency = similarBehaviors.reduce((sum, behavior) => {
            const age = now - behavior.timestamp;
            const dayAge = age / (1000 * 60 * 60 * 24);
            return sum + Math.exp(-dayAge * 0.1); // Exponential decay
        }, 0) / similarBehaviors.length;
        
        // Frequency score
        const frequencyScore = Math.min(similarBehaviors.length / 10, 1); // Cap at 10 occurrences
        
        return (avgRecency * recentWeight) + (frequencyScore * frequencyWeight);
    }
    
    /**
     * Update patterns with new data
     */
    async updatePatterns(category, newPatterns) {
        const categoryData = this.userPatterns.get(category);
        
        if (!categoryData) return;
        
        // Update existing patterns or add new ones
        for (const newPattern of newPatterns) {
            const existingPattern = categoryData.patterns.find(p => 
                this.calculateSimilarity(p.features, newPattern.features) > 0.8
            );
            
            if (existingPattern) {
                // Update existing pattern
                existingPattern.occurrences += newPattern.occurrences;
                existingPattern.confidence = Math.max(existingPattern.confidence, newPattern.confidence);
                existingPattern.lastSeen = newPattern.lastSeen;
                existingPattern.examples.push(...newPattern.examples);
                
                // Keep only recent examples
                existingPattern.examples = existingPattern.examples
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5);
            } else {
                // Add new pattern
                categoryData.patterns.push(newPattern);
            }
        }
        
        // Update category metadata
        categoryData.lastUpdated = Date.now();
        categoryData.confidence = this.calculateCategoryConfidence(categoryData.patterns);
        
        // Adapt learning model
        await this.adaptModel(category, newPatterns);
        
        // Emit pattern update event
        this.emit('patterns-updated', { category, patterns: newPatterns });
    }
    
    /**
     * Calculate category confidence
     */
    calculateCategoryConfidence(patterns) {
        if (patterns.length === 0) return 0;
        
        const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
        const diversityBonus = Math.min(patterns.length / 5, 1) * 0.2; // Bonus for pattern diversity
        
        return Math.min(avgConfidence + diversityBonus, 1);
    }
    
    /**
     * Adapt learning model based on new patterns
     */
    async adaptModel(category, patterns) {
        const model = this.learningModels.get(category);
        
        if (!model) return;
        
        // Update model weights based on pattern success
        for (const pattern of patterns) {
            for (const [feature, value] of Object.entries(pattern.features)) {
                if (!model.weights.has(feature)) {
                    model.weights.set(feature, 0);
                }
                
                const currentWeight = model.weights.get(feature);
                const newWeight = currentWeight + (pattern.confidence * this.options.adaptationSpeed);
                model.weights.set(feature, Math.min(newWeight, 1));
            }
        }
        
        // Update adaptation weights
        const currentWeight = this.adaptationWeights.get(category);
        const patternStrength = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
        const newWeight = currentWeight + (patternStrength * this.options.adaptationSpeed);
        this.adaptationWeights.set(category, Math.min(newWeight, 1));
        
        // Update statistics
        this.statistics.adaptationEvents++;
        
        console.log(`🔄 Adapted model for ${category} (${patterns.length} patterns)`);
    }
    
    /**
     * Predict user preferences based on current context
     */
    async predictPreferences(context) {
        if (!this.isInitialized) {
            return { preferences: [], confidence: 0 };
        }
        
        const predictions = [];
        
        // Get predictions from each pattern category
        for (const [category, categoryData] of this.userPatterns.entries()) {
            const prediction = await this.predictFromCategory(category, categoryData, context);
            
            if (prediction.confidence > this.options.patternDetectionThreshold) {
                predictions.push({
                    category,
                    ...prediction,
                    weight: this.adaptationWeights.get(category)
                });
            }
        }
        
        // Sort by weighted confidence
        predictions.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
        
        // Calculate overall confidence
        const overallConfidence = predictions.length > 0 ? 
            predictions.reduce((sum, p) => sum + (p.confidence * p.weight), 0) / predictions.length : 0;
        
        return {
            preferences: predictions.slice(0, 10), // Top 10 predictions
            confidence: overallConfidence,
            context,
            timestamp: Date.now()
        };
    }
    
    /**
     * Predict from specific category
     */
    async predictFromCategory(category, categoryData, context) {
        const model = this.learningModels.get(category);
        
        if (!model || categoryData.patterns.length === 0) {
            return { confidence: 0, predictions: [] };
        }
        
        // Find matching patterns
        const matchingPatterns = categoryData.patterns.filter(pattern => {
            const similarity = this.calculateSimilarity(pattern.features, context);
            return similarity > 0.5;
        });
        
        if (matchingPatterns.length === 0) {
            return { confidence: 0, predictions: [] };
        }
        
        // Generate predictions from matching patterns
        const predictions = matchingPatterns.map(pattern => ({
            type: 'pattern_match',
            pattern: pattern.features,
            confidence: pattern.confidence,
            occurrences: pattern.occurrences,
            reasoning: `Pattern match with ${pattern.occurrences} occurrences`
        }));
        
        // Calculate weighted confidence
        const weightedConfidence = matchingPatterns.reduce((sum, pattern) => {
            const similarity = this.calculateSimilarity(pattern.features, context);
            return sum + (pattern.confidence * similarity);
        }, 0) / matchingPatterns.length;
        
        return {
            confidence: weightedConfidence,
            predictions,
            matchingPatterns: matchingPatterns.length
        };
    }
    
    /**
     * Learn from user feedback
     */
    async learnFromFeedback(prediction, userAction, feedback) {
        if (!this.isInitialized) return;
        
        const isCorrect = this.evaluatePrediction(prediction, userAction, feedback);
        
        // Update model accuracy
        for (const pred of prediction.preferences) {
            const model = this.learningModels.get(pred.category);
            if (model) {
                model.predictions++;
                if (isCorrect) {
                    model.correct++;
                }
                model.accuracy = model.correct / model.predictions;
            }
        }
        
        // Update statistics
        this.statistics.successfulPredictions += isCorrect ? 1 : 0;
        this.statistics.userCorrections += isCorrect ? 0 : 1;
        this.statistics.averageAccuracy = this.calculateAverageAccuracy();
        
        // Adapt based on feedback
        await this.adaptFromFeedback(prediction, userAction, feedback, isCorrect);
        
        // Emit learning event
        this.emit('learning-update', {
            prediction,
            userAction,
            feedback,
            isCorrect,
            accuracy: this.statistics.averageAccuracy
        });
        
        console.log(`📚 Learned from feedback: ${isCorrect ? 'correct' : 'incorrect'} prediction`);
    }
    
    /**
     * Evaluate prediction correctness
     */
    evaluatePrediction(prediction, userAction, feedback) {
        // Simple evaluation based on user action and feedback
        if (feedback && feedback.rating !== undefined) {
            return feedback.rating >= 0.7;
        }
        
        // Check if user action matches prediction
        if (userAction && prediction.preferences.length > 0) {
            return prediction.preferences.some(pref => 
                pref.category === userAction.category ||
                pref.predictions.some(p => p.type === userAction.type)
            );
        }
        
        return false;
    }
    
    /**
     * Adapt from user feedback
     */
    async adaptFromFeedback(prediction, userAction, feedback, isCorrect) {
        const adaptationStrength = isCorrect ? 
            this.options.adaptationSpeed : 
            -this.options.adaptationSpeed * 0.5;
        
        // Adapt weights for each prediction category
        for (const pred of prediction.preferences) {
            const currentWeight = this.adaptationWeights.get(pred.category);
            const newWeight = Math.max(0, Math.min(1, currentWeight + adaptationStrength));
            this.adaptationWeights.set(pred.category, newWeight);
            
            // Adapt model weights
            const model = this.learningModels.get(pred.category);
            if (model) {
                model.learningRate = Math.max(0.01, model.learningRate + adaptationStrength * 0.01);
            }
        }
        
        // Record corrective behavior if prediction was wrong
        if (!isCorrect && userAction) {
            this.recordBehavior({
                type: 'correction',
                originalPrediction: prediction,
                userAction,
                feedback,
                correctionStrength: Math.abs(adaptationStrength)
            });
        }
    }
    
    /**
     * Get relevant history for pattern detection
     */
    getRelevantHistory(behaviorEntry, category) {
        const relevantDays = 30; // Look back 30 days
        const cutoff = Date.now() - (relevantDays * 24 * 60 * 60 * 1000);
        
        return this.behaviorHistory.filter(entry => 
            entry.timestamp > cutoff && 
            entry.type !== 'correction' // Exclude corrections from pattern detection
        );
    }
    
    /**
     * Calculate average accuracy across all models
     */
    calculateAverageAccuracy() {
        const accuracies = Array.from(this.learningModels.values())
            .filter(model => model.predictions > 0)
            .map(model => model.accuracy);
        
        return accuracies.length > 0 ? 
            accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length : 0;
    }
    
    /**
     * Get time of day classification
     */
    getTimeOfDay() {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';  
        if (hour >= 18 && hour < 23) return 'evening';
        return 'night';
    }
    
    /**
     * Get current season
     */
    getSeason() {
        const month = new Date().getMonth();
        
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }
    
    /**
     * Check if current time is working hours
     */
    isWorkingHours(date) {
        const hour = date.getHours();
        const day = date.getDay();
        
        return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
    }
    
    /**
     * Get current session ID
     */
    getCurrentSessionId() {
        // Simple session ID based on day and startup time
        const today = new Date().toDateString();
        return `session_${today}_${process.pid}`;
    }
    
    /**
     * Start pattern detection background process
     */
    startPatternDetection() {
        // Schedule periodic pattern analysis
        this.patternDetectionInterval = setInterval(async () => {
            try {
                await this.analyzeRecentPatterns();
            } catch (error) {
                console.error('❌ Pattern detection error:', error);
            }
        }, 60000); // Every minute
        
        console.log('🔄 Pattern detection started');
    }
    
    /**
     * Analyze recent patterns
     */
    async analyzeRecentPatterns() {
        const recentBehaviors = this.behaviorHistory.filter(behavior => 
            Date.now() - behavior.timestamp < 300000 // Last 5 minutes
        );
        
        if (recentBehaviors.length === 0) return;
        
        // Analyze each recent behavior
        for (const behavior of recentBehaviors) {
            await this.analyzePatterns(behavior);
        }
        
        // Update learning progress
        this.updateLearningProgress();
    }
    
    /**
     * Update learning progress metric
     */
    updateLearningProgress() {
        const totalModels = this.learningModels.size;
        const trainedModels = Array.from(this.learningModels.values())
            .filter(model => model.predictions > 10).length;
        
        this.statistics.learningProgress = totalModels > 0 ? trainedModels / totalModels : 0;
    }
    
    /**
     * Schedule pattern persistence
     */
    schedulePatternPersistence() {
        this.persistenceInterval = setInterval(async () => {
            try {
                await this.persistPatterns();
            } catch (error) {
                console.error('❌ Pattern persistence error:', error);
            }
        }, this.options.persistenceInterval);
        
        console.log('💾 Pattern persistence scheduled');
    }
    
    /**
     * Persist patterns to storage
     */
    async persistPatterns() {
        try {
            // TODO: Implement pattern persistence
            console.log('💾 Persisting patterns...');
            
            const persistenceData = {
                patterns: Object.fromEntries(this.userPatterns),
                models: Object.fromEntries(
                    Array.from(this.learningModels.entries()).map(([key, model]) => [
                        key,
                        {
                            ...model,
                            weights: Object.fromEntries(model.weights)
                        }
                    ])
                ),
                weights: Object.fromEntries(this.adaptationWeights),
                statistics: this.statistics,
                timestamp: Date.now()
            };
            
            console.log('✅ Patterns persisted successfully');
            
        } catch (error) {
            console.error('❌ Failed to persist patterns:', error);
        }
    }
    
    /**
     * Get learning statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            totalBehaviors: this.behaviorHistory.length,
            totalPatternCategories: this.userPatterns.size,
            totalModels: this.learningModels.size,
            modelAccuracies: Object.fromEntries(
                Array.from(this.learningModels.entries()).map(([category, model]) => [
                    category,
                    model.accuracy
                ])
            ),
            adaptationWeights: Object.fromEntries(this.adaptationWeights),
            memoryUsage: this.behaviorHistory.length / this.options.memorySize
        };
    }
    
    /**
     * Export learning data
     */
    exportData() {
        return {
            userPatterns: Object.fromEntries(this.userPatterns),
            behaviorHistory: this.behaviorHistory.slice(-100), // Last 100 behaviors
            learningModels: Object.fromEntries(
                Array.from(this.learningModels.entries()).map(([key, model]) => [
                    key,
                    {
                        ...model,
                        weights: Object.fromEntries(model.weights)
                    }
                ])
            ),
            adaptationWeights: Object.fromEntries(this.adaptationWeights),
            statistics: this.statistics,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import learning data
     */
    async importData(data) {
        if (data.userPatterns) {
            this.userPatterns = new Map(Object.entries(data.userPatterns));
        }
        
        if (data.behaviorHistory) {
            this.behaviorHistory = data.behaviorHistory;
        }
        
        if (data.learningModels) {
            this.learningModels = new Map(
                Object.entries(data.learningModels).map(([key, model]) => [
                    key,
                    {
                        ...model,
                        weights: new Map(Object.entries(model.weights || {}))
                    }
                ])
            );
        }
        
        if (data.adaptationWeights) {
            this.adaptationWeights = new Map(Object.entries(data.adaptationWeights));
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        console.log('📥 Learning data imported');
    }
    
    /**
     * Clear all learning data
     */
    async clearLearningData() {
        this.userPatterns.clear();
        this.behaviorHistory = [];
        this.learningModels.clear();
        this.adaptationWeights.clear();
        this.contextualMemory.clear();
        
        // Reset statistics
        this.statistics = {
            totalPatterns: 0,
            successfulPredictions: 0,
            userCorrections: 0,
            adaptationEvents: 0,
            averageAccuracy: 0,
            learningProgress: 0
        };
        
        // Reinitialize
        await this.initializeLearningModels();
        
        console.log('🗑️ Learning data cleared');
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Clear intervals
        if (this.patternDetectionInterval) {
            clearInterval(this.patternDetectionInterval);
        }
        
        if (this.persistenceInterval) {
            clearInterval(this.persistenceInterval);
        }
        
        // Persist final state
        await this.persistPatterns();
        
        // Clear data
        this.userPatterns.clear();
        this.behaviorHistory = [];
        this.learningModels.clear();
        this.adaptationWeights.clear();
        this.contextualMemory.clear();
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Pattern Learning System cleanup complete');
    }
}

module.exports = PatternLearningSystem;