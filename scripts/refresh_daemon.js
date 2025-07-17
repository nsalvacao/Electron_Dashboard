const EventEmitter = require('events');
const cron = require('node-cron');
const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class RefreshDaemon extends EventEmitter {
    constructor(configPath = path.join(__dirname, 'daemon_config.json')) {
        super();
        this.configPath = configPath;
        this.config = null;
        this.scheduledTasks = {};
        this.status = 'stopped';
        this.lastRuns = {};
        this.runningJobs = new Set(); // To prevent concurrent runs of the same job type
    }

    async _loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(data);
            this._log('INFO', 'Configuration loaded successfully.');
        } catch (error) {
            this._log('ERROR', `Failed to load configuration: ${error.message}`);
            throw error; // Propagate error if config fails to load
        }
    }

    _log(level, message) {
        if (this.config?.options?.enableLogging) {
            console.log(`[${new Date().toISOString()}] [${level}] - ${message}`);
        }
    }

    async _getFileHash(filePath) {
        try {
            const data = await fs.readFile(filePath);
            return crypto.createHash('md5').update(data).digest('hex');
        } catch (error) {
            if (error.code === 'ENOENT') return null; // File doesn't exist
            throw error;
        }
    }

    async _runRefresh(type) {
        if (this.runningJobs.has(type)) {
            this._log('WARN', `Refresh for '${type}' is already running. Skipping scheduled run.`);
            return;
        }

        this.runningJobs.add(type);
        this.emit('refreshStarted', { type });
        this._log('INFO', `Starting refresh for type: ${type}`);

        const scriptPath = this.config.paths[`${type}Script`];
        const dataPath = this.config.paths[`${type}Data`];
        const executor = scriptPath.endsWith('.py') ? 'python' : 'pwsh';
        const args = scriptPath.endsWith('.py') ? [scriptPath, '--merge-existing'] : ['-File', scriptPath];

        let attempts = 0;
        const maxRetries = this.config.options.retryAttempts || 3;
        const initialDelay = this.config.options.retryDelay || 5000;

        while (attempts < maxRetries) {
            try {
                const beforeHash = await this._getFileHash(dataPath);

                await new Promise((resolve, reject) => {
                    execFile(executor, args, { shell: true }, (error, stdout, stderr) => {
                        if (error) {
                            return reject(new Error(`Exec error for ${type}: ${error.message}\nStderr: ${stderr}`));
                        }
                        this._log('INFO', `Script output for ${type}:\n${stdout}`);
                        resolve();
                    });
                });

                const afterHash = await this._getFileHash(dataPath);

                this.lastRuns[type] = { timestamp: new Date().toISOString(), status: 'completed' };
                this.emit('refreshCompleted', { type, status: 'completed' });
                this._log('INFO', `Refresh completed for type: ${type}`);

                if (beforeHash !== afterHash) {
                    this._log('INFO', `Data changed for type: ${type}`);
                    this.emit('dataChanged', { type, path: dataPath });
                }

                this.runningJobs.delete(type);
                return; // Success, exit retry loop

            } catch (error) {
                attempts++;
                this._log('ERROR', `Attempt ${attempts} failed for ${type}: ${error.message}`);
                if (attempts >= maxRetries) {
                    this.lastRuns[type] = { timestamp: new Date().toISOString(), status: 'failed', error: error.message };
                    this.emit('refreshFailed', { type, error: error.message });
                    this._log('ERROR', `All retry attempts failed for ${type}.`);
                    this.runningJobs.delete(type);
                    return; // All retries failed
                }
                const delay = initialDelay * Math.pow(2, attempts - 1);
                this._log('INFO', `Waiting ${delay}ms before next retry for ${type}.`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    async start() {
        if (this.status === 'running') {
            this._log('WARN', 'Daemon is already running.');
            return;
        }

        await this._loadConfig();
        this.status = 'running';
        this._log('INFO', 'Refresh daemon started.');

        for (const type in this.config.intervals) {
            const schedule = this.config.intervals[type];
            if (cron.validate(schedule)) {
                this.scheduledTasks[type] = cron.schedule(schedule, () => this._runRefresh(type));
                this._log('INFO', `Scheduled '${type}' refresh with pattern: ${schedule}`);
            } else {
                this._log('ERROR', `Invalid cron pattern for ${type}: ${schedule}`);
            }
        }
    }

    stop() {
        if (this.status !== 'running') {
            this._log('WARN', 'Daemon is not running.');
            return;
        }

        for (const type in this.scheduledTasks) {
            this.scheduledTasks[type].stop();
        }
        this.scheduledTasks = {};
        this.status = 'stopped';
        this._log('INFO', 'Refresh daemon stopped.');
    }

    forceRefresh(type) {
        if (!this.config.paths[`${type}Script`]) {
            this._log('ERROR', `Invalid refresh type: ${type}`);
            return false;
        }
        this._log('INFO', `Force refresh triggered for type: ${type}`);
        this._runRefresh(type);
        return true;
    }

    getStatus() {
        return {
            status: this.status,
            runningJobs: Array.from(this.runningJobs),
            scheduledTasks: Object.keys(this.scheduledTasks),
        };
    }

    getLastRun(type) {
        return this.lastRuns[type] || { status: 'never_run' };
    }
}

module.exports = RefreshDaemon;
