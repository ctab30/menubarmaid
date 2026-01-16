const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Path validation helper to prevent path traversal attacks
function isValidPath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') return false;

    // Normalize and check for path traversal
    const normalized = path.normalize(inputPath);
    if (normalized.includes('..')) return false;

    // Check path exists and is a directory
    try {
        const stats = fs.statSync(normalized);
        return stats.isDirectory();
    } catch {
        return false;
    }
}
const SessionManager = require('./src/sessions');

// Initialize
const store = new Store();
const sessionManager = new SessionManager();

// Globals
let tray = null;
let popover = null;

// Terminal-style icon (>_)
const iconPath = path.join(__dirname, 'assets', 'IconTerminalTemplate.png');

// Popover dimensions
const GRID_WIDTH = 380;
const GRID_HEIGHT = 420;
const TERMINAL_WIDTH = 750;
const TERMINAL_HEIGHT = 550;

function createPopover() {
    popover = new BrowserWindow({
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'src', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    popover.loadFile('views/index.html');

    // Hide popover when clicking outside (loses focus)
    popover.on('blur', () => {
        hidePopover();
    });

    // Prevent closing, just hide
    popover.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            hidePopover();
        }
    });
}

function showPopover() {
    if (!popover) return;

    const trayBounds = tray.getBounds();
    const popoverBounds = popover.getBounds();
    const display = screen.getDisplayMatching(trayBounds);

    // Position below tray icon, centered
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverBounds.width / 2));
    let y = Math.round(trayBounds.y + trayBounds.height + 4);

    // Keep within screen bounds
    if (x + popoverBounds.width > display.bounds.x + display.bounds.width) {
        x = display.bounds.x + display.bounds.width - popoverBounds.width - 10;
    }
    if (x < display.bounds.x) {
        x = display.bounds.x + 10;
    }

    popover.setPosition(x, y, false);
    popover.show();
    popover.focus();
}

function hidePopover() {
    if (popover && popover.isVisible()) {
        popover.hide();
        // Preserve current view state - don't reset to grid
    }
}

function resizePopover(width, height) {
    if (!popover) return;

    const trayBounds = tray.getBounds();
    const display = screen.getDisplayMatching(trayBounds);

    // Calculate new position (keep centered under tray)
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (width / 2));
    let y = Math.round(trayBounds.y + trayBounds.height + 4);

    // Keep within screen bounds
    if (x + width > display.bounds.x + display.bounds.width) {
        x = display.bounds.x + display.bounds.width - width - 10;
    }
    if (x < display.bounds.x) {
        x = display.bounds.x + 10;
    }

    popover.setBounds({ x, y, width, height }, true);
}

function createTray() {
    tray = new Tray(iconPath);
    tray.setToolTip('Claude Code');

    // Left click toggles popover
    tray.on('click', () => {
        if (popover.isVisible()) {
            hidePopover();
        } else {
            showPopover();
        }
    });

    // Right click shows context menu
    tray.on('right-click', () => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Quit Claude Code',
                click: () => {
                    app.isQuitting = true;
                    sessionManager.killAll();
                    app.quit();
                }
            }
        ]);
        tray.popUpContextMenu(contextMenu);
    });
}

