/**
 * Data Merger for Nexo Dashboard
 * Handles intelligent merging of raw and custom data
 */

const UUIDGenerator = require('./UUIDGenerator');

class DataMerger {
    constructor(config = {}) {
        this.mergeStrategy = config.mergeStrategy || 'user_priority';
        this.conflictResolution = config.conflictResolution || 'manual';
        this.logConflicts = config.logConflicts !== false;
        this.conflicts = [];
    }

    /**
     * Merge raw data with custom data
     * @param {Object[]} rawData - Raw data from automated collection
     * @param {Object[]} customData - Custom user data
     * @returns {Object} Merged data result
     */
    mergeData(rawData, customData) {
        const mergedItems = [];
        const conflicts = [];
        const timestamp = new Date().toISOString();

        // Create maps for efficient lookup
        const rawMap = new Map(rawData.map(item => [item.id || this.generateId(item), item]));
        const customMap = new Map(customData.map(item => [item.id, item]));

        // Process all items
        const allIds = new Set([...rawMap.keys(), ...customMap.keys()]);

        for (const id of allIds) {
            const rawItem = rawMap.get(id);
            const customItem = customMap.get(id);

            if (rawItem && customItem) {
                // Both exist - merge them
                const mergedItem = this.mergeItem(rawItem, customItem, timestamp);
                mergedItems.push(mergedItem);
            } else if (rawItem) {
                // Only raw exists - use raw data
                mergedItems.push(this.createMergedItem(rawItem, null, timestamp));
            } else if (customItem) {
                // Only custom exists - preserve custom data
                mergedItems.push(this.createMergedItem(null, customItem, timestamp));
            }
        }

        return {
            items: mergedItems,
            conflicts: conflicts,
            timestamp: timestamp,
            strategy: this.mergeStrategy
        };
    }

    /**
     * Merge a single item
     * @param {Object} rawItem - Raw item data
     * @param {Object} customItem - Custom item data
     * @param {string} timestamp - Merge timestamp
     * @returns {Object} Merged item
     */
    mergeItem(rawItem, customItem, timestamp) {
        const baseItem = rawItem || customItem;
        const mergedItem = {
            id: baseItem.id || UUIDGenerator.generateFromContent(baseItem.name + baseItem.path),
            core: rawItem ? rawItem.core : customItem.core,
            metadata: {
                raw: rawItem ? rawItem.metadata || {} : {},
                custom: customItem ? customItem.metadata || {} : {},
                merged: {}
            },
            tracking: {
                created: baseItem.tracking?.created || timestamp,
                firstSeen: rawItem ? rawItem.tracking?.firstSeen || timestamp : timestamp,
                lastSeen: rawItem ? rawItem.tracking?.lastSeen || timestamp : timestamp,
                userInteractions: customItem ? customItem.tracking?.userInteractions || 0 : 0,
                lastLaunched: baseItem.tracking?.lastLaunched || null,
                lastMerge: timestamp
            }
        };

        // Apply merge strategy
        switch (this.mergeStrategy) {
            case 'user_priority':
                mergedItem.metadata.merged = this.userPriorityMerge(
                    mergedItem.metadata.raw,
                    mergedItem.metadata.custom
                );
                break;
            
            case 'smart_merge':
                mergedItem.metadata.merged = this.intelligentMerge(
                    mergedItem.metadata.raw,
                    mergedItem.metadata.custom
                );
                break;
            
            case 'hybrid':
                mergedItem.metadata.merged = this.hybridMerge(
                    mergedItem.metadata.raw,
                    mergedItem.metadata.custom
                );
                break;
            
            default:
                mergedItem.metadata.merged = this.userPriorityMerge(
                    mergedItem.metadata.raw,
                    mergedItem.metadata.custom
                );
        }

        return mergedItem;
    }

    /**
     * Create merged item from single source
     * @param {Object} rawItem - Raw item data
     * @param {Object} customItem - Custom item data
     * @param {string} timestamp - Merge timestamp
     * @returns {Object} Merged item
     */
    createMergedItem(rawItem, customItem, timestamp) {
        const baseItem = rawItem || customItem;
        const isRawOnly = !!rawItem;
        
        return {
            id: baseItem.id || UUIDGenerator.generateFromContent(baseItem.name + baseItem.path),
            core: baseItem.core,
            metadata: {
                raw: isRawOnly ? (baseItem.metadata || {}) : {},
                custom: isRawOnly ? {} : (baseItem.metadata || {}),
                merged: baseItem.metadata || {}
            },
            tracking: {
                created: baseItem.tracking?.created || timestamp,
                firstSeen: baseItem.tracking?.firstSeen || timestamp,
                lastSeen: baseItem.tracking?.lastSeen || timestamp,
                userInteractions: baseItem.tracking?.userInteractions || 0,
                lastLaunched: baseItem.tracking?.lastLaunched || null,
                lastMerge: timestamp
            }
        };
    }

    /**
     * User priority merge strategy
     * @param {Object} raw - Raw metadata
     * @param {Object} custom - Custom metadata
     * @returns {Object} Merged metadata
     */
    userPriorityMerge(raw, custom) {
        return {
            ...raw,
            ...custom,
            priority: 'custom',
            mergeStrategy: 'user_priority'
        };
    }

