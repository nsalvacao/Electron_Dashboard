/**
 * Migration script for converting existing data to hybrid structure
 * Migrates from legacy JSON files to new hybrid data architecture
 */

const fs = require('fs').promises;
const path = require('path');
const HybridDataManager = require('./HybridDataManager');
const UUIDGenerator = require('./UUIDGenerator');

class DataMigrator {
    constructor(config = {}) {
        this.config = {
            dataPath: config.dataPath || path.join(__dirname, '../../data'),
            backupPath: config.backupPath || path.join(__dirname, '../../data/backups'),
            legacyPath: config.legacyPath || path.join(__dirname, '../../data'),
            ...config
        };

        this.hybridManager = new HybridDataManager(this.config);
    }

    /**
     * Perform complete migration
     * @returns {Promise<Object>} Migration result
     */
    async migrate() {
        const migrationResult = {
            success: false,
            timestamp: new Date().toISOString(),
            migrated: [],
            errors: [],
            stats: {
                apps: 0,
                bookmarks: 0,
                customizations: 0
            }
        };

        try {
            console.log('Starting migration to hybrid data structure...');

            // 1. Create backup of existing data
            console.log('Creating backup...');
            const backupResult = await this.createMigrationBackup();
            if (!backupResult.success) {
                migrationResult.errors.push('Failed to create backup');
                return migrationResult;
            }

            // 2. Initialize hybrid data manager
            console.log('Initializing hybrid data manager...');
            await this.hybridManager.initialize();

            // 3. Migrate apps data
            console.log('Migrating apps data...');
            const appsResult = await this.migrateApps();
            migrationResult.stats.apps = appsResult.count;
            if (appsResult.success) {
                migrationResult.migrated.push('apps');
            } else {
                migrationResult.errors.push(`Apps migration failed: ${appsResult.error}`);
            }

            // 4. Migrate bookmarks data
            console.log('Migrating bookmarks data...');
            const bookmarksResult = await this.migrateBookmarks();
            migrationResult.stats.bookmarks = bookmarksResult.count;
            if (bookmarksResult.success) {
                migrationResult.migrated.push('bookmarks');
            } else {
                migrationResult.errors.push(`Bookmarks migration failed: ${bookmarksResult.error}`);
            }

            // 5. Migrate custom data (if exists)
            console.log('Migrating custom data...');
            const customResult = await this.migrateCustomData();
            migrationResult.stats.customizations = customResult.count;
            if (customResult.success) {
                migrationResult.migrated.push('customizations');
            } else {
                migrationResult.errors.push(`Custom data migration failed: ${customResult.error}`);
            }

            // 6. Perform initial merge
            console.log('Performing initial merge...');
            const mergeResult = await this.hybridManager.performMerge();
            if (!mergeResult.success) {
                migrationResult.errors.push('Initial merge failed');
            }

            // 7. Validate migration
            console.log('Validating migration...');
            const validationResult = await this.validateMigration();
            if (!validationResult.success) {
                migrationResult.errors.push('Migration validation failed');
            }

            migrationResult.success = migrationResult.errors.length === 0;
            
            if (migrationResult.success) {
                console.log('Migration completed successfully!');
                console.log(`Migrated: ${migrationResult.stats.apps} apps, ${migrationResult.stats.bookmarks} bookmarks`);
            } else {
                console.error('Migration completed with errors:', migrationResult.errors);
            }

            return migrationResult;

        } catch (error) {
            console.error('Migration failed:', error);
            migrationResult.errors.push(`Migration failed: ${error.message}`);
            return migrationResult;
        }
    }

