const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('api', {
    // Environment
    homeDir: os.homedir(),

    // Session management
    createSession: (cwd, options) => ipcRenderer.invoke('sessions:create', cwd, options),
    killSession: (id) => ipcRenderer.invoke('sessions:kill', id),
    listSessions: () => ipcRenderer.invoke('sessions:list'),
    getSession: (id) => ipcRenderer.invoke('sessions:get', id),

    // Terminal I/O
    write: (id, data) => ipcRenderer.invoke('sessions:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('sessions:resize', id, cols, rows),

    // Output streaming
    onOutput: (callback) => {
        const handler = (event, sessionId, data, meta) => {
            callback(sessionId, data, meta);
        };
        ipcRenderer.on('sessions:output', handler);
        return () => ipcRenderer.removeListener('sessions:output', handler);
    },

    // Popover controls
    resizePopover: (mode) => ipcRenderer.invoke('popover:resize', mode),
    hidePopover: () => ipcRenderer.invoke('popover:hide'),

    // View reset listener (when popover hides)
    onViewReset: (callback) => {
        const handler = () => callback();
        ipcRenderer.on('view:reset', handler);
        return () => ipcRenderer.removeListener('view:reset', handler);
    },

    // Directory picker
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),

    // Pinned paths
    getPins: () => ipcRenderer.invoke('pins:get'),
    addPin: (path) => ipcRenderer.invoke('pins:add', path),
    removePin: (path) => ipcRenderer.invoke('pins:remove', path),

    // Mode preferences (per path)
    modes: {
        get: (pathKey) => ipcRenderer.invoke('modes:get', pathKey),
        set: (pathKey, mode) => ipcRenderer.invoke('modes:set', pathKey, mode),
    },
});
