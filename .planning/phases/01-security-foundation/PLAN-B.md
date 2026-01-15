# Plan B: Input Validation & Race Conditions

## Overview

Add input validation for all external inputs (paths, session IDs, resize dimensions) and fix the race condition in shell initialization.

## Prerequisites

- PLAN-A completed (error handling patterns in place)

## Tasks

### Task 1: Add Path Validation for Pins

**File**: `main.js`
**Lines**: 209-223

Validate paths before storing in pins to prevent path traversal attacks.

```javascript
const path = require('path');
const fs = require('fs');

// Add validation helper at top of file
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

// Update pins:add handler
ipcMain.handle('pins:add', async (event, pinPath) => {
    try {
        if (!isValidPath(pinPath)) {
            return { success: false, error: 'Invalid path' };
        }

        const pins = store.get('pinnedPaths', []);
        if (!pins.includes(pinPath) && pins.length < 10) {
            pins.push(pinPath);
            store.set('pinnedPaths', pins);
        }
        return { success: true, data: pins };
    } catch (error) {
        console.error('pins:add error:', error);
        return { success: false, error: error.message };
    }
});
```

### Task 2: Add Session ID Validation

**File**: `src/sessions.js`
**Lines**: 95-125

Validate session IDs in write, resize, and get methods.

```javascript
// Add validation method to SessionManager class
validateSessionId(id) {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid session ID: must be a non-empty string');
    }
    if (!this.sessions.has(id)) {
        throw new Error(`Session not found: ${id}`);
    }
    return true;
}

// Update write method
write(id, data) {
    this.validateSessionId(id);
    if (typeof data !== 'string') {
        throw new Error('Invalid data: must be a string');
    }
    const session = this.sessions.get(id);
    session.ptyProcess.write(data);
}

// Update resize method
resize(id, cols, rows) {
    this.validateSessionId(id);

    // Validate dimensions
    cols = parseInt(cols, 10);
    rows = parseInt(rows, 10);

    if (isNaN(cols) || cols < 1 || cols > 500) {
        throw new Error('Invalid cols: must be between 1 and 500');
    }
    if (isNaN(rows) || rows < 1 || rows > 500) {
        throw new Error('Invalid rows: must be between 1 and 500');
    }

    const session = this.sessions.get(id);
    session.ptyProcess.resize(cols, rows);
}

// Update get method
get(id) {
    this.validateSessionId(id);
    const session = this.sessions.get(id);
    return {
        id: session.id,
        cwd: session.cwd,
        output: session.output.join('\n'),
    };
}
```

### Task 3: Fix Shell Init Race Condition

**File**: `src/sessions.js`
**Lines**: 32-34

Replace arbitrary 300ms timeout with prompt detection.

```javascript
// Before
setTimeout(() => {
    ptyProcess.write('claude\r');
}, 300);

// After - detect shell ready state
let shellReady = false;
let outputBuffer = '';

const onDataHandler = ptyProcess.onData((data) => {
    outputBuffer += data;

    // Detect common shell prompts ($ for bash/zsh, % for zsh, > for fish)
    // Also check for typical prompt patterns
    if (!shellReady && /[$%>]\s*$/.test(outputBuffer)) {
        shellReady = true;
        ptyProcess.write('claude\r');
    }

    // Continue with normal output handling
    // ... existing output processing code
});
```

Alternative approach if prompt detection is unreliable:
```javascript
// Listen for first output that indicates shell is ready
let claudeLaunched = false;

ptyProcess.onData((data) => {
    // Launch claude after first meaningful output (shell banner/prompt)
    if (!claudeLaunched && data.trim().length > 0) {
        claudeLaunched = true;
        // Small delay after first output to ensure shell is fully ready
        setTimeout(() => {
            ptyProcess.write('claude\r');
        }, 50);
    }
    // ... rest of output handling
});
```

### Task 4: Add Terminal Resize Validation in Renderer

**File**: `views/js/renderer.js`
**Lines**: 281-284

Validate fitAddon.proposeDimensions() result before using.

```javascript
// Before
const dims = fitAddon.proposeDimensions();
window.api.sessions.resize(currentSessionId, dims.cols, dims.rows);

// After
const dims = fitAddon.proposeDimensions();
if (dims && typeof dims.cols === 'number' && typeof dims.rows === 'number'
    && dims.cols > 0 && dims.rows > 0) {
    window.api.sessions.resize(currentSessionId, dims.cols, dims.rows);
} else {
    console.warn('Invalid terminal dimensions from fitAddon:', dims);
}
```

## Verification

1. **Path validation**: Try to pin `../../../etc` - should fail
2. **Path validation**: Pin a valid directory - should succeed
3. **Session ID**: Call `sessions:write` with invalid ID - should return error
4. **Session ID**: Call with valid ID - should work
5. **Shell init**: Create new session - claude should start reliably without timing issues
6. **Resize**: Resize terminal to various sizes - no errors
7. **Resize**: Check no crashes with rapid resize events

## Rollback

If shell prompt detection causes issues:
1. Revert to timeout-based approach
2. Increase timeout to 500ms as safer fallback
3. Add comment documenting why timeout is needed
