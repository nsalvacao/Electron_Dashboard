/**
 * Usage Analytics - AI-powered insights and analytics
 * Provides comprehensive usage analytics with AI-driven insights
 */

const EventEmitter = require('events');

class UsageAnalytics extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, patternLearningSystem, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.patternLearningSystem = patternLearningSystem;
        this.options = {
            enableRealTimeAnalysis: options.enableRealTimeAnalysis !== false,
            analyticsRetentionDays: options.analyticsRetentionDays || 90,
            insightGenerationInterval: options.insightGenerationInterval || 3600000, // 1 hour
            batchAnalysisSize: options.batchAnalysisSize || 100,
            enablePredictiveAnalytics: options.enablePredictiveAnalytics !== false,
            ...options
        };
        
        this.isInitialized = false;
        this.usageData = new Map();
        this.analyticsCache = new Map();
        this.insights = new Map();
        this.metrics = new Map();
        
        // Analytics categories
        this.analyticsCategories = {
            'usage_patterns': {
                name: 'Usage Patterns',
                description: 'Analyze how applications and bookmarks are used',
                metrics: ['frequency', 'duration', 'time_distribution', 'context_usage']
            },
            'productivity': {
                name: 'Productivity Analysis',
                description: 'Measure productivity and efficiency metrics',
                metrics: ['focus_time', 'task_switching', 'tool_efficiency', 'workflow_optimization']
            },
            'trends': {
                name: 'Trend Analysis',
                description: 'Identify trends and changes over time',
                metrics: ['usage_growth', 'category_trends', 'seasonal_patterns', 'adoption_rates']
            },
            'optimization': {
                name: 'Optimization Insights',
                description: 'Suggest optimizations and improvements',
                metrics: ['unused_items', 'duplicate_workflows', 'efficiency_gaps', 'organization_issues']
            },
            'behavior': {
                name: 'Behavioral Analysis',
                description: 'Understand user behavior patterns',
                metrics: ['navigation_patterns', 'preference_evolution', 'learning_curve', 'habit_formation']
            }
        };
        
        // Statistics
        this.statistics = {
            totalEvents: 0,
            analyticsGenerated: 0,
            insightsGenerated: 0,
            lastAnalysisTime: 0,
            averageAnalysisTime: 0
        };
    }
    
    /**
     * Initialize Usage Analytics
     */
    async initialize() {
        try {
            console.log('📊 Initializing Usage Analytics...');
            
            // Initialize AI provider if needed
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            // Initialize pattern learning system if needed
            if (!this.patternLearningSystem.isInitialized) {
                await this.patternLearningSystem.initialize();
            }
            
            // Load existing usage data
            await this.loadUsageData();
            
            // Initialize metric calculators
            this.initializeMetrics();
            
            // Start real-time analysis if enabled
            if (this.options.enableRealTimeAnalysis) {
                this.startRealTimeAnalysis();
            }
            
            // Schedule periodic insight generation
            this.scheduleInsightGeneration();
            
            this.isInitialized = true;
            console.log('✅ Usage Analytics initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Usage Analytics:', error);
            throw error;
        }
    }
    
    /**
     * Load existing usage data
     */
    async loadUsageData() {
        try {
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            // Extract usage data from items
            for (const item of allItems) {
                if (item.metadata?.usage) {
                    this.usageData.set(item.id, {
                        ...item.metadata.usage,
                        itemId: item.id,
                        itemType: item.core.type,
                        itemName: item.core.name,
                        category: item.metadata.merged?.category || 'uncategorized'
                    });
                }
            }
            
            console.log(`📈 Loaded usage data for ${this.usageData.size} items`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load usage data:', error.message);
        }
    }
    
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        // Initialize metric calculators
        this.metrics.set('usage_frequency', this.calculateUsageFrequency.bind(this));
        this.metrics.set('time_distribution', this.calculateTimeDistribution.bind(this));
        this.metrics.set('category_distribution', this.calculateCategoryDistribution.bind(this));
        this.metrics.set('productivity_score', this.calculateProductivityScore.bind(this));
        this.metrics.set('efficiency_metrics', this.calculateEfficiencyMetrics.bind(this));
        this.metrics.set('trend_analysis', this.calculateTrendAnalysis.bind(this));
        this.metrics.set('behavioral_patterns', this.calculateBehavioralPatterns.bind(this));
        
        console.log(`🎯 Initialized ${this.metrics.size} metric calculators`);
    }
    
    /**
     * Record usage event
     */
    recordUsageEvent(event) {
        if (!this.isInitialized) {
            console.warn('⚠️ Usage Analytics not initialized');
            return;
        }
        
        const usageEvent = {
            ...event,
            timestamp: Date.now(),
            id: this.generateEventId()
        };
        
        // Update usage data
        const itemId = event.itemId;
        if (!this.usageData.has(itemId)) {
            this.usageData.set(itemId, {
                itemId: itemId,
                itemType: event.itemType,
                itemName: event.itemName,
                category: event.category || 'uncategorized',
                frequency: 0,
                totalDuration: 0,
                lastUsed: 0,
                timeOfDay: [],
                dayOfWeek: [],
                context: []
            });
        }
        
        const usage = this.usageData.get(itemId);
        
        // Update usage metrics
        usage.frequency++;
        usage.totalDuration += event.duration || 0;
        usage.lastUsed = usageEvent.timestamp;
        
        // Update time patterns
        const hour = new Date(usageEvent.timestamp).getHours();
        const day = new Date(usageEvent.timestamp).getDay();
        
        usage.timeOfDay.push(hour);
        usage.dayOfWeek.push(day);
        
        // Limit pattern arrays
        if (usage.timeOfDay.length > 100) {
            usage.timeOfDay = usage.timeOfDay.slice(-100);
        }
        if (usage.dayOfWeek.length > 100) {
            usage.dayOfWeek = usage.dayOfWeek.slice(-100);
        }
        
        // Update context
        if (event.context) {
            usage.context.push(event.context);
            if (usage.context.length > 50) {
                usage.context = usage.context.slice(-50);
            }
        }
        
        // Update statistics
        this.statistics.totalEvents++;
        
        // Emit usage event
        this.emit('usage-recorded', usageEvent);
        
        // Trigger real-time analysis if enabled
        if (this.options.enableRealTimeAnalysis) {
            this.analyzeUsageEvent(usageEvent);
        }
        
        console.log(`📊 Recorded usage event: ${event.itemName} (${event.eventType})`);
    }
    
    /**
     * Generate comprehensive analytics report
     */
    async generateAnalyticsReport(options = {}) {
        const startTime = Date.now();
        
        try {
            console.log('📊 Generating analytics report...');
            
            const report = {
                timestamp: Date.now(),
                period: options.period || 'all_time',
                categories: {},
                summary: {},
                insights: [],
                recommendations: []
            };
            
            // Generate analytics for each category
            for (const [categoryId, category] of Object.entries(this.analyticsCategories)) {
                const categoryAnalytics = await this.generateCategoryAnalytics(categoryId, category, options);
                report.categories[categoryId] = categoryAnalytics;
            }
            
            // Generate summary
            report.summary = this.generateSummary(report.categories);
            
            // Generate AI insights
            if (this.aiProviderManager.isInitialized) {
                report.insights = await this.generateAIInsights(report);
            }
            
            // Generate recommendations
            report.recommendations = await this.generateRecommendations(report);
            
            // Cache report
            this.analyticsCache.set('latest_report', report);
            
            // Update statistics
            this.statistics.analyticsGenerated++;
            this.statistics.lastAnalysisTime = Date.now();
            this.statistics.averageAnalysisTime = 
                (this.statistics.averageAnalysisTime * (this.statistics.analyticsGenerated - 1) + 
                 (Date.now() - startTime)) / this.statistics.analyticsGenerated;
            
            console.log(`✅ Analytics report generated in ${Date.now() - startTime}ms`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Failed to generate analytics report:', error);
            throw error;
        }
    }
    
    /**
     * Generate category analytics
     */
    async generateCategoryAnalytics(categoryId, category, options) {
        const analytics = {
            name: category.name,
            description: category.description,
            metrics: {},
            trends: {},
            patterns: {}
        };
        
        // Calculate metrics for this category
        for (const metricName of category.metrics) {
            const metricCalculator = this.metrics.get(metricName);
            if (metricCalculator) {
                try {
                    analytics.metrics[metricName] = await metricCalculator(options);
                } catch (error) {
                    console.warn(`⚠️ Failed to calculate metric ${metricName}:`, error.message);
                    analytics.metrics[metricName] = null;
                }
            }
        }
        
        return analytics;
    }
    
    /**
     * Calculate usage frequency metrics
     */
    async calculateUsageFrequency(options) {
        const frequencies = Array.from(this.usageData.values()).map(usage => usage.frequency);
        
        return {
            average: frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length || 0,
            median: this.calculateMedian(frequencies),
            min: Math.min(...frequencies) || 0,
            max: Math.max(...frequencies) || 0,
            distribution: this.calculateDistribution(frequencies),
            totalUsage: frequencies.reduce((sum, freq) => sum + freq, 0)
        };
    }
    
    /**
     * Calculate time distribution metrics
     */
    async calculateTimeDistribution(options) {
        const hourDistribution = new Array(24).fill(0);
        const dayDistribution = new Array(7).fill(0);
        
        for (const usage of this.usageData.values()) {
            for (const hour of usage.timeOfDay) {
                hourDistribution[hour]++;
            }
            for (const day of usage.dayOfWeek) {
                dayDistribution[day]++;
            }
        }
        
        return {
            byHour: hourDistribution,
            byDay: dayDistribution,
            peakHour: hourDistribution.indexOf(Math.max(...hourDistribution)),
            peakDay: dayDistribution.indexOf(Math.max(...dayDistribution)),
            totalEvents: hourDistribution.reduce((sum, count) => sum + count, 0)
        };
    }
    
    /**
     * Calculate category distribution
     */
    async calculateCategoryDistribution(options) {
        const categoryCount = new Map();
        const categoryUsage = new Map();
        
        for (const usage of this.usageData.values()) {
            const category = usage.category;
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            categoryUsage.set(category, (categoryUsage.get(category) || 0) + usage.frequency);
        }
        
        return {
            itemCount: Object.fromEntries(categoryCount),
            usageCount: Object.fromEntries(categoryUsage),
            totalCategories: categoryCount.size,
            mostUsedCategory: Array.from(categoryUsage.entries())
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
        };
    }
    
    /**
     * Calculate productivity score
     */
    async calculateProductivityScore(options) {
        const productivityCategories = ['development', 'productivity', 'work'];
        const entertainmentCategories = ['entertainment', 'games', 'social'];
        
        let productiveUsage = 0;
        let entertainmentUsage = 0;
        let totalUsage = 0;
        
        for (const usage of this.usageData.values()) {
            const category = usage.category.toLowerCase();
            
            if (productivityCategories.includes(category)) {
                productiveUsage += usage.frequency;
            } else if (entertainmentCategories.includes(category)) {
                entertainmentUsage += usage.frequency;
            }
            
            totalUsage += usage.frequency;
        }
        
        const productivityScore = totalUsage > 0 ? (productiveUsage / totalUsage) * 100 : 0;
        const entertainmentScore = totalUsage > 0 ? (entertainmentUsage / totalUsage) * 100 : 0;
        
        return {
            productivityScore: Math.round(productivityScore),
            entertainmentScore: Math.round(entertainmentScore),
            balanceScore: Math.round(100 - Math.abs(productivityScore - entertainmentScore)),
            productiveUsage,
            entertainmentUsage,
            totalUsage
        };
    }
    
    /**
     * Calculate efficiency metrics
     */
    async calculateEfficiencyMetrics(options) {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const recentThreshold = now - (7 * dayMs); // Last 7 days
        
        let recentItems = 0;
        let totalItems = 0;
        let avgTimeBetweenUses = 0;
        let unusedItems = 0;
        
        for (const usage of this.usageData.values()) {
            totalItems++;
            
            if (usage.lastUsed > recentThreshold) {
                recentItems++;
            }
            
            if (usage.frequency === 0) {
                unusedItems++;
            }
            
            if (usage.frequency > 1) {
                avgTimeBetweenUses += (now - usage.lastUsed) / usage.frequency;
            }
        }
        
        return {
            utilizationRate: totalItems > 0 ? (recentItems / totalItems) * 100 : 0,
            unusedItemsPercentage: totalItems > 0 ? (unusedItems / totalItems) * 100 : 0,
            averageTimeBetweenUses: avgTimeBetweenUses / Math.max(totalItems - unusedItems, 1),
            activeItems: recentItems,
            totalItems,
            unusedItems
        };
    }
    
    /**
     * Calculate trend analysis
     */
    async calculateTrendAnalysis(options) {
        const trends = {
            usageGrowth: [],
            categoryTrends: {},
            seasonalPatterns: {},
            adoptionRates: {}
        };
        
        // Calculate usage growth over time
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const periods = 30; // Last 30 days
        
        for (let i = 0; i < periods; i++) {
            const periodStart = now - ((i + 1) * dayMs);
            const periodEnd = now - (i * dayMs);
            
            let periodUsage = 0;
            for (const usage of this.usageData.values()) {
                if (usage.lastUsed >= periodStart && usage.lastUsed < periodEnd) {
                    periodUsage += usage.frequency;
                }
            }
            
            trends.usageGrowth.unshift({
                period: i,
                date: new Date(periodStart).toDateString(),
                usage: periodUsage
            });
        }
        
        return trends;
    }
    
    /**
     * Calculate behavioral patterns
     */
    async calculateBehavioralPatterns(options) {
        const patterns = {
            navigationPatterns: {},
            preferenceEvolution: {},
            learningCurve: {},
            habitFormation: {}
        };
        
        // Get patterns from pattern learning system
        if (this.patternLearningSystem.isInitialized) {
            const learningStats = this.patternLearningSystem.getStatistics();
            patterns.learningCurve = {
                totalPatterns: learningStats.totalPatterns,
                successfulPredictions: learningStats.successfulPredictions,
                accuracy: learningStats.averageAccuracy,
                learningProgress: learningStats.learningProgress
            };
        }
        
        return patterns;
    }
    
    /**
     * Generate AI insights
     */
    async generateAIInsights(report) {
        try {
            const prompt = this.buildInsightPrompt(report);
            
            const response = await this.aiProviderManager.generateSuggestion(prompt, {
                temperature: 0.7,
                maxTokens: 500
            });
            
            const insights = this.parseInsightResponse(response.suggestion);
            
            // Update statistics
            this.statistics.insightsGenerated++;
            
            return insights;
            
        } catch (error) {
            console.error('❌ Failed to generate AI insights:', error);
            return [];
        }
    }
    
    /**
     * Build insight prompt
     */
    buildInsightPrompt(report) {
        const summary = report.summary;
        const productivity = report.categories.productivity?.metrics?.productivity_score || {};
        const efficiency = report.categories.optimization?.metrics?.efficiency_metrics || {};
        
        return `Analyze this usage analytics report and provide actionable insights:

Usage Summary:
- Total items: ${summary.totalItems || 0}
- Active items: ${summary.activeItems || 0}
- Productivity score: ${productivity.productivityScore || 0}%
- Utilization rate: ${efficiency.utilizationRate || 0}%
- Unused items: ${efficiency.unusedItems || 0}

Key Patterns:
- Peak usage hour: ${report.categories.usage_patterns?.metrics?.time_distribution?.peakHour || 'Unknown'}
- Most used category: ${report.categories.usage_patterns?.metrics?.category_distribution?.mostUsedCategory || 'Unknown'}

Provide 3-5 specific, actionable insights in this format:
1. [Insight type]: [Specific observation] - [Recommended action]

Focus on productivity optimization, efficiency improvements, and workflow enhancements.`;
    }
    
    /**
     * Parse insight response
     */
    parseInsightResponse(response) {
        const insights = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^\d+\./)) {
                const parts = trimmed.split(': ');
                if (parts.length >= 2) {
                    const [number, rest] = parts;
                    const [type, content] = rest.split('] - ');
                    
                    if (type && content) {
                        insights.push({
                            type: type.replace('[', '').trim(),
                            observation: content.split(' - ')[0] || '',
                            recommendation: content.split(' - ')[1] || content,
                            priority: insights.length < 3 ? 'high' : 'medium'
                        });
                    }
                }
            }
        }
        
        return insights;
    }
    
    /**
     * Generate recommendations
     */
    async generateRecommendations(report) {
        const recommendations = [];
        
        // Efficiency recommendations
        const efficiency = report.categories.optimization?.metrics?.efficiency_metrics || {};
        if (efficiency.unusedItemsPercentage > 20) {
            recommendations.push({
                type: 'efficiency',
                priority: 'high',
                title: 'Remove Unused Items',
                description: `You have ${efficiency.unusedItems} unused items (${efficiency.unusedItemsPercentage.toFixed(1)}%). Consider cleaning up to improve organization.`,
                action: 'cleanup'
            });
        }
        
        // Productivity recommendations
        const productivity = report.categories.productivity?.metrics?.productivity_score || {};
        if (productivity.productivityScore < 50) {
            recommendations.push({
                type: 'productivity',
                priority: 'medium',
                title: 'Improve Productivity Balance',
                description: `Your productivity score is ${productivity.productivityScore}%. Consider focusing more on productive tools.`,
                action: 'organize'
            });
        }
        
        // Organization recommendations
        const categories = report.categories.usage_patterns?.metrics?.category_distribution || {};
        if (categories.totalCategories > 10) {
            recommendations.push({
                type: 'organization',
                priority: 'low',
                title: 'Consolidate Categories',
                description: `You have ${categories.totalCategories} categories. Consider consolidating similar ones for better organization.`,
                action: 'categorize'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Generate summary
     */
    generateSummary(categories) {
        const summary = {
            totalItems: this.usageData.size,
            totalUsage: 0,
            activeItems: 0,
            averageUsage: 0,
            topCategories: [],
            insights: []
        };
        
        // Calculate totals
        for (const usage of this.usageData.values()) {
            summary.totalUsage += usage.frequency;
            if (usage.frequency > 0) {
                summary.activeItems++;
            }
        }
        
        summary.averageUsage = summary.totalItems > 0 ? summary.totalUsage / summary.totalItems : 0;
        
        return summary;
    }
    
    /**
     * Utility functions
     */
    calculateMedian(values) {
        if (values.length === 0) return 0;
        
        const sorted = values.slice().sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 ? 
            (sorted[middle - 1] + sorted[middle]) / 2 : 
            sorted[middle];
    }
    
    calculateDistribution(values) {
        const distribution = {};
        
        for (const value of values) {
            const bucket = Math.floor(value / 10) * 10; // Group by 10s
            distribution[bucket] = (distribution[bucket] || 0) + 1;
        }
        
        return distribution;
    }
    
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Real-time analysis
     */
    startRealTimeAnalysis() {
        this.realTimeInterval = setInterval(() => {
            this.performRealTimeAnalysis();
        }, 30000); // Every 30 seconds
        
        console.log('🔄 Real-time analysis started');
    }
    
    async performRealTimeAnalysis() {
        try {
            // Analyze recent usage patterns
            const recentEvents = Array.from(this.usageData.values())
                .filter(usage => Date.now() - usage.lastUsed < 300000); // Last 5 minutes
            
            if (recentEvents.length > 0) {
                // Emit real-time insights
                this.emit('real-time-insight', {
                    timestamp: Date.now(),
                    recentActivity: recentEvents.length,
                    activeItems: recentEvents.map(usage => usage.itemName)
                });
            }
            
        } catch (error) {
            console.error('❌ Real-time analysis error:', error);
        }
    }
    
    analyzeUsageEvent(event) {
        // Immediate analysis of usage event
        const insights = [];
        
        // Check for unusual patterns
        const usage = this.usageData.get(event.itemId);
        if (usage && usage.frequency === 1) {
            insights.push({
                type: 'new_item',
                message: `First time using ${event.itemName}`,
                timestamp: Date.now()
            });
        }
        
        // Emit insights
        if (insights.length > 0) {
            this.emit('usage-insights', insights);
        }
    }
    
    /**
     * Schedule insight generation
     */
    scheduleInsightGeneration() {
        this.insightInterval = setInterval(async () => {
            try {
                await this.generatePeriodicInsights();
            } catch (error) {
                console.error('❌ Periodic insight generation error:', error);
            }
        }, this.options.insightGenerationInterval);
        
        console.log('💡 Insight generation scheduled');
    }
    
    async generatePeriodicInsights() {
        console.log('💡 Generating periodic insights...');
        
        const report = await this.generateAnalyticsReport();
        const insights = report.insights;
        
        // Store insights
        this.insights.set(Date.now(), insights);
        
        // Emit insights
        this.emit('periodic-insights', insights);
        
        console.log(`✅ Generated ${insights.length} periodic insights`);
    }
    
    /**
     * Get analytics dashboard data
     */
    async getDashboardData() {
        const report = await this.generateAnalyticsReport();
        
        return {
            summary: report.summary,
            charts: {
                usageFrequency: report.categories.usage_patterns?.metrics?.usage_frequency,
                timeDistribution: report.categories.usage_patterns?.metrics?.time_distribution,
                categoryDistribution: report.categories.usage_patterns?.metrics?.category_distribution,
                productivityScore: report.categories.productivity?.metrics?.productivity_score,
                efficiencyMetrics: report.categories.optimization?.metrics?.efficiency_metrics
            },
            insights: report.insights,
            recommendations: report.recommendations,
            statistics: this.statistics
        };
    }
    
    /**
     * Export analytics data
     */
    exportData() {
        return {
            usageData: Object.fromEntries(this.usageData),
            insights: Object.fromEntries(this.insights),
            statistics: this.statistics,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import analytics data
     */
    async importData(data) {
        if (data.usageData) {
            this.usageData = new Map(Object.entries(data.usageData));
        }
        
        if (data.insights) {
            this.insights = new Map(Object.entries(data.insights));
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        console.log('📥 Analytics data imported');
    }
    
    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            totalUsageRecords: this.usageData.size,
            totalInsights: this.insights.size,
            cacheSize: this.analyticsCache.size
        };
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Clear intervals
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
        
        if (this.insightInterval) {
            clearInterval(this.insightInterval);
        }
        
        // Clear data
        this.usageData.clear();
        this.analyticsCache.clear();
        this.insights.clear();
        this.metrics.clear();
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Usage Analytics cleanup complete');
    }
}

module.exports = UsageAnalytics;