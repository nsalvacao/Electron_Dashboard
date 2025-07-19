/**
 * Natural Language Interface - Chat-based commands and interactions
 * Provides natural language processing for user commands and queries
 */

const EventEmitter = require('events');

class NaturalLanguageInterface extends EventEmitter {
    constructor(aiProviderManager, hybridDataManager, smartCategorizationEngine, batchOperationsInterface, usageAnalytics, options = {}) {
        super();
        
        this.aiProviderManager = aiProviderManager;
        this.hybridDataManager = hybridDataManager;
        this.smartCategorizationEngine = smartCategorizationEngine;
        this.batchOperationsInterface = batchOperationsInterface;
        this.usageAnalytics = usageAnalytics;
        this.options = {
            enableContextualMemory: options.enableContextualMemory !== false,
            maxContextLength: options.maxContextLength || 10,
            responseTimeout: options.responseTimeout || 30000,
            enableCommandSuggestions: options.enableCommandSuggestions !== false,
            conversationRetentionDays: options.conversationRetentionDays || 7,
            ...options
        };
        
        this.isInitialized = false;
        this.conversationHistory = [];
        this.contextualMemory = new Map();
        this.commandHistory = [];
        this.activeSession = null;
        
        // Command categories and patterns
        this.commandCategories = {
            'search': {
                name: 'Search & Find',
                patterns: [
                    /find.*(?:app|application|program).*(?:called|named|with)\s+(.+)/i,
                    /search.*(?:for|app|application).*(.+)/i,
                    /where.*(?:is|app|application).*(.+)/i,
                    /show.*(?:me|all).*(?:apps|applications).*(?:in|from|with).*(.+)/i,
                    /list.*(?:apps|applications).*(?:in|from|with).*(.+)/i
                ],
                handler: this.handleSearchCommand.bind(this)
            },
            'organize': {
                name: 'Organization & Management',
                patterns: [
                    /(?:organize|categorize|sort).*(?:apps|applications|bookmarks)/i,
                    /(?:create|add|make).*(?:category|folder|group).*(?:for|called|named)\s+(.+)/i,
                    /(?:move|put|place).*(.+).*(?:to|in|into).*(?:category|folder|group)\s+(.+)/i,
                    /(?:remove|delete|clean up).*(?:unused|old|duplicate).*(?:apps|applications|bookmarks)/i,
                    /(?:merge|combine).*(?:duplicate|similar).*(?:apps|applications|bookmarks)/i
                ],
                handler: this.handleOrganizeCommand.bind(this)
            },
            'analyze': {
                name: 'Analytics & Insights',
                patterns: [
                    /(?:analyze|show|tell me about).*(?:usage|statistics|analytics|patterns)/i,
                    /(?:what|which).*(?:apps|applications).*(?:most|least|often|frequently|rarely)/i,
                    /(?:how|when).*(?:do i use|am i using).*(.+)/i,
                    /(?:productivity|efficiency).*(?:report|analysis|score)/i,
                    /(?:insights|recommendations|suggestions).*(?:for|about).*(?:productivity|efficiency|organization)/i
                ],
                handler: this.handleAnalyzeCommand.bind(this)
            },
            'configure': {
                name: 'Configuration & Settings',
                patterns: [
                    /(?:configure|setup|set up).*(?:ai|provider|ollama|openai|anthropic)/i,
                    /(?:change|update|modify).*(?:settings|preferences|configuration)/i,
                    /(?:enable|disable|turn on|turn off).*(.+)/i,
                    /(?:set|configure).*(?:cost|budget|limit).*(?:to|for)\s*(.+)/i,
                    /(?:backup|export|import).*(?:data|configuration|settings)/i
                ],
                handler: this.handleConfigureCommand.bind(this)
            },
            'help': {
                name: 'Help & Information',
                patterns: [
                    /(?:help|what can you do|what commands|how do i)/i,
                    /(?:explain|tell me about|what is).*(.+)/i,
                    /(?:how to|how do i).*(.+)/i,
                    /(?:tutorial|guide|documentation).*(?:for|about).*(.+)/i,
                    /(?:examples|sample|demo).*(?:of|for).*(.+)/i
                ],
                handler: this.handleHelpCommand.bind(this)
            },
            'batch': {
                name: 'Batch Operations',
                patterns: [
                    /(?:batch|bulk|mass).*(?:categorize|organize|update|clean).*(?:apps|applications|bookmarks)/i,
                    /(?:update|refresh|sync).*(?:all|metadata|information).*(?:apps|applications|bookmarks)/i,
                    /(?:validate|check|verify).*(?:all|links|bookmarks|urls)/i,
                    /(?:generate|create|add).*(?:descriptions|summaries).*(?:for|to).*(?:all|apps|applications|bookmarks)/i,
                    /(?:run|execute|perform).*(?:cleanup|maintenance|optimization)/i
                ],
                handler: this.handleBatchCommand.bind(this)
            }
        };
        
        // Statistics
        this.statistics = {
            totalConversations: 0,
            totalCommands: 0,
            successfulCommands: 0,
            averageResponseTime: 0,
            mostUsedCategory: null,
            lastInteraction: 0
        };
    }
    
