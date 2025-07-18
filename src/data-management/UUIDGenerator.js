/**
 * UUID Generator for Nexo Dashboard
 * Generates unique identifiers for data items
 */

class UUIDGenerator {
    /**
     * Generate UUID v4
     * @returns {string} UUID string
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generate UUID based on content hash (deterministic)
     * @param {string} content - Content to hash
     * @returns {string} UUID string
     */
    static generateFromContent(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
        return `${hexHash.substring(0, 8)}-${hexHash.substring(0, 4)}-4${hexHash.substring(1, 4)}-a${hexHash.substring(0, 3)}-${hexHash.substring(0, 12)}`;
    }

    /**
     * Validate UUID format
     * @param {string} uuid - UUID to validate
     * @returns {boolean} True if valid UUID
     */
    static isValid(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Generate short UUID (8 characters)
     * @returns {string} Short UUID
     */
    static generateShort() {
        return Math.random().toString(36).substring(2, 10);
    }
}

module.exports = UUIDGenerator;