// IPC Handlers
function setupIPC() {
    // Session management
    ipcMain.handle('sessions:create', async (event, cwd, options = {}) => {
        try {
            return { success: true, data: sessionManager.createSession(cwd, options) };
        } catch (error) {
            console.error('sessions:create error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sessions:kill', async (event, id) => {
        try {
            return { success: true, data: sessionManager.killSession(id) };
        } catch (error) {
            console.error('sessions:kill error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sessions:list', async () => {
        try {
            return { success: true, data: sessionManager.getAllSessions() };
        } catch (error) {
            console.error('sessions:list error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sessions:get', async (event, id) => {
        try {
            return { success: true, data: sessionManager.getSession(id) };
        } catch (error) {
            console.error('sessions:get error:', error);
            return { success: false, error: error.message };
        }
    });

    // Terminal I/O
    ipcMain.handle('sessions:write', async (event, id, data) => {
        try {
            return { success: true, data: sessionManager.write(id, data) };
        } catch (error) {
            console.error('sessions:write error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sessions:resize', async (event, id, cols, rows) => {
        try {
            return { success: true, data: sessionManager.resize(id, cols, rows) };
        } catch (error) {
            console.error('sessions:resize error:', error);
            return { success: false, error: error.message };
        }
    });

    // Popover controls
    ipcMain.handle('popover:resize', async (event, mode) => {
        try {
            if (mode === 'terminal') {
                resizePopover(TERMINAL_WIDTH, TERMINAL_HEIGHT);
            } else {
                resizePopover(GRID_WIDTH, GRID_HEIGHT);
            }
            return { success: true };
        } catch (error) {
            console.error('popover:resize error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('popover:hide', async () => {
        try {
            hidePopover();
            return { success: true };
        } catch (error) {
            console.error('popover:hide error:', error);
            return { success: false, error: error.message };
        }
    });

    // Directory picker
    ipcMain.handle('dialog:selectDirectory', async () => {
        try {
            // Temporarily disable alwaysOnTop so dialog appears properly
            popover.setAlwaysOnTop(false);

            const result = await dialog.showOpenDialog(popover, {
                properties: ['openDirectory'],
                title: 'Select a folder for Claude session'
            });

            // Re-enable alwaysOnTop and refocus
            popover.setAlwaysOnTop(true);
            popover.focus();

            if (result.canceled) return { success: true, data: null };
            return { success: true, data: result.filePaths[0] };
        } catch (error) {
            console.error('dialog:selectDirectory error:', error);
            // Ensure alwaysOnTop is re-enabled even on error
            popover?.setAlwaysOnTop(true);
            return { success: false, error: error.message };
        }
    });

    // Environment
    ipcMain.handle('env:homeDir', () => {
        return require('os').homedir();
    });

    // Pinned paths
    ipcMain.handle('pins:get', async () => {
        try {
            return { success: true, data: store.get('pinnedPaths', []) };
        } catch (error) {
            console.error('pins:get error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('pins:add', async (event, pathToPin) => {
        try {
            // Validate path before adding to pins
            if (!isValidPath(pathToPin)) {
                return { success: false, error: 'Invalid path' };
            }

            const pins = store.get('pinnedPaths', []);
            if (!pins.includes(pathToPin)) {
                pins.unshift(pathToPin); // Add to beginning
                store.set('pinnedPaths', pins.slice(0, 10)); // Max 10 pins
            }
            return { success: true, data: store.get('pinnedPaths', []) };
        } catch (error) {
            console.error('pins:add error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('pins:remove', async (event, pathToRemove) => {
        try {
            const pins = store.get('pinnedPaths', []);
            const filtered = pins.filter(p => p !== pathToRemove);
            store.set('pinnedPaths', filtered);
            return { success: true, data: filtered };
        } catch (error) {
            console.error('pins:remove error:', error);
            return { success: false, error: error.message };
        }
    });

    // Mode preferences (stored per path)
    ipcMain.handle('modes:get', async (event, pathKey) => {
        try {
            const modes = store.get('pathModes', {});
            return { success: true, data: modes[pathKey] || { dangerousMode: false } };
        } catch (error) {
            console.error('modes:get error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('modes:set', async (event, pathKey, mode) => {
        try {
            const modes = store.get('pathModes', {});
            modes[pathKey] = mode;
            store.set('pathModes', modes);
            return { success: true, data: mode };
        } catch (error) {
            console.error('modes:set error:', error);
            return { success: false, error: error.message };
        }
    });

    // Open in IDE - auto-detect installed IDEs
    ipcMain.handle('ide:open', async (event, projectPath) => {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // IDE options in order of preference (CLI first, then app fallback)
        const ides = [
            { name: 'Cursor', cmd: 'cursor' },
            { name: 'Cursor', app: 'Cursor' },
            { name: 'VS Code', cmd: 'code' },
            { name: 'VS Code', app: 'Visual Studio Code' },
            { name: 'VS Code Insiders', cmd: 'code-insiders' },
            { name: 'Sublime Text', app: 'Sublime Text' },
            { name: 'WebStorm', app: 'WebStorm' },
            { name: 'PyCharm', app: 'PyCharm' },
            { name: 'IntelliJ IDEA', app: 'IntelliJ IDEA' },
            { name: 'Xcode', app: 'Xcode' },
        ];

        try {
            for (const ide of ides) {
                try {
                    if (ide.cmd) {
                        // Check if CLI command exists
                        await execAsync(`which ${ide.cmd}`);
                        // Open with CLI
                        exec(`${ide.cmd} "${projectPath}"`);
                        return { success: true, data: { ide: ide.name } };
                    } else if (ide.app) {
                        // Check if app exists and open with 'open -a'
                        const appPath = `/Applications/${ide.app}.app`;
                        if (fs.existsSync(appPath)) {
                            exec(`open -a "${ide.app}" "${projectPath}"`);
                            return { success: true, data: { ide: ide.name } };
                        }
                    }
                } catch {
                    // IDE not found, try next
                    continue;
                }
            }
            return { success: false, error: 'No supported IDE found' };
        } catch (error) {
            console.error('ide:open error:', error);
            return { success: false, error: error.message };
        }
    });

    // Forward session output to renderer
    sessionManager.onOutput((sessionId, data, meta) => {
        if (popover && !popover.isDestroyed()) {
            popover.webContents.send('sessions:output', sessionId, data, meta);
        }
    });
}

// App lifecycle
app.on('ready', () => {
    createTray();
    createPopover();
    setupIPC();
});

app.on('window-all-closed', (e) => {
    // Prevent default quit behavior
    e.preventDefault();
});

app.on('before-quit', () => {
    app.isQuitting = true;
    sessionManager.killAll();
});

// Hide dock icon (menu bar app)
app.dock?.hide();