    /**
     * Initialize Natural Language Interface
     */
    async initialize() {
        try {
            console.log('🗣️ Initializing Natural Language Interface...');
            
            // Initialize AI provider if needed
            if (!this.aiProviderManager.isInitialized) {
                await this.aiProviderManager.initialize();
            }
            
            // Initialize other components if needed
            if (!this.smartCategorizationEngine.isInitialized) {
                await this.smartCategorizationEngine.initialize();
            }
            
            if (!this.batchOperationsInterface.isInitialized) {
                await this.batchOperationsInterface.initialize();
            }
            
            if (!this.usageAnalytics.isInitialized) {
                await this.usageAnalytics.initialize();
            }
            
            // Start new session
            this.startNewSession();
            
            this.isInitialized = true;
            console.log('✅ Natural Language Interface initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Natural Language Interface:', error);
            throw error;
        }
    }
    
    /**
     * Start new conversation session
     */
    startNewSession() {
        this.activeSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            context: {},
            commands: [],
            lastActivity: Date.now()
        };
        
        this.statistics.totalConversations++;
        
        console.log(`💬 Started new conversation session: ${this.activeSession.id}`);
    }
    
    /**
     * Process natural language command
     */
    async processCommand(userInput, context = {}) {
        if (!this.isInitialized) {
            throw new Error('Natural Language Interface not initialized');
        }
        
        const startTime = Date.now();
        
        try {
            console.log(`🗣️ Processing command: "${userInput}"`);
            
            // Update session activity
            if (this.activeSession) {
                this.activeSession.lastActivity = Date.now();
            }
            
            // Parse command
            const commandInfo = await this.parseCommand(userInput, context);
            
            // Execute command
            const result = await this.executeCommand(commandInfo, context);
            
            // Update conversation history
            this.updateConversationHistory(userInput, result, context);
            
            // Update statistics
            this.updateStatistics(commandInfo, Date.now() - startTime);
            
            console.log(`✅ Command processed successfully in ${Date.now() - startTime}ms`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Command processing failed: ${error.message}`);
            
            const errorResult = {
                success: false,
                error: error.message,
                response: "I'm sorry, I couldn't understand or execute that command. Please try rephrasing or ask for help.",
                suggestions: this.getCommandSuggestions(userInput)
            };
            
            this.updateConversationHistory(userInput, errorResult, context);
            
            return errorResult;
        }
    }
    
    /**
     * Parse natural language command
     */
    async parseCommand(userInput, context) {
        // First, try pattern matching
        const patternMatch = this.matchCommandPattern(userInput);
        
        if (patternMatch) {
            return {
                category: patternMatch.category,
                type: patternMatch.type,
                parameters: patternMatch.parameters,
                confidence: patternMatch.confidence,
                method: 'pattern_match'
            };
        }
        
        // If no pattern match, use AI parsing
        return await this.aiParseCommand(userInput, context);
    }
    
    /**
     * Match command against patterns
     */
    matchCommandPattern(userInput) {
        for (const [categoryId, category] of Object.entries(this.commandCategories)) {
            for (const pattern of category.patterns) {
                const match = userInput.match(pattern);
                
                if (match) {
                    return {
                        category: categoryId,
                        type: category.name,
                        parameters: match.slice(1).filter(p => p !== undefined),
                        confidence: 0.9,
                        pattern: pattern.toString()
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * AI-based command parsing
     */
    async aiParseCommand(userInput, context) {
        const prompt = this.buildParsingPrompt(userInput, context);
        
        try {
            const response = await this.aiProviderManager.generateSuggestion(prompt, {
                temperature: 0.3,
                maxTokens: 200
            });
            
            return this.parseAIResponse(response.suggestion);
            
        } catch (error) {
            console.error('❌ AI parsing failed:', error);
            
            return {
                category: 'help',
                type: 'Help & Information',
                parameters: [userInput],
                confidence: 0.3,
                method: 'ai_fallback'
            };
        }
    }
    
    /**
     * Build parsing prompt
     */
    buildParsingPrompt(userInput, context) {
        const availableCommands = Object.keys(this.commandCategories).join(', ');
        const recentCommands = this.commandHistory.slice(-3).map(cmd => cmd.input).join(', ');
        
        return `Parse this user command and classify it into one of these categories: ${availableCommands}

User command: "${userInput}"

Context:
- Recent commands: ${recentCommands || 'None'}
- Available data: applications, bookmarks, usage analytics, AI providers

Respond in this exact format:
Category: [category_name]
Parameters: [extracted_parameters]
Confidence: [0.0-1.0]
Intent: [brief_description]

Examples:
- "find all development apps" → Category: search, Parameters: development apps, Confidence: 0.9
- "organize my bookmarks" → Category: organize, Parameters: bookmarks, Confidence: 0.8
- "show usage statistics" → Category: analyze, Parameters: usage statistics, Confidence: 0.9`;
    }
    
    /**
     * Parse AI response
     */
    parseAIResponse(response) {
        const lines = response.split('\n');
        let category = 'help';
        let parameters = [];
        let confidence = 0.5;
        let intent = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('Category:')) {
                category = trimmed.replace('Category:', '').trim().toLowerCase();
            } else if (trimmed.startsWith('Parameters:')) {
                const paramStr = trimmed.replace('Parameters:', '').trim();
                parameters = paramStr ? paramStr.split(',').map(p => p.trim()) : [];
            } else if (trimmed.startsWith('Confidence:')) {
                confidence = parseFloat(trimmed.replace('Confidence:', '').trim()) || 0.5;
            } else if (trimmed.startsWith('Intent:')) {
                intent = trimmed.replace('Intent:', '').trim();
            }
        }
        
        return {
            category: category,
            type: this.commandCategories[category]?.name || 'Unknown',
            parameters: parameters,
            confidence: confidence,
            intent: intent,
            method: 'ai_parse'
        };
    }
    
    /**
     * Execute parsed command
     */
    async executeCommand(commandInfo, context) {
        const category = this.commandCategories[commandInfo.category];
        
        if (!category) {
            throw new Error(`Unknown command category: ${commandInfo.category}`);
        }
        
        return await category.handler(commandInfo, context);
    }
    
    /**
     * Handle search command
     */
    async handleSearchCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const searchTerm = parameters[0] || '';
        
        if (!searchTerm) {
            return {
                success: false,
                response: "Please specify what you're looking for.",
                suggestions: ["find development apps", "search for productivity tools", "show all bookmarks"]
            };
        }
        
        // Search in hybrid data
        const mergedData = await this.hybridDataManager.getAllMergedData();
        const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
        
        const results = allItems.filter(item => {
            const searchText = `${item.core.name} ${item.core.description || ''} ${item.metadata?.merged?.category || ''}`.toLowerCase();
            return searchText.includes(searchTerm.toLowerCase());
        });
        
        const response = results.length > 0 ? 
            `Found ${results.length} item(s) matching "${searchTerm}":` : 
            `No items found matching "${searchTerm}".`;
        
        return {
            success: true,
            response: response,
            data: results,
            count: results.length,
            searchTerm: searchTerm
        };
    }
    
    /**
     * Handle organize command
     */
    async handleOrganizeCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const action = parameters[0] || '';
        
        if (action.toLowerCase().includes('categorize') || action.toLowerCase().includes('organize')) {
            // Trigger smart categorization
            const mergedData = await this.hybridDataManager.getAllMergedData();
            const allItems = [...(mergedData.apps || []), ...(mergedData.bookmarks || [])];
            
            const uncategorizedItems = allItems.filter(item => 
                !item.metadata?.merged?.category || 
                item.metadata.merged.category === 'uncategorized'
            );
            
            if (uncategorizedItems.length === 0) {
                return {
                    success: true,
                    response: "All items are already categorized!",
                    data: { categorizedItems: allItems.length }
                };
            }
            
            // Use batch operations for categorization
            const operation = await this.batchOperationsInterface.executeBatchOperation(
                'categorize', 
                uncategorizedItems.slice(0, 50) // Limit to 50 items
            );
            
            return {
                success: true,
                response: `Categorized ${operation.successful} out of ${uncategorizedItems.length} items.`,
                data: operation
            };
        }
        
        return {
            success: true,
            response: "Organization command recognized. Please specify what you'd like to organize.",
            suggestions: [
                "categorize all apps",
                "organize bookmarks by category",
                "clean up unused items",
                "merge duplicate entries"
            ]
        };
    }
    
    /**
     * Handle analyze command
     */
    async handleAnalyzeCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const analysisType = parameters[0] || 'usage';
        
        if (analysisType.toLowerCase().includes('usage') || analysisType.toLowerCase().includes('statistics')) {
            // Generate usage analytics
            const dashboardData = await this.usageAnalytics.getDashboardData();
            
            const summary = dashboardData.summary;
            const productivity = dashboardData.charts.productivityScore;
            
            const response = `Usage Analysis Summary:
• Total items: ${summary.totalItems}
• Active items: ${summary.activeItems}
• Total usage events: ${summary.totalUsage}
• Productivity score: ${productivity?.productivityScore || 'N/A'}%
• Top insights: ${dashboardData.insights.length} generated`;
            
            return {
                success: true,
                response: response,
                data: dashboardData
            };
        }
        
        return {
            success: true,
            response: "Analytics command recognized. What would you like to analyze?",
            suggestions: [
                "show usage statistics",
                "analyze productivity patterns",
                "display most used apps",
                "generate insights report"
            ]
        };
    }
    
    /**
     * Handle configure command
     */
    async handleConfigureCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const configType = parameters[0] || '';
        
        if (configType.toLowerCase().includes('ai') || configType.toLowerCase().includes('provider')) {
            // Show AI provider status
            const providers = this.aiProviderManager.getAvailableProviders();
            const activeProvider = this.aiProviderManager.getActiveProvider();
            
            const response = `AI Provider Configuration:
• Active provider: ${activeProvider || 'None'}
• Available providers: ${providers.join(', ')}
• Status: ${this.aiProviderManager.isInitialized ? 'Initialized' : 'Not initialized'}`;
            
            return {
                success: true,
                response: response,
                data: {
                    activeProvider: activeProvider,
                    availableProviders: providers,
                    isInitialized: this.aiProviderManager.isInitialized
                }
            };
        }
        
        return {
            success: true,
            response: "Configuration command recognized. What would you like to configure?",
            suggestions: [
                "configure AI provider",
                "set up cost limits",
                "enable/disable features",
                "backup configuration"
            ]
        };
    }
    
    /**
     * Handle help command
     */
    async handleHelpCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const topic = parameters[0] || '';
        
        if (topic) {
            // Specific help topic
            const helpContent = this.getHelpContent(topic);
            return {
                success: true,
                response: helpContent,
                data: { topic: topic }
            };
        }
        
        // General help
        const availableCommands = Object.values(this.commandCategories).map(cat => cat.name);
        
        const response = `I can help you with:
${availableCommands.map(cmd => `• ${cmd}`).join('\n')}

Try saying things like:
• "find development apps"
• "organize my bookmarks"
• "show usage statistics"
• "configure AI provider"
• "help with categorization"`;
        
        return {
            success: true,
            response: response,
            data: { availableCommands: availableCommands }
        };
    }
    
    /**
     * Handle batch command
     */
    async handleBatchCommand(commandInfo, context) {
        const parameters = commandInfo.parameters;
        const batchType = parameters[0] || '';
        
        // Show available batch operations
        const availableOperations = this.batchOperationsInterface.getAvailableOperations();
        
        if (batchType.toLowerCase().includes('categorize')) {
            // Show categorization operation
            const categorizeOp = availableOperations.find(op => op.id === 'categorize');
            
            return {
                success: true,
                response: `Batch Categorization Available:
• ${categorizeOp.name}: ${categorizeOp.description}
• Estimated time: ${categorizeOp.estimatedTime}ms per item
• Status: Ready to execute`,
                data: categorizeOp
            };
        }
        
        const response = `Available batch operations:
${availableOperations.map(op => `• ${op.name}: ${op.description}`).join('\n')}

Say something like "batch categorize all apps" to start.`;
        
        return {
            success: true,
            response: response,
            data: { availableOperations: availableOperations }
        };
    }
    
    /**
     * Get help content for specific topic
     */
    getHelpContent(topic) {
        const helpTopics = {
            'search': 'Search for apps and bookmarks using natural language. Try: "find development apps", "search for productivity tools"',
            'organize': 'Organize your items automatically. Try: "categorize all apps", "organize bookmarks", "clean up unused items"',
            'analyze': 'Get insights about your usage patterns. Try: "show usage statistics", "analyze productivity", "generate insights"',
            'configure': 'Configure AI providers and settings. Try: "configure AI provider", "set cost limits", "backup settings"',
            'batch': 'Perform bulk operations on your data. Try: "batch categorize apps", "bulk update metadata", "cleanup duplicates"'
        };
        
        return helpTopics[topic.toLowerCase()] || 
               `I don't have specific help for "${topic}". Try asking about: search, organize, analyze, configure, or batch operations.`;
    }
    
    /**
     * Get command suggestions
     */
    getCommandSuggestions(userInput) {
        const suggestions = [
            "find apps in development category",
            "organize all my bookmarks",
            "show usage statistics",
            "help with categorization",
            "batch categorize uncategorized items"
        ];
        
        // Filter suggestions based on input similarity
        return suggestions.filter(suggestion => 
            this.calculateSimilarity(userInput.toLowerCase(), suggestion.toLowerCase()) > 0.3
        ).slice(0, 3);
    }
    
    /**
     * Calculate string similarity
     */
    calculateSimilarity(str1, str2) {
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let commonWords = 0;
        for (const word1 of words1) {
            if (words2.includes(word1)) {
                commonWords++;
            }
        }
        
        return commonWords / Math.max(words1.length, words2.length);
    }
    
    /**
     * Update conversation history
     */
    updateConversationHistory(userInput, result, context) {
        const conversationEntry = {
            id: this.generateConversationId(),
            timestamp: Date.now(),
            sessionId: this.activeSession?.id,
            userInput: userInput,
            result: result,
            context: context
        };
        
        this.conversationHistory.push(conversationEntry);
        
        // Limit history size
        if (this.conversationHistory.length > this.options.maxContextLength * 10) {
            this.conversationHistory = this.conversationHistory.slice(-this.options.maxContextLength * 10);
        }
        
        // Update contextual memory
        if (this.options.enableContextualMemory) {
            this.updateContextualMemory(conversationEntry);
        }
    }
    
    /**
     * Update contextual memory
     */
    updateContextualMemory(conversationEntry) {
        const context = {
            recentCommands: this.conversationHistory.slice(-3).map(entry => entry.userInput),
            successfulCommands: this.conversationHistory.filter(entry => entry.result.success).length,
            preferredCommands: this.getMostUsedCommands(),
            sessionLength: this.conversationHistory.filter(entry => entry.sessionId === this.activeSession?.id).length
        };
        
        this.contextualMemory.set('current_context', context);
    }
    
    /**
     * Get most used commands
     */
    getMostUsedCommands() {
        const commandCounts = {};
        
        for (const entry of this.conversationHistory) {
            const command = entry.userInput.toLowerCase();
            commandCounts[command] = (commandCounts[command] || 0) + 1;
        }
        
        return Object.entries(commandCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([command, count]) => ({ command, count }));
    }
    
    /**
     * Update statistics
     */
    updateStatistics(commandInfo, responseTime) {
        this.statistics.totalCommands++;
        this.statistics.lastInteraction = Date.now();
        
        if (commandInfo.category) {
            this.statistics.successfulCommands++;
            
            // Update most used category
            const categoryCount = this.commandHistory.filter(cmd => cmd.category === commandInfo.category).length;
            if (!this.statistics.mostUsedCategory || categoryCount > this.statistics.mostUsedCategory.count) {
                this.statistics.mostUsedCategory = {
                    category: commandInfo.category,
                    count: categoryCount
                };
            }
        }
        
        // Update average response time
        this.statistics.averageResponseTime = 
            (this.statistics.averageResponseTime * (this.statistics.totalCommands - 1) + responseTime) / 
            this.statistics.totalCommands;
        
        // Update command history
        this.commandHistory.push({
            ...commandInfo,
            timestamp: Date.now(),
            responseTime: responseTime
        });
        
        // Limit command history
        if (this.commandHistory.length > 100) {
            this.commandHistory = this.commandHistory.slice(-100);
        }
    }
    
    /**
     * Generate session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate conversation ID
     */
    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get conversation history
     */
    getConversationHistory(sessionId = null) {
        if (sessionId) {
            return this.conversationHistory.filter(entry => entry.sessionId === sessionId);
        }
        
        return this.conversationHistory;
    }
    
    /**
     * Get active session
     */
    getActiveSession() {
        return this.activeSession;
    }
    
    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            currentSession: this.activeSession?.id,
            conversationHistorySize: this.conversationHistory.length,
            commandHistorySize: this.commandHistory.length,
            contextualMemorySize: this.contextualMemory.size
        };
    }
    
    /**
     * Export conversation data
     */
    exportData() {
        return {
            conversationHistory: this.conversationHistory.slice(-50), // Last 50 conversations
            commandHistory: this.commandHistory.slice(-50), // Last 50 commands
            contextualMemory: Object.fromEntries(this.contextualMemory),
            statistics: this.statistics,
            activeSession: this.activeSession,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import conversation data
     */
    async importData(data) {
        if (data.conversationHistory) {
            this.conversationHistory = data.conversationHistory;
        }
        
        if (data.commandHistory) {
            this.commandHistory = data.commandHistory;
        }
        
        if (data.contextualMemory) {
            this.contextualMemory = new Map(Object.entries(data.contextualMemory));
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        if (data.activeSession) {
            this.activeSession = data.activeSession;
        }
        
        console.log('📥 Conversation data imported');
    }
    
    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        this.commandHistory = [];
        this.contextualMemory.clear();
        
        // Reset statistics
        this.statistics = {
            totalConversations: 0,
            totalCommands: 0,
            successfulCommands: 0,
            averageResponseTime: 0,
            mostUsedCategory: null,
            lastInteraction: 0
        };
        
        console.log('🗑️ Conversation history cleared');
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Export final conversation data
        const exportData = this.exportData();
        
        // Clear data
        this.conversationHistory = [];
        this.commandHistory = [];
        this.contextualMemory.clear();
        this.activeSession = null;
        this.removeAllListeners();
        
        this.isInitialized = false;
        console.log('🧹 Natural Language Interface cleanup complete');
        
        return exportData;
    }
}

module.exports = NaturalLanguageInterface;