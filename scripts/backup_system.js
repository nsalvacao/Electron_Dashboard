

const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

class BackupSystem {
    constructor() {
        this.basePath = path.join('C:', 'GitHub', 'Nexo_Dashboard');
        this.backupDir = path.join(this.basePath, 'data', 'backups');
        this.dailyDir = path.join(this.backupDir, 'daily');
        this.incrementalDir = path.join(this.backupDir, 'incremental');
        this.metadataDir = path.join(this.backupDir, 'metadata');
        this.catalogPath = path.join(this.metadataDir, 'backup_catalog.json');
        this.logPath = path.join(this.basePath, '0_Electron_Docs_Reference', 'Dev_Logs');
        this.dataToBackup = path.join(this.basePath, 'data');
        this._setupLogging();
    }

    async _setupLogging() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(this.logPath, `gemini_backup_system_${timestamp}.md`);
    }

    async _log(message) {
        await fs.appendFile(this.logFile, `\n${message}`);
    }

    async _loadCatalog() {
        try {
            const data = await fs.readFile(this.catalogPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // Catalog doesn't exist yet
            }
            throw error;
        }
    }

    async _saveCatalog(catalog) {
        await fs.writeFile(this.catalogPath, JSON.stringify(catalog, null, 2));
    }

    async createBackup(type = 'full') {
        this._log(`### Action: createBackup(type: '${type}')`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup_${timestamp}`;
        const zip = new AdmZip();

        const filesToBackup = await this._getFilesToBackup(type);
        if (filesToBackup.length === 0) {
            this._log('- Result: No files to backup.');
            return null;
        }

        for (const file of filesToBackup) {
            const content = await fs.readFile(file.path);
            zip.addFile(path.relative(this.basePath, file.path), content);
        }

        const backupPath = path.join(type === 'full' ? this.dailyDir : this.incrementalDir, `${backupId}.zip`);
        await zip.writeZipPromise(backupPath);

        const backupMetadata = await this._createBackupMetadata(backupId, timestamp, type, filesToBackup, backupPath);
        const catalog = await this._loadCatalog();
        catalog.push(backupMetadata);
        await this._saveCatalog(catalog);

        this._log(`- Result: Backup created successfully. ID: ${backupId}`);
        return backupId;
    }

    async _getFilesToBackup(type) {
        // For simplicity, we'll do a full backup regardless of type for now.
        // A true incremental backup would compare file modification times.
        const allFiles = await this._getAllFiles(this.dataToBackup);
        return Promise.all(allFiles.map(async (filePath) => {
            const stats = await fs.stat(filePath);
            const checksum = await this._calculateChecksum(filePath);
            return {
                path: filePath,
                size: stats.size,
                checksum: `sha256:${checksum}`
            };
        }));
    }

    async _getAllFiles(dir) {
        let files = [];
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (item.name !== 'backups') { // Don't backup the backups
                    files = files.concat(await this._getAllFiles(fullPath));
                }
            } else {
                files.push(fullPath);
            }
        }
        return files;
    }

    async _calculateChecksum(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    async _createBackupMetadata(backupId, timestamp, type, files, backupPath) {
        const stats = await fs.stat(backupPath);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        return {
            backupId,
            timestamp,
            type,
            files,
            totalSize,
            compressedSize: stats.size,
            compressionRatio: totalSize > 0 ? stats.size / totalSize : 0
        };
    }

    async restoreBackup(backupId) {
        this._log(`### Action: restoreBackup(backupId: '${backupId}')`);
        const catalog = await this._loadCatalog();
        const backupMetadata = catalog.find(b => b.backupId === backupId);

        if (!backupMetadata) {
            throw new Error(`Backup with ID '${backupId}' not found.`);
        }

        const backupPath = path.join(backupMetadata.type === 'full' ? this.dailyDir : this.incrementalDir, `${backupId}.zip`);
        const zip = new AdmZip(backupPath);
        zip.extractAllTo(this.basePath, true);

        this._log(`- Result: Backup restored successfully from ID: ${backupId}`);
    }

    async listBackups() {
        this._log('### Action: listBackups()');
        return await this._loadCatalog();
    }

    async verifyBackup(backupId) {
        this._log(`### Action: verifyBackup(backupId: '${backupId}')`);
        const catalog = await this._loadCatalog();
        const backupMetadata = catalog.find(b => b.backupId === backupId);

        if (!backupMetadata) {
            throw new Error(`Backup with ID '${backupId}' not found.`);
        }

        for (const file of backupMetadata.files) {
            const currentChecksum = `sha256:${await this._calculateChecksum(file.path)}`;
            if (currentChecksum !== file.checksum) {
                this._log(`- Result: Verification failed for ${file.path}. Checksum mismatch.`);
                return false;
            }
        }

        this._log('- Result: Backup verified successfully.');
        return true;
    }

    async cleanupOldBackups() {
        this._log('### Action: cleanupOldBackups()');
        // Implementation for retention policy would go here.
        this._log('- Result: Cleanup logic not implemented in this version.');
    }

    async getBackupStatus() {
        this._log('### Action: getBackupStatus()');
        const catalog = await this._loadCatalog();
        return {
            totalBackups: catalog.length,
            lastBackup: catalog.length > 0 ? catalog[catalog.length - 1] : null
        };
    }
}

// Example Usage and Testing
async function runTest() {
    const backupSystem = new BackupSystem();
    
    const promptText = `...`; // The prompt text will be inserted here by the agent
    await backupSystem._log("## Gemini's Reasoning Output\n\n");
    await backupSystem._log("Este é o log de execução do script de backup.\n");
    await backupSystem._log(`Timestamp: ${new Date().toISOString()}\n\n`);
    await backupSystem._log("---\n\n");
    await backupSystem._log("### Initial Prompt\n");
    await backupSystem._log(promptText);
    await backupSystem._log("\n---\n\n");

    console.log('--- Testing Backup Creation ---');
    const backupId = await backupSystem.createBackup('full');
    console.log(`Backup created with ID: ${backupId}`);

    console.log('\n--- Listing Backups ---');
    const backups = await backupSystem.listBackups();
    console.log(backups);

    console.log('\n--- Verifying Backup ---');
    const isValid = await backupSystem.verifyBackup(backupId);
    console.log(`Backup is valid: ${isValid}`);

    console.log('\n--- Restoring Backup ---');
    await backupSystem.restoreBackup(backupId);
    console.log('Backup restored.');

    console.log('\n--- Getting Backup Status ---');
    const status = await backupSystem.getBackupStatus();
    console.log(status);

    console.log(`\nLog file created at: ${backupSystem.logFile}`);
}

runTest().catch(console.error);

