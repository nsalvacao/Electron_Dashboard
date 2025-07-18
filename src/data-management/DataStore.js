/**
 * Abstract DataStore class for Nexo Dashboard
 * Provides interface for different storage backends
 */

class DataStore {
    constructor(config) {
        this.config = config || {};
        this.backend = this.config.backend || 'json';
        
        if (this.constructor === DataStore) {
            throw new Error('DataStore is an abstract class and cannot be instantiated directly');
        }
    }

    /**
     * Save data to storage
     * @param {string} key - Data key
     * @param {Object} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(key, data) {
        throw new Error('save() method must be implemented by subclass');
    }

    /**
     * Load data from storage
     * @param {string} key - Data key
     * @returns {Promise<Object|null>} Loaded data or null
     */
    async load(key) {
        throw new Error('load() method must be implemented by subclass');
    }

    /**
     * Delete data from storage
     * @param {string} key - Data key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        throw new Error('delete() method must be implemented by subclass');
    }

    /**
     * Check if data exists
     * @param {string} key - Data key
     * @returns {Promise<boolean>} Existence status
     */
    async exists(key) {
        throw new Error('exists() method must be implemented by subclass');
    }

    /**
     * List all keys
     * @returns {Promise<string[]>} Array of keys
     */
    async listKeys() {
        throw new Error('listKeys() method must be implemented by subclass');
    }

    /**
     * Query data based on criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Object[]>} Query results
     */
    async query(criteria) {
        throw new Error('query() method must be implemented by subclass');
    }

    /**
     * Create backup of data
     * @param {string} backupPath - Backup location
     * @returns {Promise<boolean>} Success status
     */
    async backup(backupPath) {
        throw new Error('backup() method must be implemented by subclass');
    }

    /**
     * Restore data from backup
     * @param {string} backupPath - Backup location
     * @returns {Promise<boolean>} Success status
     */
    async restore(backupPath) {
        throw new Error('restore() method must be implemented by subclass');
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStats() {
        throw new Error('getStats() method must be implemented by subclass');
    }

    /**
     * Validate data integrity
     * @returns {Promise<Object>} Validation results
     */
    async validate() {
        throw new Error('validate() method must be implemented by subclass');
    }
}

module.exports = DataStore;