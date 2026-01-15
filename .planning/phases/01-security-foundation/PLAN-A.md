# Plan A: Core Security Hardening

## Overview

Fix critical Electron security misconfigurations that could allow renderer process to access Node.js APIs inappropriately. This establishes the security foundation for all future work.

## Prerequisites

- None (first plan in phase)

## Tasks

### Task 1: Disable nodeIntegration

**File**: `main.js`
**Line**: 40

Change `nodeIntegration: true` to `nodeIntegration: false`. This is contradicting `contextIsolation: true` and weakens security.

```javascript
// Before
webPreferences: {
    preload: path.join(__dirname, 'src', 'preload.js'),
    nodeIntegration: true,  // WRONG
    contextIsolation: true,
},

// After
webPreferences: {
    preload: path.join(__dirname, 'src', 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
},
```

### Task 2: Verify preload.js works without Node

**File**: `src/preload.js`

The preload script should already work with contextIsolation, but verify:
1. All APIs exposed via `contextBridge.exposeInMainWorld`
2. No direct `require()` calls that would fail
3. No `window.X = require(...)` patterns

Current implementation looks correct - uses contextBridge properly. Just verify it still works after Task 1.

### Task 3: Tighten CSP Policy

**File**: `views/index.html`
**Line**: 9

Remove `'unsafe-eval'` from the Content Security Policy if xterm.js doesn't require it.

```html
<!-- Before -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';">

<!-- After (try this first) -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

If xterm.js breaks without `unsafe-eval`, add it back with a comment explaining why:
```html
<!-- xterm.js requires unsafe-eval for terminal rendering -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';">
```

### Task 4: Add Error Handling to IPC Handlers

**File**: `main.js`
**Lines**: 148-223

Wrap all IPC handlers in try/catch blocks. Return structured error responses.

Pattern to apply:
```javascript
// Before
ipcMain.handle('sessions:create', async (event, cwd) => {
    return sessionManager.createSession(cwd);
});

// After
ipcMain.handle('sessions:create', async (event, cwd) => {
    try {
        return { success: true, data: sessionManager.createSession(cwd) };
    } catch (error) {
        console.error('sessions:create error:', error);
        return { success: false, error: error.message };
    }
});
```

Apply to all handlers:
- `sessions:create` (line 148)
- `sessions:kill` (line 152)
- `sessions:list` (line 156)
- `sessions:get` (line 160)
- `sessions:write` (line 164)
- `sessions:resize` (line 168)
- `pins:get` (line 205)
- `pins:add` (line 209)
- `pins:remove` (line 216)
- `dialog:selectFolder` (line 187)

## Verification

1. `npm start` - App launches without console errors
2. Open DevTools - No nodeIntegration warnings
3. Test session creation - Still works with error handling
4. Test pin management - Still works
5. Check CSP - No eval violations in console (unless xterm needs it)

## Rollback

If issues occur:
1. Revert `nodeIntegration` to `true` temporarily
2. Check console for specific errors
3. Fix preload.js if needed before re-disabling nodeIntegration
