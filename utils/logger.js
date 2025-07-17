const fs = require('fs');
const path = require('path');
const PathResolver = require('./path-resolver.js');

class Logger {
    constructor() {
        this.pathResolver = PathResolver.getInstance();
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.logLevels.INFO;
        this.logFile = null;
        this.setupLogger();
    }

    setupLogger() {
        try {
            const today = new Date().toISOString().split('T')[0];
            this.logFile = this.pathResolver.getLogFile(`nexo-dashboard-${today}.log`);
            
            // Ensure log directory exists
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            // Initialize log file with startup message
            this.writeToFile('INFO', 'Logger initialized');
            
        } catch (error) {
            console.error('Failed to setup logger:', error);
            // Don't throw error, continue without file logging
        }
    }

    setLevel(level) {
        if (typeof level === 'string') {
            level = this.logLevels[level.toUpperCase()];
        }
        this.currentLevel = level;
    }

    writeToFile(level, message, meta = {}) {
        if (!this.logFile) return;

        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                meta,
                pid: process.pid,
                platform: process.platform
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
            
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, meta = {}) {
        const levelValue = this.logLevels[level.toUpperCase()];
        
        if (levelValue <= this.currentLevel) {
            // Console output
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            switch (level.toUpperCase()) {
                case 'ERROR':
                    console.error(logMessage);
                    break;
                case 'WARN':
                    console.warn(logMessage);
                    break;
                case 'DEBUG':
                    console.debug(logMessage);
                    break;
                default:
                    console.log(logMessage);
            }
            
            // File output
            this.writeToFile(level.toUpperCase(), message, meta);
        }
    }

    error(message, meta = {}) {
        this.log('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        this.log('WARN', message, meta);
    }

    info(message, meta = {}) {
        this.log('INFO', message, meta);
    }

    debug(message, meta = {}) {
        this.log('DEBUG', message, meta);
    }

    // Application-specific logging methods
    appLaunch(appName, appPath, success = true, error = null) {
        const meta = { appName, appPath, success };
        if (error) meta.error = error;
        
        if (success) {
            this.info(`App launched: ${appName}`, meta);
        } else {
            this.error(`Failed to launch app: ${appName}`, meta);
        }
    }

    linkOpen(linkName, linkUrl, success = true, error = null) {
        const meta = { linkName, linkUrl, success };
        if (error) meta.error = error;
        
        if (success) {
            this.info(`Link opened: ${linkName}`, meta);
        } else {
            this.error(`Failed to open link: ${linkName}`, meta);
        }
    }

    dataLoad(dataType, count, success = true, error = null) {
        const meta = { dataType, count, success };
        if (error) meta.error = error;
        
        if (success) {
            this.info(`Data loaded: ${dataType} (${count} items)`, meta);
        } else {
            this.error(`Failed to load data: ${dataType}`, meta);
        }
    }

    userAction(action, details = {}) {
        this.info(`User action: ${action}`, details);
    }

    performance(operation, duration, details = {}) {
        const meta = { operation, duration, ...details };
        this.info(`Performance: ${operation} took ${duration}ms`, meta);
    }

    // Clean up old log files
    cleanupOldLogs(maxAge = 30) {
        try {
            const logDir = this.pathResolver.getPath('logs');
            const files = fs.readdirSync(logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAge);

            files.forEach(file => {
                if (file.startsWith('nexo-dashboard-') && file.endsWith('.log')) {
                    const filePath = path.join(logDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(filePath);
                        this.info(`Cleaned up old log file: ${file}`);
                    }
                }
            });
            
        } catch (error) {
            this.error('Failed to cleanup old logs', { error: error.message });
        }
    }

    // Get log file path
    getLogFile() {
        return this.logFile;
    }

    // Get recent logs
    getRecentLogs(lines = 100) {
        try {
            if (!this.logFile || !fs.existsSync(this.logFile)) {
                return [];
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const logLines = content.trim().split('\n');
            
            return logLines
                .slice(-lines)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { message: line, level: 'INFO' };
                    }
                })
                .filter(Boolean);
                
        } catch (error) {
            console.error('Failed to read recent logs:', error);
            return [];
        }
    }

    // Export logs for debugging
    exportLogs() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportFile = this.pathResolver.getLogFile(`nexo-dashboard-export-${timestamp}.json`);
            
            const logs = this.getRecentLogs(1000);
            const exportData = {
                timestamp,
                platform: process.platform,
                version: require('../package.json').version,
                logs
            };
            
            fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
            return exportFile;
            
        } catch (error) {
            this.error('Failed to export logs', { error: error.message });
            return null;
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;