/**
 * JSON Storage Adapter for Nexo Dashboard
 * Handles JSON file-based storage operations
 */

const fs = require('fs').promises;
const path = require('path');
const DataStore = require('./DataStore');

class JSONAdapter extends DataStore {
    constructor(config) {
        super(config);
        this.dataPath = config.dataPath || path.join(__dirname, '../../data');
        this.backupPath = config.backupPath || path.join(__dirname, '../../data/backups');
        this.encoding = config.encoding || 'utf8';
        
        this.ensureDirectories();
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const directories = [
            this.dataPath,
            this.backupPath,
            path.join(this.dataPath, 'raw'),
            path.join(this.dataPath, 'custom'),
            path.join(this.dataPath, 'merged'),
            path.join(this.dataPath, 'sync')
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /**
     * Get full file path for key
     * @param {string} key - Data key
     * @returns {string} Full file path
     */
    getFilePath(key) {
        return path.join(this.dataPath, `${key}.json`);
    }

    /**
     * Save data to JSON file
     * @param {string} key - Data key
     * @param {Object} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(key, data) {
        try {
            const filePath = this.getFilePath(key);
            const jsonData = JSON.stringify(data, null, 2);
            
            // Atomic write using temporary file
            const tempPath = `${filePath}.tmp`;
            await fs.writeFile(tempPath, jsonData, this.encoding);
            await fs.rename(tempPath, filePath);
            
            return true;
        } catch (error) {
            console.error(`Error saving data to ${key}:`, error);
            return false;
        }
    }

    /**
     * Load data from JSON file
     * @param {string} key - Data key
     * @returns {Promise<Object|null>} Loaded data or null
     */
    async load(key) {
        try {
            const filePath = this.getFilePath(key);
            const jsonData = await fs.readFile(filePath, this.encoding);
            return JSON.parse(jsonData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`Error loading data from ${key}:`, error);
            return null;
        }
    }

    /**
     * Delete data file
     * @param {string} key - Data key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            const filePath = this.getFilePath(key);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true; // File doesn't exist, consider it deleted
            }
            console.error(`Error deleting data file ${key}:`, error);
            return false;
        }
    }

    /**
     * Check if data file exists
     * @param {string} key - Data key
     * @returns {Promise<boolean>} Existence status
     */
    async exists(key) {
        try {
            const filePath = this.getFilePath(key);
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * List all data keys
     * @returns {Promise<string[]>} Array of keys
     */
    async listKeys() {
        try {
            const files = await fs.readdir(this.dataPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            console.error('Error listing keys:', error);
            return [];
        }
    }

    /**
     * Simple query implementation for JSON data
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Object[]>} Query results
     */
    async query(criteria) {
        try {
            const keys = await this.listKeys();
            const results = [];

            for (const key of keys) {
                const data = await this.load(key);
                if (data && this.matchesCriteria(data, criteria)) {
                    results.push({ key, data });
                }
            }

            return results;
        } catch (error) {
            console.error('Error querying data:', error);
            return [];
        }
    }

    /**
     * Check if data matches criteria
     * @param {Object} data - Data to check
     * @param {Object} criteria - Search criteria
     * @returns {boolean} Match status
     */
    matchesCriteria(data, criteria) {
        for (const [key, value] of Object.entries(criteria)) {
            if (data[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Create backup of all data
     * @param {string} backupPath - Backup location
     * @returns {Promise<boolean>} Success status
     */
    async backup(backupPath) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.backupPath, `backup-${timestamp}`);
            await fs.mkdir(backupDir, { recursive: true });

            const keys = await this.listKeys();
            for (const key of keys) {
                const data = await this.load(key);
                if (data) {
                    const backupFilePath = path.join(backupDir, `${key}.json`);
                    await fs.writeFile(backupFilePath, JSON.stringify(data, null, 2), this.encoding);
                }
            }

            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }

    /**
     * Restore data from backup
     * @param {string} backupPath - Backup location
     * @returns {Promise<boolean>} Success status
     */
    async restore(backupPath) {
        try {
            const files = await fs.readdir(backupPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const key = file.replace('.json', '');
                    const filePath = path.join(backupPath, file);
                    const data = JSON.parse(await fs.readFile(filePath, this.encoding));
                    await this.save(key, data);
                }
            }

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStats() {
        try {
            const keys = await this.listKeys();
            let totalSize = 0;
            let fileCount = 0;

            for (const key of keys) {
                const filePath = this.getFilePath(key);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                fileCount++;
            }

            return {
                fileCount,
                totalSize,
                backend: 'json',
                dataPath: this.dataPath
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                fileCount: 0,
                totalSize: 0,
                backend: 'json',
                dataPath: this.dataPath
            };
        }
    }

    /**
     * Validate data integrity
     * @returns {Promise<Object>} Validation results
     */
    async validate() {
        try {
            const keys = await this.listKeys();
            const results = {
                valid: 0,
                invalid: 0,
                errors: []
            };

            for (const key of keys) {
                try {
                    const data = await this.load(key);
                    if (data !== null) {
                        results.valid++;
                    } else {
                        results.invalid++;
                        results.errors.push(`Failed to load ${key}`);
                    }
                } catch (error) {
                    results.invalid++;
                    results.errors.push(`Error validating ${key}: ${error.message}`);
                }
            }

            return results;
        } catch (error) {
            return {
                valid: 0,
                invalid: 0,
                errors: [`Validation error: ${error.message}`]
            };
        }
    }
}

module.exports = JSONAdapter;