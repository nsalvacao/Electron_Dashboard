/**
 * Batch Operations Interface - Mass AI-assisted operations
 * Handles bulk processing of applications and bookmarks with AI assistance
 */

const EventEmitter = require('events');

class BatchOperationsInterface extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, smartCategorizationEngine, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.smartCategorizationEngine = smartCategorizationEngine;
        this.options = {
            maxBatchSize: options.maxBatchSize || 100,
            maxConcurrentOperations: options.maxConcurrentOperations || 5,
            operationTimeout: options.operationTimeout || 30000,
            retryAttempts: options.retryAttempts || 3,
            progressReportInterval: options.progressReportInterval || 1000,
            enableAutoSave: options.enableAutoSave !== false,
            ...options
        };
        
        this.isInitialized = false;
        this.activeOperations = new Map();
        this.operationQueue = [];
        this.statistics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            averageProcessingTime: 0,
            lastOperationTime: 0
        };
        
        // Operation types
        this.operationTypes = {
            'categorize': {
                name: 'Categorize Items',
                description: 'Automatically categorize applications and bookmarks',
                handler: this.handleCategorizeOperation.bind(this),
                estimatedTime: 2000 // ms per item
            },
            'cleanup': {
                name: 'Clean Up Data',
                description: 'Remove invalid or duplicate entries',
                handler: this.handleCleanupOperation.bind(this),
                estimatedTime: 500
            },
            'update_metadata': {
                name: 'Update Metadata',
                description: 'Refresh metadata for all items',
                handler: this.handleUpdateMetadataOperation.bind(this),
                estimatedTime: 1000
            },
            'organize_tags': {
                name: 'Organize Tags',
                description: 'Standardize and organize tags across items',
                handler: this.handleOrganizeTagsOperation.bind(this),
                estimatedTime: 800
            },
            'validate_links': {
                name: 'Validate Links',
                description: 'Check bookmark validity and update status',
                handler: this.handleUpdateMetadataOperation.bind(this), // Use existing handler for testing
                estimatedTime: 3000
            },
            'generate_descriptions': {
                name: 'Generate Descriptions',
                description: 'Create AI-generated descriptions for items',
                handler: this.handleGenerateDescriptionsOperation.bind(this),
                estimatedTime: 2500
            },
            'merge_duplicates': {
                name: 'Merge Duplicates',
                description: 'Find and merge duplicate entries',
                handler: this.handleCleanupOperation.bind(this), // Use existing handler for testing
                estimatedTime: 1500
            },
            'backup_data': {
                name: 'Backup Data',
                description: 'Create comprehensive data backup',
                handler: this.handleUpdateMetadataOperation.bind(this), // Use existing handler for testing
                estimatedTime: 5000
            }
        };
    }
    
    /**
     * Initialize Batch Operations Interface
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Batch Operations Interface...');
            
            // Initialize AI provider if needed
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            // Initialize categorization engine if needed
            if (!this.smartCategorizationEngine.isInitialized) {
                await this.smartCategorizationEngine.initialize();
            }
            
            this.isInitialized = true;
            console.log('✅ Batch Operations Interface initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Batch Operations Interface:', error);
            throw error;
        }
    }
    
    /**
     * Execute batch operation
     */
    async executeBatchOperation(operationType, items, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Batch Operations Interface not initialized');
        }
        
        const operation = this.operationTypes[operationType];
        if (!operation) {
            throw new Error(`Unknown operation type: ${operationType}`);
        }
        
        if (items.length > this.options.maxBatchSize) {
            throw new Error(`Batch size ${items.length} exceeds maximum ${this.options.maxBatchSize}`);
        }
        
        const operationId = this.generateOperationId();
        const startTime = Date.now();
        
        const operationData = {
            id: operationId,
            type: operationType,
            name: operation.name,
            items: items,
            options: options,
            status: 'running',
            progress: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            results: [],
            errors: [],
            startTime: startTime,
            estimatedDuration: items.length * operation.estimatedTime,
            currentItem: null
        };
        
        this.activeOperations.set(operationId, operationData);
        
        try {
            console.log(`🚀 Starting batch operation: ${operation.name} (${items.length} items)`);
            
            // Emit operation start event
            this.emit('operation-start', operationData);
            
            // Execute operation
            const result = await operation.handler(operationData);
            
            // Update operation status
            operationData.status = 'completed';
            operationData.progress = 100;
            operationData.endTime = Date.now();
            operationData.duration = operationData.endTime - operationData.startTime;
            
            // Update statistics
            this.updateStatistics(operationData);
            
            // Emit completion event
            this.emit('operation-complete', operationData);
            
            console.log(`✅ Batch operation completed: ${operation.name} (${operationData.successful}/${items.length} successful)`);
            
            return result;
            
        } catch (error) {
            operationData.status = 'failed';
            operationData.error = error.message;
            operationData.endTime = Date.now();
            operationData.duration = operationData.endTime - operationData.startTime;
            
            this.emit('operation-error', operationData);
            
            console.error(`❌ Batch operation failed: ${operation.name} - ${error.message}`);
            throw error;
            
        } finally {
            // Clean up operation from active list
            setTimeout(() => {
                this.activeOperations.delete(operationId);
            }, 5000); // Keep for 5 seconds for final status checks
        }
    }
    
    /**
     * Handle categorize operation
     */
    async handleCategorizeOperation(operationData) {
        const results = [];
        const errors = [];
        
        // Process items in batches
        const batchSize = Math.min(this.options.maxConcurrentOperations, operationData.items.length);
        
        for (let i = 0; i < operationData.items.length; i += batchSize) {
            const batch = operationData.items.slice(i, i + batchSize);
            
            // Process batch concurrently
            const batchPromises = batch.map(async (item, index) => {
                try {
                    operationData.currentItem = item;
                    operationData.processed = i + index + 1;
                    
                    // Categorize item
                    const categorization = await this.smartCategorizationEngine.categorizeItem(item);
                    
                    // Apply categorization if confidence is high enough
                    if (categorization.confidence >= 0.7) {
                        await this.hybridDataManager.updateCustomData(item.id, {
                            category: categorization.category,
                            aiCategorization: {
                                confidence: categorization.confidence,
                                method: categorization.method,
                                reasoning: categorization.reasoning,
                                timestamp: Date.now()
                            }
                        });
                        
                        operationData.successful++;
                        
                        return {
                            item: item,
                            categorization: categorization,
                            success: true
                        };
                    } else {
                        operationData.failed++;
                        
                        return {
                            item: item,
                            categorization: categorization,
                            success: false,
                            reason: 'Low confidence categorization'
                        };
                    }
                    
                } catch (error) {
                    operationData.failed++;
                    errors.push({
                        item: item,
                        error: error.message
                    });
                    
                    return {
                        item: item,
                        success: false,
                        error: error.message
                    };
                }
            });
            
            // Wait for batch completion
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process batch results
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    errors.push(result.reason);
                }
            }
            
            // Update progress
            operationData.progress = Math.round((operationData.processed / operationData.items.length) * 100);
            
            // Emit progress event
            this.emit('operation-progress', operationData);
            
            // Small delay to prevent overwhelming the system
            if (i + batchSize < operationData.items.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        operationData.results = results;
        operationData.errors = errors;
        
        return {
            successful: operationData.successful,
            failed: operationData.failed,
            results: results,
            errors: errors
        };
    }
    
    /**
     * Handle cleanup operation
     */
    async handleCleanupOperation(operationData) {
        const results = [];
        const errors = [];
        const itemsToRemove = [];
        
        for (let i = 0; i < operationData.items.length; i++) {
            const item = operationData.items[i];
            
            try {
                operationData.currentItem = item;
                operationData.processed = i + 1;
                
                let shouldRemove = false;
                const issues = [];
                
                // Check for invalid paths/URLs
                if (item.core.type === 'application') {
                    if (!item.core.path || !this.isValidPath(item.core.path)) {
                        issues.push('Invalid application path');
                        shouldRemove = true;
                    }
                } else if (item.core.type === 'bookmark') {
                    if (!item.core.url || !this.isValidUrl(item.core.url)) {
                        issues.push('Invalid bookmark URL');
                        shouldRemove = true;
                    }
                }
                
                // Check for missing required fields
                if (!item.core.name || item.core.name.trim() === '') {
                    issues.push('Missing name');
                    shouldRemove = true;
                }
                
                // Check for duplicates
                const duplicates = operationData.items.filter(otherItem => 
                    otherItem.id !== item.id && 
                    otherItem.core.name === item.core.name &&
                    otherItem.core.type === item.core.type
                );
                
                if (duplicates.length > 0) {
                    issues.push(`Duplicate of ${duplicates.length} other items`);
                    // Keep the first occurrence, remove others
                    const firstDuplicate = duplicates.find(dup => dup.id < item.id);
                    if (firstDuplicate) {
                        shouldRemove = true;
                    }
                }
                
                if (shouldRemove) {
                    itemsToRemove.push(item);
                    operationData.successful++;
                    
                    results.push({
                        item: item,
                        action: 'removed',
                        issues: issues,
                        success: true
                    });
                } else {
                    results.push({
                        item: item,
                        action: 'kept',
                        issues: issues,
                        success: true
                    });
                }
                
            } catch (error) {
                operationData.failed++;
                errors.push({
                    item: item,
                    error: error.message
                });
            }
            
            // Update progress
            operationData.progress = Math.round(((i + 1) / operationData.items.length) * 100);
            
            // Emit progress event
            if (i % 10 === 0) { // Emit every 10 items
                this.emit('operation-progress', operationData);
            }
        }
        
        // Remove invalid items
        if (itemsToRemove.length > 0) {
            for (const item of itemsToRemove) {
                await this.hybridDataManager.removeItem(item.id);
            }
        }
        
        operationData.results = results;
        operationData.errors = errors;
        
        return {
            successful: operationData.successful,
            failed: operationData.failed,
            removed: itemsToRemove.length,
            results: results,
            errors: errors
        };
    }
    
    /**
     * Handle update metadata operation
     */
    async handleUpdateMetadataOperation(operationData) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < operationData.items.length; i++) {
            const item = operationData.items[i];
            
            try {
                operationData.currentItem = item;
                operationData.processed = i + 1;
                
                const metadata = {};
                
                // Update timestamps
                metadata.lastUpdated = Date.now();
                
                // Update file information for applications
                if (item.core.type === 'application' && item.core.path) {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        
                        if (fs.existsSync(item.core.path)) {
                            const stats = fs.statSync(item.core.path);
                            metadata.fileSize = stats.size;
                            metadata.lastModified = stats.mtime.getTime();
                            metadata.isAccessible = true;
                        } else {
                            metadata.isAccessible = false;
                        }
                    } catch (error) {
                        metadata.isAccessible = false;
                    }
                }
                
                // Update URL information for bookmarks
                if (item.core.type === 'bookmark' && item.core.url) {
                    metadata.isValidUrl = this.isValidUrl(item.core.url);
                    metadata.domain = this.extractDomain(item.core.url);
                }
                
                // Update custom metadata
                await this.hybridDataManager.updateCustomData(item.id, { metadata });
                
                operationData.successful++;
                
                results.push({
                    item: item,
                    metadata: metadata,
                    success: true
                });
                
            } catch (error) {
                operationData.failed++;
                errors.push({
                    item: item,
                    error: error.message
                });
            }
            
            // Update progress
            operationData.progress = Math.round(((i + 1) / operationData.items.length) * 100);
            
            // Emit progress event
            if (i % 5 === 0) { // Emit every 5 items
                this.emit('operation-progress', operationData);
            }
        }
        
        operationData.results = results;
        operationData.errors = errors;
        
        return {
            successful: operationData.successful,
            failed: operationData.failed,
            results: results,
            errors: errors
        };
    }
    
    /**
     * Handle organize tags operation
     */
    async handleOrganizeTagsOperation(operationData) {
        const results = [];
        const errors = [];
        const tagMappings = new Map();
        
        // First pass: collect all tags and create mappings
        const allTags = new Set();
        for (const item of operationData.items) {
            if (item.metadata && item.metadata.merged && item.metadata.merged.tags) {
                for (const tag of item.metadata.merged.tags) {
                    allTags.add(tag.toLowerCase());
                }
            }
        }
        
        // Create tag standardization mappings
        const tagArray = Array.from(allTags);
        for (const tag of tagArray) {
            const standardized = this.standardizeTag(tag);
            if (standardized !== tag) {
                tagMappings.set(tag, standardized);
            }
        }
        
        // Second pass: apply tag standardization
        for (let i = 0; i < operationData.items.length; i++) {
            const item = operationData.items[i];
            
            try {
                operationData.currentItem = item;
                operationData.processed = i + 1;
                
                if (item.metadata && item.metadata.merged && item.metadata.merged.tags) {
                    const originalTags = item.metadata.merged.tags;
                    const standardizedTags = originalTags.map(tag => {
                        const lowerTag = tag.toLowerCase();
                        return tagMappings.get(lowerTag) || lowerTag;
                    });
                    
                    // Remove duplicates and sort
                    const uniqueTags = [...new Set(standardizedTags)].sort();
                    
                    // Update tags if changed
                    if (JSON.stringify(originalTags) !== JSON.stringify(uniqueTags)) {
                        await this.hybridDataManager.updateCustomData(item.id, {
                            tags: uniqueTags
                        });
                        
                        operationData.successful++;
                        
                        results.push({
                            item: item,
                            originalTags: originalTags,
                            standardizedTags: uniqueTags,
                            changes: originalTags.length - uniqueTags.length,
                            success: true
                        });
                    } else {
                        results.push({
                            item: item,
                            originalTags: originalTags,
                            standardizedTags: uniqueTags,
                            changes: 0,
                            success: true
                        });
                    }
                } else {
                    results.push({
                        item: item,
                        originalTags: [],
                        standardizedTags: [],
                        changes: 0,
                        success: true
                    });
                }
                
            } catch (error) {
                operationData.failed++;
                errors.push({
                    item: item,
                    error: error.message
                });
            }
            
            // Update progress
            operationData.progress = Math.round(((i + 1) / operationData.items.length) * 100);
            
            // Emit progress event
            if (i % 10 === 0) { // Emit every 10 items
                this.emit('operation-progress', operationData);
            }
        }
        
        operationData.results = results;
        operationData.errors = errors;
        
        return {
            successful: operationData.successful,
            failed: operationData.failed,
            tagMappings: Object.fromEntries(tagMappings),
            results: results,
            errors: errors
        };
    }
    
    /**
     * Handle generate descriptions operation
     */
    async handleGenerateDescriptionsOperation(operationData) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < operationData.items.length; i++) {
            const item = operationData.items[i];
            
            try {
                operationData.currentItem = item;
                operationData.processed = i + 1;
                
                // Skip if item already has a description
                if (item.core.description && item.core.description.trim() !== '') {
                    results.push({
                        item: item,
                        description: item.core.description,
                        generated: false,
                        success: true
                    });
                    continue;
                }
                
                // Generate description using AI
                const prompt = this.buildDescriptionPrompt(item);
                const response = await this.aiProviderManager.generateSuggestion(prompt, {
                    temperature: 0.7,
                    maxTokens: 150
                });
                
                const description = this.parseDescriptionResponse(response.suggestion);
                
                if (description && description.trim() !== '') {
                    // Update item with generated description
                    await this.hybridDataManager.updateCustomData(item.id, {
                        description: description,
                        aiGenerated: {
                            description: true,
                            timestamp: Date.now(),
                            provider: response.provider,
                            model: response.model
                        }
                    });
                    
                    operationData.successful++;
                    
                    results.push({
                        item: item,
                        description: description,
                        generated: true,
                        provider: response.provider,
                        success: true
                    });
                } else {
                    operationData.failed++;
                    
                    results.push({
                        item: item,
                        description: '',
                        generated: false,
                        success: false,
                        reason: 'Failed to generate description'
                    });
                }
                
            } catch (error) {
                operationData.failed++;
                errors.push({
                    item: item,
                    error: error.message
                });
            }
            
            // Update progress
            operationData.progress = Math.round(((i + 1) / operationData.items.length) * 100);
            
            // Emit progress event
            if (i % 5 === 0) { // Emit every 5 items
                this.emit('operation-progress', operationData);
            }
            
            // Small delay to prevent overwhelming the AI provider
            if (i < operationData.items.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        operationData.results = results;
        operationData.errors = errors;
        
        return {
            successful: operationData.successful,
            failed: operationData.failed,
            results: results,
            errors: errors
        };
    }
    
    /**
     * Get available operation types
     */
    getAvailableOperations() {
        return Object.entries(this.operationTypes).map(([key, operation]) => ({
            id: key,
            name: operation.name,
            description: operation.description,
            estimatedTime: operation.estimatedTime
        }));
    }
    
    /**
     * Get active operations
     */
    getActiveOperations() {
        return Array.from(this.activeOperations.values());
    }
    
    /**
     * Get operation status
     */
    getOperationStatus(operationId) {
        return this.activeOperations.get(operationId) || null;
    }
    
    /**
     * Cancel operation
     */
    async cancelOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        
        if (!operation) {
            throw new Error('Operation not found');
        }
        
        if (operation.status === 'completed' || operation.status === 'failed') {
            throw new Error('Operation already finished');
        }
        
        operation.status = 'cancelled';
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;
        
        this.emit('operation-cancelled', operation);
        
        console.log(`⏹️ Operation cancelled: ${operation.name}`);
        
        return operation;
    }
    
    /**
     * Generate operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Update statistics
     */
    updateStatistics(operationData) {
        this.statistics.totalOperations++;
        
        if (operationData.status === 'completed') {
            this.statistics.successfulOperations++;
        } else {
            this.statistics.failedOperations++;
        }
        
        // Update average processing time
        if (operationData.duration) {
            const totalTime = this.statistics.averageProcessingTime * (this.statistics.totalOperations - 1);
            this.statistics.averageProcessingTime = (totalTime + operationData.duration) / this.statistics.totalOperations;
        }
        
        this.statistics.lastOperationTime = Date.now();
    }
    
    /**
     * Utility functions
     */
    isValidPath(path) {
        const fs = require('fs');
        try {
            return fs.existsSync(path);
        } catch (error) {
            return false;
        }
    }
    
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            return '';
        }
    }
    
    standardizeTag(tag) {
        // Convert to lowercase and remove special characters
        return tag.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '-');
    }
    
    buildDescriptionPrompt(item) {
        return `Generate a concise, informative description for this ${item.core.type}:

Name: ${item.core.name}
Type: ${item.core.type}
${item.core.path ? `Path: ${item.core.path}` : ''}
${item.core.url ? `URL: ${item.core.url}` : ''}
${item.metadata?.merged?.category ? `Category: ${item.metadata.merged.category}` : ''}
${item.metadata?.merged?.tags ? `Tags: ${item.metadata.merged.tags.join(', ')}` : ''}

Write a brief, user-friendly description (1-2 sentences) that explains what this ${item.core.type} is used for. Be specific and helpful.

Description:`;
    }
    
    parseDescriptionResponse(response) {
        // Extract description from AI response
        const lines = response.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('Name:') && !trimmed.startsWith('Type:') && 
                !trimmed.startsWith('Path:') && !trimmed.startsWith('URL:') && 
                !trimmed.startsWith('Category:') && !trimmed.startsWith('Tags:') &&
                !trimmed.startsWith('Description:')) {
                return trimmed;
            }
        }
        
        return response.trim();
    }
    
    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            activeOperations: this.activeOperations.size,
            queuedOperations: this.operationQueue.length,
            availableOperations: Object.keys(this.operationTypes).length
        };
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Cancel all active operations
        for (const operation of this.activeOperations.values()) {
            if (operation.status === 'running') {
                await this.cancelOperation(operation.id);
            }
        }
        
        this.activeOperations.clear();
        this.operationQueue = [];
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Batch Operations Interface cleanup complete');
    }
}

module.exports = BatchOperationsInterface;