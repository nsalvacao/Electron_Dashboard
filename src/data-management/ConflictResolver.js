/**
 * Conflict Resolver for Nexo Dashboard
 * Handles resolution of data conflicts between raw and custom data
 */

class ConflictResolver {
    constructor(config = {}) {
        this.strategy = config.strategy || 'user_priority';
        this.autoResolve = config.autoResolve !== false;
        this.logConflicts = config.logConflicts !== false;
        this.conflictLog = [];
    }

    /**
     * Resolve conflicts between raw and custom data
     * @param {Object[]} conflicts - Array of conflicts
     * @param {string} strategy - Resolution strategy
     * @returns {Object[]} Resolved conflicts
     */
    resolveConflicts(conflicts, strategy = this.strategy) {
        const resolvedConflicts = [];

        for (const conflict of conflicts) {
            const resolution = this.resolveConflict(conflict, strategy);
            resolvedConflicts.push(resolution);
            
            if (this.logConflicts) {
                this.logConflict(conflict, resolution);
            }
        }

        return resolvedConflicts;
    }

    /**
     * Resolve a single conflict
     * @param {Object} conflict - Conflict data
     * @param {string} strategy - Resolution strategy
     * @returns {Object} Resolved conflict
     */
    resolveConflict(conflict, strategy = this.strategy) {
        const resolution = {
            id: conflict.id,
            originalConflict: conflict,
            resolution: null,
            strategy: strategy,
            timestamp: new Date().toISOString(),
            automatic: this.autoResolve
        };

        switch (strategy) {
            case 'user_priority':
                resolution.resolution = this.userPriorityResolution(conflict);
                break;
            
            case 'auto_priority':
                resolution.resolution = this.autoPriorityResolution(conflict);
                break;
            
            case 'merge_both':
                resolution.resolution = this.mergeBothResolution(conflict);
                break;
            
            case 'intelligent':
                resolution.resolution = this.intelligentResolution(conflict);
                break;
            
            case 'manual':
                resolution.resolution = this.manualResolution(conflict);
                break;
            
            default:
                resolution.resolution = this.userPriorityResolution(conflict);
        }

        return resolution;
    }

