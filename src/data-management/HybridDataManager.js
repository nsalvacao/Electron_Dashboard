/**
 * Hybrid Data Manager for Nexo Dashboard
 * Coordinates between raw data collection and user customizations
 */

const path = require('path');
const JSONAdapter = require('./JSONAdapter');
const DataMerger = require('./DataMerger');
const ConflictResolver = require('./ConflictResolver');
const UUIDGenerator = require('./UUIDGenerator');

class HybridDataManager {
    constructor(config = {}) {
        this.config = {
            dataPath: config.dataPath || path.join(__dirname, '../../data'),
            mergeStrategy: config.mergeStrategy || 'user_priority',
            conflictResolution: config.conflictResolution || 'auto',
            autoMerge: config.autoMerge !== false,
            backupBeforeMerge: config.backupBeforeMerge !== false,
            ...config
        };

        this.adapter = new JSONAdapter(this.config);
        this.merger = new DataMerger(this.config);
        this.resolver = new ConflictResolver(this.config);
        
        this.initialized = false;
        this.lastMerge = null;
    }

    /**
     * Initialize the hybrid data manager
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            await this.adapter.ensureDirectories();
            await this.createInitialStructure();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize HybridDataManager:', error);
            return false;
        }
    }

    /**
     * Create initial data structure if it doesn't exist
     */
    async createInitialStructure() {
        const initialStructure = {
            'raw/apps_raw': { items: [], lastUpdate: null },
            'raw/bookmarks_raw': { items: [], lastUpdate: null },
            'raw/metadata_raw': { version: '1.0', created: new Date().toISOString() },
            'custom/categories_custom': { categories: [], lastUpdate: null },
            'custom/tags_custom': { tags: [], lastUpdate: null },
            'custom/user_preferences': { 
                mergeStrategy: 'user_priority',
                autoMerge: true,
                created: new Date().toISOString()
            },
            'custom/organization_custom': { customizations: [], lastUpdate: null },
            'merged/apps_final': { items: [], lastMerge: null },
            'merged/bookmarks_final': { items: [], lastMerge: null },
            'merged/display_config': { 
                layout: 'grid',
                itemsPerPage: 20,
                sortBy: 'name',
                lastUpdate: new Date().toISOString()
            },
            'sync/merge_history': { merges: [], lastMerge: null },
            'sync/conflict_log': { conflicts: [], lastConflict: null },
            'sync/user_changes': { changes: [], lastChange: null }
        };

        for (const [key, defaultValue] of Object.entries(initialStructure)) {
            if (!(await this.adapter.exists(key))) {
                await this.adapter.save(key, defaultValue);
            }
        }
    }

    /**
     * Add raw data from automated collection
     * @param {string} type - Data type (apps, bookmarks)
     * @param {Object[]} data - Raw data items
     * @returns {Promise<boolean>} Success status
     */
    async addRawData(type, data) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Ensure items have UUIDs
            const processedData = data.map(item => {
                if (!item.id) {
                    item.id = UUIDGenerator.generateFromContent(
                        (item.name || '') + (item.path || '') + (item.url || '')
                    );
                }
                return item;
            });

            const rawData = {
                items: processedData,
                lastUpdate: new Date().toISOString(),
                source: 'automated_collection'
            };

            const success = await this.adapter.save(`raw/${type}_raw`, rawData);
            
            if (success && this.config.autoMerge) {
                await this.performMerge(type);
            }