    /**
     * Create backup before migration
     * @returns {Promise<Object>} Backup result
     */
    async createMigrationBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.config.backupPath, `pre-migration-${timestamp}`);
            await fs.mkdir(backupDir, { recursive: true });

            const filesToBackup = [
                'apps_startmenu.json',
                'links_web.json',
                'apps_custom.json',
                'config.json'
            ];

            for (const file of filesToBackup) {
                const sourcePath = path.join(this.config.legacyPath, file);
                const destPath = path.join(backupDir, file);
                
                try {
                    await fs.copyFile(sourcePath, destPath);
                    console.log(`Backed up: ${file}`);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.warn(`Failed to backup ${file}:`, error.message);
                    }
                }
            }

            return { success: true, backupPath: backupDir };
        } catch (error) {
            console.error('Failed to create migration backup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Migrate apps data
     * @returns {Promise<Object>} Migration result
     */
    async migrateApps() {
        try {
            const appsFile = path.join(this.config.legacyPath, 'apps_startmenu.json');
            let appsData = [];

            try {
                const rawData = await fs.readFile(appsFile, 'utf8');
                appsData = JSON.parse(rawData);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('No existing apps data found');
                    return { success: true, count: 0 };
                }
                throw error;
            }

            // Convert to hybrid format
            const hybridApps = appsData.map(app => this.convertAppToHybrid(app));

            // Save to hybrid structure
            await this.hybridManager.addRawData('apps', hybridApps);

            return { success: true, count: hybridApps.length };
        } catch (error) {
            console.error('Failed to migrate apps:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }

    /**
     * Migrate bookmarks data
     * @returns {Promise<Object>} Migration result
     */
    async migrateBookmarks() {
        try {
            const bookmarksFile = path.join(this.config.legacyPath, 'links_web.json');
            let bookmarksData = [];

            try {
                const rawData = await fs.readFile(bookmarksFile, 'utf8');
                bookmarksData = JSON.parse(rawData);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('No existing bookmarks data found');
                    return { success: true, count: 0 };
                }
                throw error;
            }

            // Convert to hybrid format
            const hybridBookmarks = bookmarksData.map(bookmark => this.convertBookmarkToHybrid(bookmark));

            // Save to hybrid structure
            await this.hybridManager.addRawData('bookmarks', hybridBookmarks);

            return { success: true, count: hybridBookmarks.length };
        } catch (error) {
            console.error('Failed to migrate bookmarks:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }

    /**
     * Migrate custom data
     * @returns {Promise<Object>} Migration result
     */
    async migrateCustomData() {
        try {
            const customFile = path.join(this.config.legacyPath, 'apps_custom.json');
            let customData = [];

            try {
                const rawData = await fs.readFile(customFile, 'utf8');
                customData = JSON.parse(rawData);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('No existing custom data found');
                    return { success: true, count: 0 };
                }
                throw error;
            }

            // Convert to hybrid format
            const hybridCustom = {
                customizations: customData.map(item => this.convertCustomToHybrid(item)),
                lastUpdate: new Date().toISOString(),
                source: 'migration'
            };

            // Save to hybrid structure
            await this.hybridManager.addCustomData('organization', hybridCustom);

            return { success: true, count: hybridCustom.customizations.length };
        } catch (error) {
            console.error('Failed to migrate custom data:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }

    /**
     * Convert app to hybrid format
     * @param {Object} app - Legacy app data
     * @returns {Object} Hybrid app data
     */
    convertAppToHybrid(app) {
        const id = UUIDGenerator.generateFromContent(app.name + app.path);
        const timestamp = new Date().toISOString();

        return {
            id: id,
            core: {
                name: app.name,
                path: app.path,
                type: 'application',
                source: 'startmenu_scan'
            },
            metadata: {
                category: app.category || 'Uncategorized',
                tags: app.tags || [],
                notes: app.notes || '',
                priority: app.priority || 'medium',
                lastScan: timestamp,
                confidence: 0.8
            },
            tracking: {
                created: timestamp,
                firstSeen: timestamp,
                lastSeen: timestamp,
                userInteractions: 0,
                lastLaunched: null
            }
        };
    }

    /**
     * Convert bookmark to hybrid format
     * @param {Object} bookmark - Legacy bookmark data
     * @returns {Object} Hybrid bookmark data
     */
    convertBookmarkToHybrid(bookmark) {
        const id = UUIDGenerator.generateFromContent(bookmark.name + bookmark.url);
        const timestamp = new Date().toISOString();

        return {
            id: id,
            core: {
                name: bookmark.name,
                url: bookmark.url,
                type: 'bookmark',
                source: 'browser_extraction'
            },
            metadata: {
                category: bookmark.category || 'Uncategorized',
                tags: bookmark.tags || [],
                notes: bookmark.notes || '',
                priority: bookmark.priority || 'medium',
                lastScan: timestamp,
                confidence: 0.9
            },
            tracking: {
                created: timestamp,
                firstSeen: timestamp,
                lastSeen: timestamp,
                userInteractions: 0,
                lastLaunched: null
            }
        };
    }

    /**
     * Convert custom data to hybrid format
     * @param {Object} custom - Legacy custom data
     * @returns {Object} Hybrid custom data
     */
    convertCustomToHybrid(custom) {
        const timestamp = new Date().toISOString();

        return {
            id: custom.id || UUIDGenerator.generateFromContent(custom.name + custom.path),
            type: custom.type || 'apps',
            metadata: {
                category: custom.category,
                tags: custom.tags || [],
                notes: custom.notes || '',
                priority: custom.priority || 'medium',
                lastModified: timestamp,
                modifiedBy: 'user'
            },
            tracking: {
                created: timestamp,
                userInteractions: custom.userInteractions || 0,
                lastLaunched: custom.lastLaunched || null
            }
        };
    }

    /**
     * Validate migration results
     * @returns {Promise<Object>} Validation result
     */
    async validateMigration() {
        try {
            const stats = await this.hybridManager.getStats();
            const integrity = await this.hybridManager.validateIntegrity();
            
            const validation = {
                success: true,
                stats: stats,
                integrity: integrity,
                errors: []
            };

            if (integrity.invalid > 0) {
                validation.success = false;
                validation.errors.push(`Data integrity issues: ${integrity.invalid} invalid items`);
            }

            if (stats.merged.apps === 0 && stats.merged.bookmarks === 0) {
                validation.success = false;
                validation.errors.push('No data was migrated');
            }

            return validation;
        } catch (error) {
            return {
                success: false,
                errors: [error.message]
            };
        }
    }

    /**
     * Rollback migration (restore from backup)
     * @param {string} backupPath - Path to backup
     * @returns {Promise<Object>} Rollback result
     */
    async rollback(backupPath) {
        try {
            console.log('Rolling back migration...');
            
            // Restore files from backup
            const files = await fs.readdir(backupPath);
            
            for (const file of files) {
                const sourcePath = path.join(backupPath, file);
                const destPath = path.join(this.config.legacyPath, file);
                await fs.copyFile(sourcePath, destPath);
                console.log(`Restored: ${file}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Rollback failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// CLI interface
if (require.main === module) {
    const migrator = new DataMigrator();
    
    migrator.migrate()
        .then(result => {
            if (result.success) {
                console.log('Migration completed successfully!');
                process.exit(0);
            } else {
                console.error('Migration failed:', result.errors);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = DataMigrator;