    /**
     * User priority resolution - prefer custom data
     * @param {Object} conflict - Conflict data
     * @returns {Object} Resolved data
     */
    userPriorityResolution(conflict) {
        const custom = conflict.custom;
        const raw = conflict.raw;
        
        return {
            ...raw,
            metadata: {
                ...raw.metadata,
                ...custom.metadata,
                resolvedBy: 'user_priority',
                originalRaw: raw.metadata,
                resolutionTimestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Auto priority resolution - prefer raw data
     * @param {Object} conflict - Conflict data
     * @returns {Object} Resolved data
     */
    autoPriorityResolution(conflict) {
        const raw = conflict.raw;
        const custom = conflict.custom;
        
        return {
            ...raw,
            metadata: {
                ...raw.metadata,
                resolvedBy: 'auto_priority',
                originalCustom: custom.metadata,
                resolutionTimestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Merge both resolution - combine data intelligently
     * @param {Object} conflict - Conflict data
     * @returns {Object} Resolved data
     */
    mergeBothResolution(conflict) {
        const raw = conflict.raw;
        const custom = conflict.custom;
        
        return {
            ...raw,
            metadata: {
                category: custom.metadata.category || raw.metadata.category,
                tags: this.mergeTags(raw.metadata.tags, custom.metadata.tags),
                notes: custom.metadata.notes || raw.metadata.notes || '',
                priority: custom.metadata.priority || raw.metadata.priority || 'medium',
                confidence: raw.metadata.confidence || 1.0,
                resolvedBy: 'merge_both',
                originalRaw: raw.metadata,
                originalCustom: custom.metadata,
                resolutionTimestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Intelligent resolution - context-aware merging
     * @param {Object} conflict - Conflict data
     * @returns {Object} Resolved data
     */
    intelligentResolution(conflict) {
        const raw = conflict.raw;
        const custom = conflict.custom;
        
        // Analyze conflict context
        const analysis = this.analyzeConflict(conflict);
        
        const resolved = {
            ...raw,
            metadata: {
                ...raw.metadata,
                resolvedBy: 'intelligent',
                analysisScore: analysis.score,
                resolutionTimestamp: new Date().toISOString()
            }
        };

        // Apply intelligent decisions based on analysis
        if (analysis.userEngagement > 0.5) {
            // High user engagement - prefer custom
            resolved.metadata = {
                ...resolved.metadata,
                ...custom.metadata,
                resolutionReason: 'high_user_engagement'
            };
        } else if (analysis.dataQuality.raw > analysis.dataQuality.custom) {
            // Better raw data quality - prefer raw
            resolved.metadata = {
                ...resolved.metadata,
                resolutionReason: 'better_raw_quality'
            };
        } else {
            // Default to merge
            resolved.metadata = {
                ...resolved.metadata,
                ...this.mergeBothResolution(conflict).metadata,
                resolutionReason: 'default_merge'
            };
        }

        return resolved;
    }

    /**
     * Manual resolution - require user intervention
     * @param {Object} conflict - Conflict data
     * @returns {Object} Resolved data
     */
    manualResolution(conflict) {
        return {
            ...conflict.raw,
            metadata: {
                ...conflict.raw.metadata,
                resolvedBy: 'manual',
                requiresUserInput: true,
                conflictId: conflict.id,
                resolutionTimestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Analyze conflict context for intelligent resolution
     * @param {Object} conflict - Conflict data
     * @returns {Object} Analysis results
     */
    analyzeConflict(conflict) {
        const raw = conflict.raw;
        const custom = conflict.custom;
        
        const analysis = {
            userEngagement: 0,
            dataQuality: {
                raw: 0,
                custom: 0
            },
            temporalFactor: 0,
            score: 0
        };

        // Calculate user engagement
        if (custom.tracking?.userInteractions > 0) {
            analysis.userEngagement = Math.min(custom.tracking.userInteractions / 10, 1);
        }

        // Calculate data quality
        analysis.dataQuality.raw = this.calculateDataQuality(raw);
        analysis.dataQuality.custom = this.calculateDataQuality(custom);

        // Calculate temporal factor
        const rawTimestamp = new Date(raw.metadata.lastModified || raw.tracking?.lastSeen || 0);
        const customTimestamp = new Date(custom.metadata.lastModified || custom.tracking?.lastSeen || 0);
        analysis.temporalFactor = customTimestamp > rawTimestamp ? 0.2 : -0.2;

        // Calculate overall score
        analysis.score = (
            analysis.userEngagement * 0.4 +
            (analysis.dataQuality.custom - analysis.dataQuality.raw) * 0.4 +
            analysis.temporalFactor * 0.2
        );

        return analysis;
    }

    /**
     * Calculate data quality score
     * @param {Object} item - Data item
     * @returns {number} Quality score (0-1)
     */
    calculateDataQuality(item) {
        let score = 0;
        const metadata = item.metadata || {};
        
        // Check for completeness
        if (metadata.category) score += 0.3;
        if (metadata.tags && metadata.tags.length > 0) score += 0.2;
        if (metadata.notes) score += 0.1;
        if (item.core?.name) score += 0.2;
        if (item.core?.path) score += 0.2;

        return score;
    }

    /**
     * Merge tags from different sources
     * @param {string[]} rawTags - Raw tags
     * @param {string[]} customTags - Custom tags
     * @returns {string[]} Merged tags
     */
    mergeTags(rawTags = [], customTags = []) {
        const allTags = [...rawTags, ...customTags];
        return [...new Set(allTags)].sort();
    }

    /**
     * Log conflict resolution
     * @param {Object} conflict - Original conflict
     * @param {Object} resolution - Resolution result
     */
    logConflict(conflict, resolution) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            conflictId: conflict.id,
            strategy: resolution.strategy,
            automatic: resolution.automatic,
            fields: conflict.fields,
            resolution: resolution.resolution?.metadata?.resolvedBy
        };

        this.conflictLog.push(logEntry);
        
        // Keep only last 1000 entries
        if (this.conflictLog.length > 1000) {
            this.conflictLog = this.conflictLog.slice(-1000);
        }
    }

    /**
     * Get conflict resolution statistics
     * @returns {Object} Resolution statistics
     */
    getStats() {
        const stats = {
            totalConflicts: this.conflictLog.length,
            strategies: {},
            automaticResolutions: 0,
            manualResolutions: 0,
            recentConflicts: this.conflictLog.slice(-10)
        };

        for (const entry of this.conflictLog) {
            // Count strategies
            if (!stats.strategies[entry.strategy]) {
                stats.strategies[entry.strategy] = 0;
            }
            stats.strategies[entry.strategy]++;

            // Count automatic vs manual
            if (entry.automatic) {
                stats.automaticResolutions++;
            } else {
                stats.manualResolutions++;
            }
        }

        return stats;
    }

    /**
     * Get pending manual resolutions
     * @returns {Object[]} Pending resolutions
     */
    getPendingResolutions() {
        return this.conflictLog.filter(entry => 
            entry.resolution === 'manual' && entry.requiresUserInput
        );
    }

    /**
     * Clear conflict log
     */
    clearLog() {
        this.conflictLog = [];
    }

    /**
     * Export conflict log
     * @returns {Object} Exportable conflict log
     */
    exportLog() {
        return {
            timestamp: new Date().toISOString(),
            totalConflicts: this.conflictLog.length,
            stats: this.getStats(),
            log: this.conflictLog
        };
    }
}

module.exports = ConflictResolver;