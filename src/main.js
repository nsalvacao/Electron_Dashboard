const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Import utilities
const PathResolver = require('../utils/path-resolver.js');
const logger = require('../utils/logger.js');
const errorHandler = require('../utils/error-handler.js');

class NexoDashboard {
    constructor() {
        this.pathResolver = PathResolver.getInstance();
        this.mainWindow = null;
        this.isQuitting = false;
        
        logger.info('Nexo Dashboard starting up');
        this.initializeApp();
    }

    initializeApp() {
        // Set app user model ID for Windows
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.nexo.dashboard');
        }

        // App event handlers
        app.whenReady().then(() => {
            this.createWindow();
            this.setupMenus();
            this.setupIpcHandlers();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', () => {
            this.isQuitting = true;
        });
    }

    createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: this.getAppIcon(),
            show: false,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
        });

        // Load the index.html
        this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Open DevTools in development
            if (process.env.NODE_ENV === 'development') {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Prevent navigation away from the app
        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            if (url !== this.mainWindow.webContents.getURL()) {
                event.preventDefault();
                shell.openExternal(url);
            }
        });
    }

    getAppIcon() {
        const iconPath = this.pathResolver.getAssetsFile('icon.png');
        if (fs.existsSync(iconPath)) {
            return iconPath;
        }
        return null;
    }

    setupMenus() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Refresh Data',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => {
                            this.mainWindow.webContents.send('refresh-data');
                        }
                    },
                    {
                        label: 'Settings',
                        accelerator: 'CmdOrCtrl+,',
                        click: () => {
                            this.mainWindow.webContents.send('open-settings');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Reload',
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: () => {
                            this.mainWindow.webContents.reload();
                        }
                    },
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                        click: () => {
                            this.mainWindow.webContents.toggleDevTools();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Actual Size',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => {
                            this.mainWindow.webContents.setZoomLevel(0);
                        }
                    },
                    {
                        label: 'Zoom In',
                        accelerator: 'CmdOrCtrl+Plus',
                        click: () => {
                            const currentZoom = this.mainWindow.webContents.getZoomLevel();
                            this.mainWindow.webContents.setZoomLevel(currentZoom + 1);
                        }
                    },
                    {
                        label: 'Zoom Out',
                        accelerator: 'CmdOrCtrl+-',
                        click: () => {
                            const currentZoom = this.mainWindow.webContents.getZoomLevel();
                            this.mainWindow.webContents.setZoomLevel(currentZoom - 1);
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Toggle Fullscreen',
                        accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                        click: () => {
                            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                        }
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About Nexo Dashboard',
                        click: () => {
                            this.mainWindow.webContents.send('show-about');
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIpcHandlers() {
        // Load data files
        ipcMain.handle('load-apps', async () => {
            return errorHandler.safeAsync(async () => {
                const appsPath = this.pathResolver.getDataFile('apps_startmenu.json');
                const customAppsPath = this.pathResolver.getDataFile('apps_custom.json');
                
                let apps = [];
                let customApps = [];
                
                if (fs.existsSync(appsPath)) {
                    const appsData = fs.readFileSync(appsPath, 'utf8');
                    apps = JSON.parse(appsData);
                }
                
                if (fs.existsSync(customAppsPath)) {
                    const customAppsData = fs.readFileSync(customAppsPath, 'utf8');
                    customApps = JSON.parse(customAppsData);
                }
                
                logger.dataLoad('apps', apps.length + customApps.length, true);
                return { apps, customApps };
            }, (error) => {
                logger.dataLoad('apps', 0, false, error.message);
                return { apps: [], customApps: [] };
            });
        });

        ipcMain.handle('load-links', async () => {
            try {
                const linksPath = this.pathResolver.getDataFile('links_web.json');
                
                if (fs.existsSync(linksPath)) {
                    const linksData = fs.readFileSync(linksPath, 'utf8');
                    return JSON.parse(linksData);
                }
                
                return [];
            } catch (error) {
                console.error('Error loading links:', error);
                return [];
            }
        });

        // Launch application
        ipcMain.handle('launch-app', async (event, appPath) => {
            return errorHandler.safeAsync(async () => {
                if (process.platform === 'win32') {
                    await shell.openPath(appPath);
                } else {
                    await shell.openExternal(appPath);
                }
                logger.appLaunch(path.basename(appPath), appPath, true);
                return { success: true };
            }, (error) => {
                logger.appLaunch(path.basename(appPath), appPath, false, error.message);
                return { success: false, error: error.message };
            });
        });

        // Open web link
        ipcMain.handle('open-link', async (event, url) => {
            try {
                await shell.openExternal(url);
                return { success: true };
            } catch (error) {
                console.error('Error opening link:', error);
                return { success: false, error: error.message };
            }
        });

        // Get app info
        ipcMain.handle('get-app-info', async () => {
            return {
                name: app.getName(),
                version: app.getVersion(),
                platform: process.platform,
                electron: process.versions.electron,
                node: process.versions.node,
                projectPath: this.pathResolver.getPath('root')
            };
        });

        // Show item in folder
        ipcMain.handle('show-in-folder', async (event, itemPath) => {
            try {
                shell.showItemInFolder(itemPath);
                return { success: true };
            } catch (error) {
                console.error('Error showing item in folder:', error);
                return { success: false, error: error.message };
            }
        });

        // Log message
        ipcMain.handle('log-message', async (event, level, message) => {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            console.log(logMessage);
            
            // Optionally write to log file
            try {
                const logPath = this.pathResolver.getLogFile(`nexo-dashboard-${new Date().toISOString().split('T')[0]}.log`);
                fs.appendFileSync(logPath, logMessage + '\n');
            } catch (error) {
                console.error('Error writing to log file:', error);
            }
        });
    }
}

// Only create app instance when running as main module and in Electron context
if (require.main === module && process.versions.electron) {
    const nexoDashboard = new NexoDashboard();
}

// Export for testing
module.exports = NexoDashboard;