    /**
     * Intelligent merge strategy
     * @param {Object} raw - Raw metadata
     * @param {Object} custom - Custom metadata
     * @returns {Object} Merged metadata
     */
    intelligentMerge(raw, custom) {
        const merged = {
            category: custom.category || raw.category,
            tags: this.mergeTags(raw.tags, custom.tags),
            notes: custom.notes || raw.notes || '',
            priority: custom.priority || raw.priority || 'medium',
            lastModified: custom.lastModified || raw.lastModified || new Date().toISOString(),
            mergeStrategy: 'intelligent'
        };

        // Preserve additional properties
        Object.keys(raw).forEach(key => {
            if (!(key in merged)) {
                merged[key] = raw[key];
            }
        });

        Object.keys(custom).forEach(key => {
            if (!(key in merged)) {
                merged[key] = custom[key];
            }
        });

        return merged;
    }

    /**
     * Hybrid merge strategy
     * @param {Object} raw - Raw metadata
     * @param {Object} custom - Custom metadata
     * @returns {Object} Merged metadata
     */
    hybridMerge(raw, custom) {
        const merged = {
            category: custom.category || raw.category,
            tags: this.mergeTags(raw.tags, custom.tags),
            notes: custom.notes || '',
            priority: custom.priority || raw.priority || 'medium',
            confidence: raw.confidence || 1.0,
            userModified: !!custom.category || !!custom.tags || !!custom.notes,
            mergeStrategy: 'hybrid'
        };

        // Intelligent field selection
        if (custom.category && raw.category && custom.category !== raw.category) {
            merged.alternativeCategory = raw.category;
        }

        return merged;
    }

    /**
     * Merge tags from raw and custom sources
     * @param {string[]} rawTags - Raw tags
     * @param {string[]} customTags - Custom tags
     * @returns {string[]} Merged tags
     */
    mergeTags(rawTags = [], customTags = []) {
        const allTags = [...rawTags, ...customTags];
        return [...new Set(allTags)].sort();
    }

    /**
     * Generate ID for item without UUID
     * @param {Object} item - Item data
     * @returns {string} Generated ID
     */
    generateId(item) {
        const content = (item.name || '') + (item.path || '') + (item.url || '');
        return UUIDGenerator.generateFromContent(content);
    }

    /**
     * Detect conflicts between raw and custom data
     * @param {Object} rawData - Raw data
     * @param {Object} customData - Custom data
     * @returns {Object[]} Array of conflicts
     */
    detectConflicts(rawData, customData) {
        const conflicts = [];
        const rawMap = new Map(rawData.map(item => [item.id, item]));
        const customMap = new Map(customData.map(item => [item.id, item]));

        for (const [id, rawItem] of rawMap) {
            const customItem = customMap.get(id);
            if (customItem && this.hasConflict(rawItem, customItem)) {
                conflicts.push({
                    id: id,
                    type: 'data_conflict',
                    raw: rawItem,
                    custom: customItem,
                    timestamp: new Date().toISOString(),
                    fields: this.getConflictFields(rawItem, customItem)
                });
            }
        }

        return conflicts;
    }

    /**
     * Check if there's a conflict between raw and custom data
     * @param {Object} raw - Raw item
     * @param {Object} custom - Custom item
     * @returns {boolean} True if conflict exists
     */
    hasConflict(raw, custom) {
        const rawMeta = raw.metadata || {};
        const customMeta = custom.metadata || {};

        return (
            rawMeta.category !== customMeta.category ||
            !this.arraysEqual(rawMeta.tags, customMeta.tags) ||
            raw.core?.name !== custom.core?.name
        );
    }

    /**
     * Get conflicting fields between raw and custom data
     * @param {Object} raw - Raw item
     * @param {Object} custom - Custom item
     * @returns {string[]} Array of conflicting field names
     */
    getConflictFields(raw, custom) {
        const conflicts = [];
        const rawMeta = raw.metadata || {};
        const customMeta = custom.metadata || {};

        if (rawMeta.category !== customMeta.category) {
            conflicts.push('category');
        }
        if (!this.arraysEqual(rawMeta.tags, customMeta.tags)) {
            conflicts.push('tags');
        }
        if (raw.core?.name !== custom.core?.name) {
            conflicts.push('name');
        }

        return conflicts;
    }

    /**
     * Compare two arrays for equality
     * @param {Array} arr1 - First array
     * @param {Array} arr2 - Second array
     * @returns {boolean} True if arrays are equal
     */
    arraysEqual(arr1 = [], arr2 = []) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        
        const sorted1 = [...arr1].sort();
        const sorted2 = [...arr2].sort();
        
        return sorted1.every((val, index) => val === sorted2[index]);
    }

    /**
     * Get merge statistics
     * @returns {Object} Merge statistics
     */
    getStats() {
        return {
            strategy: this.mergeStrategy,
            conflictResolution: this.conflictResolution,
            totalConflicts: this.conflicts.length,
            lastMerge: new Date().toISOString()
        };
    }
}

module.exports = DataMerger;