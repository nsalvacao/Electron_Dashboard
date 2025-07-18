/**
 * Cost Tracker - Monitor and track AI provider costs and usage
 * Provides real-time cost monitoring, alerts, and usage analytics
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class CostTracker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            dataPath: options.dataPath || './data/ai-costs',
            enableAlerts: options.enableAlerts !== false,
            enablePersistence: options.enablePersistence !== false,
            ...options
        };
        
        this.costs = new Map(); // provider -> cost data
        this.usage = new Map(); // provider -> usage data
        this.limits = new Map(); // provider -> limits
        this.alerts = new Map(); // provider -> alert settings
        
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        
        this.isInitialized = false;
        this.persistenceTimer = null;
    }
    
    /**
     * Initialize cost tracker
     */
    async initialize() {
        try {
            console.log('💰 Initializing Cost Tracker...');
            
            // Ensure data directory exists
            if (this.options.enablePersistence) {
                await fs.mkdir(this.options.dataPath, { recursive: true });
            }
            
            // Load existing data
            await this.loadCostData();
            
            // Set up automatic persistence
            if (this.options.enablePersistence) {
                this.startPersistenceTimer();
            }
            
            this.isInitialized = true;
            console.log('✅ Cost Tracker initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Cost Tracker:', error);
            throw error;
        }
    }
    
    /**
     * Track usage for a provider
     */
    async trackUsage(provider, operation, cost, tokens = 0) {
        if (!this.isInitialized) {
            throw new Error('Cost Tracker not initialized');
        }
        
        const timestamp = Date.now();
        const date = new Date(timestamp);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        // Initialize provider data if needed
        if (!this.costs.has(provider)) {
            this.costs.set(provider, {
                monthly: {},
                daily: {},
                total: 0
            });
        }
        
        if (!this.usage.has(provider)) {
            this.usage.set(provider, {
                monthly: {},
                daily: {},
                operations: {}
            });
        }
        
        const providerCosts = this.costs.get(provider);
        const providerUsage = this.usage.get(provider);
        
        // Track monthly costs
        const monthKey = `${year}-${month}`;
        if (!providerCosts.monthly[monthKey]) {
            providerCosts.monthly[monthKey] = 0;
        }
        providerCosts.monthly[monthKey] += cost;
        providerCosts.total += cost;
        
        // Track daily costs
        const dayKey = `${year}-${month}-${date.getDate()}`;
        if (!providerCosts.daily[dayKey]) {
            providerCosts.daily[dayKey] = 0;
        }
        providerCosts.daily[dayKey] += cost;
        
        // Track monthly usage
        if (!providerUsage.monthly[monthKey]) {
            providerUsage.monthly[monthKey] = {
                operations: 0,
                tokens: 0
            };
        }
        providerUsage.monthly[monthKey].operations += 1;
        providerUsage.monthly[monthKey].tokens += tokens;
        
        // Track daily usage
        if (!providerUsage.daily[dayKey]) {
            providerUsage.daily[dayKey] = {
                operations: 0,
                tokens: 0
            };
        }
        providerUsage.daily[dayKey].operations += 1;
        providerUsage.daily[dayKey].tokens += tokens;
        
        // Track operation types
        if (!providerUsage.operations[operation]) {
            providerUsage.operations[operation] = {
                count: 0,
                totalCost: 0,
                totalTokens: 0
            };
        }
        providerUsage.operations[operation].count += 1;
        providerUsage.operations[operation].totalCost += cost;
        providerUsage.operations[operation].totalTokens += tokens;
        
        // Check for alerts
        if (this.options.enableAlerts) {
            await this.checkAlerts(provider, cost);
        }
        
        // Emit usage event
        this.emit('usage-tracked', {
            provider,
            operation,
            cost,
            tokens,
            timestamp
        });
        
        console.log(`💰 Tracked usage: ${provider} - ${operation} - $${cost.toFixed(4)} (${tokens} tokens)`);
    }
    
    /**
     * Set cost limit for a provider
     */
    async setCostLimit(provider, monthlyLimit, alertThreshold = 0.8) {
        this.limits.set(provider, {
            monthlyLimit,
            alertThreshold
        });
        
        this.alerts.set(provider, {
            alertThreshold,
            lastAlert: null
        });
        
        console.log(`💰 Set cost limit for ${provider}: $${monthlyLimit}/month (alert at ${alertThreshold * 100}%)`);
        
        if (this.options.enablePersistence) {
            await this.saveLimitsData();
        }
    }
    
    /**
     * Get current month cost for a provider
     */
    getCurrentMonthCost(provider) {
        const costs = this.costs.get(provider);
        if (!costs) {
            return 0;
        }
        
        const monthKey = `${this.currentYear}-${this.currentMonth}`;
        return costs.monthly[monthKey] || 0;
    }
    
    /**
     * Get total cost for a provider
     */
    getTotalCost(provider) {
        const costs = this.costs.get(provider);
        return costs ? costs.total : 0;
    }
    
    /**
     * Get usage statistics for a provider
     */
    getUsageStats(provider) {
        const costs = this.costs.get(provider);
        const usage = this.usage.get(provider);
        const limits = this.limits.get(provider);
        
        if (!costs || !usage) {
            return null;
        }
        
        const monthKey = `${this.currentYear}-${this.currentMonth}`;
        const currentMonthCost = costs.monthly[monthKey] || 0;
        const currentMonthUsage = usage.monthly[monthKey] || { operations: 0, tokens: 0 };
        
        const stats = {
            provider,
            currentMonth: {
                cost: currentMonthCost,
                operations: currentMonthUsage.operations,
                tokens: currentMonthUsage.tokens
            },
            total: {
                cost: costs.total,
                operations: Object.values(usage.operations).reduce((sum, op) => sum + op.count, 0),
                tokens: Object.values(usage.operations).reduce((sum, op) => sum + op.totalTokens, 0)
            },
            operations: usage.operations,
            limits: limits || null
        };
        
        // Calculate limit percentage if limits exist
        if (limits) {
            stats.limitUsage = {
                percentage: (currentMonthCost / limits.monthlyLimit) * 100,
                remaining: limits.monthlyLimit - currentMonthCost,
                isNearLimit: currentMonthCost >= (limits.monthlyLimit * limits.alertThreshold)
            };
        }
        
        return stats;
    }
    
    /**
     * Get statistics for all providers
     */
    getStats() {
        const stats = {
            providers: {},
            totals: {
                cost: 0,
                operations: 0,
                tokens: 0
            },
            currentMonth: {
                cost: 0,
                operations: 0,
                tokens: 0
            }
        };
        
        for (const provider of this.costs.keys()) {
            const providerStats = this.getUsageStats(provider);
            if (providerStats) {
                stats.providers[provider] = providerStats;
                stats.totals.cost += providerStats.total.cost;
                stats.totals.operations += providerStats.total.operations;
                stats.totals.tokens += providerStats.total.tokens;
                stats.currentMonth.cost += providerStats.currentMonth.cost;
                stats.currentMonth.operations += providerStats.currentMonth.operations;
                stats.currentMonth.tokens += providerStats.currentMonth.tokens;
            }
        }
        
        return stats;
    }
    
    /**
     * Check for cost alerts
     */
    async checkAlerts(provider, newCost) {
        const limits = this.limits.get(provider);
        const alerts = this.alerts.get(provider);
        
        if (!limits || !alerts) {
            return;
        }
        
        const currentCost = this.getCurrentMonthCost(provider);
        const alertThreshold = limits.monthlyLimit * limits.alertThreshold;
        
        // Check if we've crossed the alert threshold
        if (currentCost >= alertThreshold) {
            const timeSinceLastAlert = alerts.lastAlert ? Date.now() - alerts.lastAlert : Infinity;
            const alertCooldown = 3600000; // 1 hour
            
            if (timeSinceLastAlert > alertCooldown) {
                const alertData = {
                    provider,
                    currentCost,
                    limit: limits.monthlyLimit,
                    percentage: (currentCost / limits.monthlyLimit) * 100,
                    timestamp: Date.now()
                };
                
                this.emit('cost-alert', alertData);
                alerts.lastAlert = Date.now();
                
                console.warn(`⚠️ Cost alert: ${provider} has reached ${alertData.percentage.toFixed(1)}% of monthly limit`);
                
                // Check if we've exceeded the limit
                if (currentCost >= limits.monthlyLimit) {
                    this.emit('cost-limit-exceeded', {
                        ...alertData,
                        exceeded: true
                    });
                    
                    console.error(`🚨 Cost limit exceeded: ${provider} has exceeded monthly limit of $${limits.monthlyLimit}`);
                }
            }
        }
    }
    
    /**
     * Load cost data from storage
     */
    async loadCostData() {
        if (!this.options.enablePersistence) {
            return;
        }
        
        try {
            // Load costs
            const costsFile = path.join(this.options.dataPath, 'costs.json');
            const costsData = await fs.readFile(costsFile, 'utf8');
            const costs = JSON.parse(costsData);
            
            for (const [provider, data] of Object.entries(costs)) {
                this.costs.set(provider, data);
            }
            
            // Load usage
            const usageFile = path.join(this.options.dataPath, 'usage.json');
            const usageData = await fs.readFile(usageFile, 'utf8');
            const usage = JSON.parse(usageData);
            
            for (const [provider, data] of Object.entries(usage)) {
                this.usage.set(provider, data);
            }
            
            // Load limits
            await this.loadLimitsData();
            
            console.log('✅ Cost data loaded from storage');
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('⚠️ Failed to load cost data:', error.message);
            }
        }
    }
    
    /**
     * Load limits data from storage
     */
    async loadLimitsData() {
        try {
            const limitsFile = path.join(this.options.dataPath, 'limits.json');
            const limitsData = await fs.readFile(limitsFile, 'utf8');
            const limits = JSON.parse(limitsData);
            
            for (const [provider, data] of Object.entries(limits)) {
                this.limits.set(provider, data);
                this.alerts.set(provider, {
                    alertThreshold: data.alertThreshold,
                    lastAlert: null
                });
            }
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('⚠️ Failed to load limits data:', error.message);
            }
        }
    }
    
    /**
     * Save cost data to storage
     */
    async saveCostData() {
        if (!this.options.enablePersistence) {
            return;
        }
        
        try {
            // Save costs
            const costsFile = path.join(this.options.dataPath, 'costs.json');
            const costsData = Object.fromEntries(this.costs.entries());
            await fs.writeFile(costsFile, JSON.stringify(costsData, null, 2));
            
            // Save usage
            const usageFile = path.join(this.options.dataPath, 'usage.json');
            const usageData = Object.fromEntries(this.usage.entries());
            await fs.writeFile(usageFile, JSON.stringify(usageData, null, 2));
            
        } catch (error) {
            console.error('❌ Failed to save cost data:', error);
        }
    }
    
    /**
     * Save limits data to storage
     */
    async saveLimitsData() {
        if (!this.options.enablePersistence) {
            return;
        }
        
        try {
            const limitsFile = path.join(this.options.dataPath, 'limits.json');
            const limitsData = Object.fromEntries(this.limits.entries());
            await fs.writeFile(limitsFile, JSON.stringify(limitsData, null, 2));
            
        } catch (error) {
            console.error('❌ Failed to save limits data:', error);
        }
    }
    
    /**
     * Start persistence timer
     */
    startPersistenceTimer() {
        this.persistenceTimer = setInterval(async () => {
            await this.saveCostData();
        }, 60000); // Save every minute
    }
    
    /**
     * Reset monthly data for a new month
     */
    async resetMonthlyData() {
        const now = new Date();
        const newMonth = now.getMonth();
        const newYear = now.getFullYear();
        
        if (newMonth !== this.currentMonth || newYear !== this.currentYear) {
            console.log(`🗓️ Resetting monthly data for ${newYear}-${newMonth}`);
            
            this.currentMonth = newMonth;
            this.currentYear = newYear;
            
            // Reset alert timers
            for (const alerts of this.alerts.values()) {
                alerts.lastAlert = null;
            }
            
            this.emit('month-reset', {
                month: newMonth,
                year: newYear
            });
        }
    }
    
    /**
     * Export cost data
     */
    exportData() {
        return {
            costs: Object.fromEntries(this.costs.entries()),
            usage: Object.fromEntries(this.usage.entries()),
            limits: Object.fromEntries(this.limits.entries()),
            timestamp: Date.now()
        };
    }
    
    /**
     * Import cost data
     */
    async importData(data) {
        try {
            if (data.costs) {
                this.costs.clear();
                for (const [provider, costsData] of Object.entries(data.costs)) {
                    this.costs.set(provider, costsData);
                }
            }
            
            if (data.usage) {
                this.usage.clear();
                for (const [provider, usageData] of Object.entries(data.usage)) {
                    this.usage.set(provider, usageData);
                }
            }
            
            if (data.limits) {
                this.limits.clear();
                this.alerts.clear();
                for (const [provider, limitsData] of Object.entries(data.limits)) {
                    this.limits.set(provider, limitsData);
                    this.alerts.set(provider, {
                        alertThreshold: limitsData.alertThreshold,
                        lastAlert: null
                    });
                }
            }
            
            if (this.options.enablePersistence) {
                await this.saveCostData();
                await this.saveLimitsData();
            }
            
            console.log('✅ Cost data imported successfully');
            
        } catch (error) {
            console.error('❌ Failed to import cost data:', error);
            throw error;
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.persistenceTimer) {
            clearInterval(this.persistenceTimer);
            this.persistenceTimer = null;
        }
        
        if (this.options.enablePersistence) {
            await this.saveCostData();
            await this.saveLimitsData();
        }
        
        this.costs.clear();
        this.usage.clear();
        this.limits.clear();
        this.alerts.clear();
        
        this.isInitialized = false;
    }
}

module.exports = CostTracker;