            return success;
        } catch (error) {
            console.error(`Failed to add raw data for ${type}:`, error);
            return false;
        }
    }

    /**
     * Add custom user data
     * @param {string} type - Data type (categories, tags, organization)
     * @param {Object} data - Custom data
     * @returns {Promise<boolean>} Success status
     */
    async addCustomData(type, data) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const customData = {
                ...data,
                lastUpdate: new Date().toISOString(),
                source: 'user_modification'
            };

            const success = await this.adapter.save(`custom/${type}_custom`, customData);
            
            if (success && this.config.autoMerge) {
                await this.performMerge();
            }

            return success;
        } catch (error) {
            console.error(`Failed to add custom data for ${type}:`, error);
            return false;
        }
    }

    /**
     * Update user preferences
     * @param {Object} preferences - User preferences
     * @returns {Promise<boolean>} Success status
     */
    async updateUserPreferences(preferences) {
        try {
            const currentPrefs = await this.adapter.load('custom/user_preferences') || {};
            const updatedPrefs = {
                ...currentPrefs,
                ...preferences,
                lastUpdate: new Date().toISOString()
            };

            return await this.adapter.save('custom/user_preferences', updatedPrefs);
        } catch (error) {
            console.error('Failed to update user preferences:', error);
            return false;
        }
    }

    /**
     * Perform data merge operation
     * @param {string} type - Specific data type to merge (optional)
     * @returns {Promise<Object>} Merge result
     */
    async performMerge(type = null) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const mergeResult = {
                success: false,
                timestamp: new Date().toISOString(),
                mergedTypes: [],
                conflicts: [],
                errors: []
            };

            if (this.config.backupBeforeMerge) {
                await this.adapter.backup();
            }

            const typesToMerge = type ? [type] : ['apps', 'bookmarks'];

            for (const mergeType of typesToMerge) {
                try {
                    const rawData = await this.adapter.load(`raw/${mergeType}_raw`) || { items: [] };
                    const customData = await this.adapter.load(`custom/organization_custom`) || { customizations: [] };

                    // Filter custom data for this type
                    const typeCustomData = customData.customizations.filter(
                        item => item.type === mergeType
                    );

                    const mergedData = this.merger.mergeData(rawData.items, typeCustomData);
                    
                    // Resolve conflicts
                    if (mergedData.conflicts.length > 0) {
                        const resolvedConflicts = this.resolver.resolveConflicts(mergedData.conflicts);
                        mergeResult.conflicts.push(...resolvedConflicts);
                    }

                    // Save merged data
                    const finalData = {
                        items: mergedData.items,
                        lastMerge: mergeResult.timestamp,
                        strategy: this.config.mergeStrategy,
                        conflicts: mergedData.conflicts.length
                    };

                    await this.adapter.save(`merged/${mergeType}_final`, finalData);
                    mergeResult.mergedTypes.push(mergeType);

                } catch (error) {
                    mergeResult.errors.push(`Failed to merge ${mergeType}: ${error.message}`);
                }
            }

            // Update merge history
            await this.updateMergeHistory(mergeResult);

            // Update conflict log
            if (mergeResult.conflicts.length > 0) {
                await this.updateConflictLog(mergeResult.conflicts);
            }

            mergeResult.success = mergeResult.errors.length === 0;
            this.lastMerge = mergeResult.timestamp;

            return mergeResult;
        } catch (error) {
            console.error('Failed to perform merge:', error);
            return {
                success: false,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Get merged data for display
     * @param {string} type - Data type (apps, bookmarks)
     * @returns {Promise<Object>} Merged data
     */
    async getMergedData(type) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const mergedData = await this.adapter.load(`merged/${type}_final`);
            return mergedData || { items: [], lastMerge: null };
        } catch (error) {
            console.error(`Failed to get merged data for ${type}:`, error);
            return { items: [], lastMerge: null };
        }
    }

    /**
     * Get all merged data
     * @returns {Promise<Object>} All merged data
     */
    async getAllMergedData() {
        try {
            const [apps, bookmarks, displayConfig] = await Promise.all([
                this.getMergedData('apps'),
                this.getMergedData('bookmarks'),
                this.adapter.load('merged/display_config')
            ]);

            return {
                apps,
                bookmarks,
                displayConfig: displayConfig || {},
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get all merged data:', error);
            return {
                apps: { items: [] },
                bookmarks: { items: [] },
                displayConfig: {},
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Force refresh and merge all data
     * @returns {Promise<Object>} Refresh result
     */
    async refreshAndMerge() {
        try {
            const result = await this.performMerge();
            return result;
        } catch (error) {
            console.error('Failed to refresh and merge:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update merge history
     * @param {Object} mergeResult - Merge result
     */
    async updateMergeHistory(mergeResult) {
        try {
            const history = await this.adapter.load('sync/merge_history') || { merges: [] };
            
            history.merges.push({
                timestamp: mergeResult.timestamp,
                types: mergeResult.mergedTypes,
                conflicts: mergeResult.conflicts.length,
                errors: mergeResult.errors.length,
                success: mergeResult.success
            });

            // Keep only last 100 merges
            if (history.merges.length > 100) {
                history.merges = history.merges.slice(-100);
            }

            history.lastMerge = mergeResult.timestamp;
            await this.adapter.save('sync/merge_history', history);
        } catch (error) {
            console.error('Failed to update merge history:', error);
        }
    }

    /**
     * Update conflict log
     * @param {Object[]} conflicts - Conflicts
     */
    async updateConflictLog(conflicts) {
        try {
            const conflictLog = await this.adapter.load('sync/conflict_log') || { conflicts: [] };
            
            conflictLog.conflicts.push(...conflicts);
            
            // Keep only last 500 conflicts
            if (conflictLog.conflicts.length > 500) {
                conflictLog.conflicts = conflictLog.conflicts.slice(-500);
            }

            conflictLog.lastConflict = new Date().toISOString();
            await this.adapter.save('sync/conflict_log', conflictLog);
        } catch (error) {
            console.error('Failed to update conflict log:', error);
        }
    }

    /**
     * Get system statistics
     * @returns {Promise<Object>} System statistics
     */
    async getStats() {
        try {
            const [
                rawApps,
                rawBookmarks,
                mergedApps,
                mergedBookmarks,
                mergeHistory,
                conflictLog,
                storageStats
            ] = await Promise.all([
                this.adapter.load('raw/apps_raw'),
                this.adapter.load('raw/bookmarks_raw'),
                this.adapter.load('merged/apps_final'),
                this.adapter.load('merged/bookmarks_final'),
                this.adapter.load('sync/merge_history'),
                this.adapter.load('sync/conflict_log'),
                this.adapter.getStats()
            ]);

            return {
                raw: {
                    apps: rawApps?.items?.length || 0,
                    bookmarks: rawBookmarks?.items?.length || 0
                },
                merged: {
                    apps: mergedApps?.items?.length || 0,
                    bookmarks: mergedBookmarks?.items?.length || 0
                },
                merges: mergeHistory?.merges?.length || 0,
                conflicts: conflictLog?.conflicts?.length || 0,
                storage: storageStats,
                lastMerge: this.lastMerge,
                initialized: this.initialized
            };
        } catch (error) {
            console.error('Failed to get stats:', error);
            return {
                raw: { apps: 0, bookmarks: 0 },
                merged: { apps: 0, bookmarks: 0 },
                merges: 0,
                conflicts: 0,
                storage: {},
                lastMerge: null,
                initialized: false
            };
        }
    }

    /**
     * Validate data integrity
     * @returns {Promise<Object>} Validation results
     */
    async validateIntegrity() {
        try {
            const validation = await this.adapter.validate();
            return validation;
        } catch (error) {
            console.error('Failed to validate integrity:', error);
            return {
                valid: 0,
                invalid: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Create manual backup
     * @returns {Promise<boolean>} Success status
     */
    async createBackup() {
        try {
            return await this.adapter.backup();
        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Get pending conflicts that require manual resolution
     * @returns {Promise<Object[]>} Pending conflicts
     */
    async getPendingConflicts() {
        try {
            const conflictLog = await this.adapter.load('sync/conflict_log') || { conflicts: [] };
            return conflictLog.conflicts.filter(conflict => 
                conflict.resolution?.requiresUserInput === true
            );
        } catch (error) {
            console.error('Failed to get pending conflicts:', error);
            return [];
        }
    }
}

module.exports = HybridDataManager;