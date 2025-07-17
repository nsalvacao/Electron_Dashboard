const logger = require('./logger.js');

// Import dialog only when available (main process)
let dialog;
try {
    dialog = require('electron').dialog;
} catch (error) {
    // Dialog not available in renderer process or Electron not loaded yet
    dialog = null;
}

class ErrorHandler {
    constructor() {
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', {
                error: error.message,
                stack: error.stack,
                type: 'uncaughtException'
            });
            
            this.showErrorDialog('Erro Crítico', 
                'Ocorreu um erro crítico na aplicação. Por favor, reinicie o programa.');
            
            // Give time for error to be logged before exit
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection:', {
                reason: reason.toString(),
                stack: reason.stack,
                type: 'unhandledRejection'
            });
        });

        // Handle warnings
        process.on('warning', (warning) => {
            logger.warn('Process Warning:', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack
            });
        });
    }

    // Show error dialog to user
    showErrorDialog(title, message, detail = null) {
        if (!dialog) {
            console.error(`Error Dialog: ${title} - ${message}`);
            if (detail) console.error(`Detail: ${detail}`);
            return;
        }

        const options = {
            type: 'error',
            title,
            message,
            buttons: ['OK']
        };

        if (detail) {
            options.detail = detail;
        }

        dialog.showMessageBox(options);
    }

    // Handle application errors with user notification
    handleApplicationError(error, context = {}) {
        logger.error('Application Error:', {
            error: error.message,
            stack: error.stack,
            context,
            type: 'applicationError'
        });

        // Show user-friendly error message
        this.showErrorDialog('Erro na Aplicação', 
            'Ocorreu um erro durante a operação. Consulte os logs para mais detalhes.',
            error.message);
    }

    // Handle data loading errors
    handleDataError(error, dataType) {
        logger.error('Data Error:', {
            error: error.message,
            stack: error.stack,
            dataType,
            type: 'dataError'
        });

        return {
            success: false,
            error: error.message,
            type: 'dataError'
        };
    }

    // Handle file system errors
    handleFileError(error, operation, filePath) {
        logger.error('File Error:', {
            error: error.message,
            operation,
            filePath,
            type: 'fileError'
        });

        let userMessage = 'Erro ao processar ficheiro.';
        
        switch (error.code) {
            case 'ENOENT':
                userMessage = 'Ficheiro não encontrado.';
                break;
            case 'EACCES':
                userMessage = 'Permissão negada para aceder ao ficheiro.';
                break;
            case 'ENOSPC':
                userMessage = 'Espaço insuficiente no disco.';
                break;
        }

        return {
            success: false,
            error: userMessage,
            type: 'fileError'
        };
    }

    // Handle network errors
    handleNetworkError(error, url) {
        logger.error('Network Error:', {
            error: error.message,
            url,
            type: 'networkError'
        });

        return {
            success: false,
            error: 'Erro de rede. Verifique a sua ligação à internet.',
            type: 'networkError'
        };
    }

    // Handle validation errors
    handleValidationError(error, data) {
        logger.warn('Validation Error:', {
            error: error.message,
            data,
            type: 'validationError'
        });

        return {
            success: false,
            error: 'Dados inválidos fornecidos.',
            type: 'validationError'
        };
    }

    // Create error from different types
    createError(message, type = 'general', code = null) {
        const error = new Error(message);
        error.type = type;
        error.code = code;
        error.timestamp = new Date().toISOString();
        
        return error;
    }

    // Safe async operation wrapper
    async safeAsync(operation, errorHandler = null) {
        try {
            return await operation();
        } catch (error) {
            if (errorHandler) {
                return errorHandler(error);
            } else {
                this.handleApplicationError(error);
                return null;
            }
        }
    }

    // Safe sync operation wrapper
    safeSync(operation, errorHandler = null) {
        try {
            return operation();
        } catch (error) {
            if (errorHandler) {
                return errorHandler(error);
            } else {
                this.handleApplicationError(error);
                return null;
            }
        }
    }

    // Retry operation with exponential backoff
    async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    // Check if error is recoverable
    isRecoverable(error) {
        const recoverableCodes = ['ENOENT', 'ECONNRESET', 'TIMEOUT'];
        return recoverableCodes.includes(error.code);
    }

    // Format error for display
    formatError(error) {
        return {
            message: error.message,
            type: error.type || 'unknown',
            code: error.code || null,
            timestamp: error.timestamp || new Date().toISOString()
        };
    }

    // Get error statistics
    getErrorStats() {
        const recentLogs = logger.getRecentLogs(1000);
        const errors = recentLogs.filter(log => log.level === 'ERROR');
        
        const stats = {
            total: errors.length,
            byType: {},
            recent: errors.slice(-10)
        };
        
        errors.forEach(error => {
            const type = error.meta?.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });
        
        return stats;
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = errorHandler;