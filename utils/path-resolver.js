const path = require('path');
const os = require('os');
const fs = require('fs');

class PathResolver {
    constructor(configPath = null) {
        this.config = this.loadConfig(configPath);
        this.platform = os.platform();
        this.projectRoot = this.findProjectRoot();
        this.initializePaths();
    }

    loadConfig(configPath) {
        const defaultConfig = {
            projectPath: 'auto-detect',
            dataPath: './data',
            assetsPath: './assets',
            logsPath: './0_Electron_Docs_Reference/Dev_Logs',
            iconsPath: './assets/icons',
            backupPath: './data/backups'
        };

        if (configPath && fs.existsSync(configPath)) {
            try {
                const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return { ...defaultConfig, ...userConfig };
            } catch (error) {
                console.warn(`Failed to load config from ${configPath}, using defaults:`, error.message);
                return defaultConfig;
            }
        }

        const projectConfigPath = path.join(this.findProjectRoot(), 'config.json');
        if (fs.existsSync(projectConfigPath)) {
            try {
                const userConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
                return { ...defaultConfig, ...userConfig };
            } catch (error) {
                console.warn(`Failed to load project config, using defaults:`, error.message);
                return defaultConfig;
            }
        }

        return defaultConfig;
    }

    findProjectRoot() {
        if (process.env.NEXO_DASHBOARD_PATH) {
            return path.resolve(process.env.NEXO_DASHBOARD_PATH);
        }

        let currentDir = __dirname;
        while (currentDir !== path.dirname(currentDir)) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                const packageJson = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
                if (packageJson.name === 'nexo-dashboard' || 
                    fs.existsSync(path.join(currentDir, 'ROADMAP.md'))) {
                    return currentDir;
                }
            }
            currentDir = path.dirname(currentDir);
        }

        return path.dirname(path.dirname(__filename));
    }

    initializePaths() {
        this.paths = {
            root: this.projectRoot,
            data: this.resolvePath(this.config.dataPath),
            assets: this.resolvePath(this.config.assetsPath),
            logs: this.resolvePath(this.config.logsPath),
            icons: this.resolvePath(this.config.iconsPath),
            backup: this.resolvePath(this.config.backupPath)
        };

        this.ensureDirectoriesExist();
    }

    resolvePath(relativePath) {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path.resolve(this.projectRoot, relativePath);
    }

    ensureDirectoriesExist() {
        Object.values(this.paths).forEach(dirPath => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    getPath(type) {
        if (this.paths[type]) {
            return this.paths[type];
        }
        throw new Error(`Unknown path type: ${type}`);
    }

    getDataFile(filename) {
        return path.join(this.paths.data, filename);
    }

    getAssetFile(filename) {
        return path.join(this.paths.assets, filename);
    }

    getIconFile(filename) {
        return path.join(this.paths.icons, filename);
    }

    getLogFile(filename) {
        return path.join(this.paths.logs, filename);
    }

    getBackupFile(filename) {
        return path.join(this.paths.backup, filename);
    }

    getPlatformSpecificPath(pathMap) {
        return pathMap[this.platform] || pathMap.default || '';
    }

    isWindows() {
        return this.platform === 'win32';
    }

    isLinux() {
        return this.platform === 'linux';
    }

    isMacOS() {
        return this.platform === 'darwin';
    }

    getSystemPaths() {
        const systemPaths = {
            win32: {
                startMenu: path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu'),
                userStartMenu: path.join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu'),
                programFiles: process.env.PROGRAMFILES || 'C:\\Program Files',
                userProfile: process.env.USERPROFILE || process.env.HOME || '',
                appData: process.env.APPDATA || ''
            },
            linux: {
                applications: '/usr/share/applications',
                userApplications: path.join(process.env.HOME || '', '.local/share/applications'),
                userProfile: process.env.HOME || '',
                configHome: process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config')
            },
            darwin: {
                applications: '/Applications',
                userApplications: path.join(process.env.HOME || '', 'Applications'),
                userProfile: process.env.HOME || '',
                library: path.join(process.env.HOME || '', 'Library')
            }
        };

        return systemPaths[this.platform] || systemPaths.linux;
    }

    static getInstance() {
        if (!PathResolver.instance) {
            PathResolver.instance = new PathResolver();
        }
        return PathResolver.instance;
    }
}

module.exports = PathResolver;