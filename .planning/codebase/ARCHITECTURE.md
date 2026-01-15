# Architecture

## Overview
Desktop application following Electron's main/renderer process architecture with IPC communication. macOS menu bar utility for launching and managing Claude Code terminal sessions.

## Architectural Pattern
**Electron Desktop App with IPC Communication**
- Platform-specific: macOS menu bar application
- Process separation: Main process (backend) / Renderer process (frontend)
- Asynchronous communication: All operations use IPC
- Context isolation: Security-hardened with contextBridge API

## Conceptual Layers

```
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer (views/)                             │
│ - HTML templates, CSS styling, xterm.js terminal        │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│ UI Logic Layer (views/js/renderer.js)                   │
│ - State management, event handling, view transitions    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│ IPC Bridge Layer (src/preload.js)                       │
│ - Safe API exposure via contextBridge                   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│ Main Process Layer (main.js)                            │
│ - Window management, IPC routing, system integration    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│ Session Management Layer (src/sessions.js)              │
│ - PTY lifecycle, terminal I/O, output buffering         │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│ System Layer                                            │
│ - node-pty (PTY), electron-store (persistence)          │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### Main Process (`main.js`)
- **Tray icon lifecycle** - Menu bar integration
- **Popover window management** - Grid vs terminal modes
- **IPC request/response handling** - Routes all operations
- **Session lifecycle orchestration** - Delegates to SessionManager
- **Persistent configuration** - Pinned paths via electron-store

### Session Manager (`src/sessions.js`)
- **PTY creation/lifecycle** - via node-pty
- **Terminal I/O operations** - write, resize, kill
- **Output buffering** - Circular buffer (max 1000 lines)
- **Session state tracking** - cwd, pid, timestamps
- **Observer pattern** - Callback-based output events

### IPC Bridge (`src/preload.js`)
- **Safe API surface** - contextBridge exposure
- **IPC abstraction** - Hides complexity from UI
- **Event listeners** - Output streaming, view reset

### Renderer (`views/js/renderer.js`)
- **Two-view UI** - Grid (session cards) / Terminal (active session)
- **State management** - Module-scope variables
- **xterm.js integration** - Terminal rendering

## Data Flow

### Session Creation
```
User clicks "New Session"
    ↓
Renderer: window.api.selectDirectory()
    ↓
Main: dialog.showOpenDialog()
    ↓
User selects folder
    ↓
Renderer: window.api.createSession(folder)
    ↓
Main: sessionManager.createSession(cwd)
    ↓
node-pty spawns shell, runs 'claude' command
    ↓
PTY output → SessionManager callback → IPC emit
    ↓
Renderer: xterm.js renders output
```

### Terminal I/O
```
User types → xterm.onData → window.api.write(id, data)
    ↓
Main: sessionManager.write(id, data) → ptyProcess.write()
    ↓
PTY executes → output generated
    ↓
popover.webContents.send('sessions:output', ...)
    ↓
Renderer: terminal.write(data)
```

## IPC Handlers

| Channel | Purpose |
|---------|---------|
| `sessions:create` | Spawn new session |
| `sessions:kill` | Terminate session |
| `sessions:list` | Get all sessions |
| `sessions:get` | Get single session |
| `sessions:write` | Send input to PTY |
| `sessions:resize` | Resize PTY terminal |
| `popover:resize` | Resize window |
| `popover:hide` | Hide window |
| `dialog:selectDirectory` | File picker |
| `pins:get/add/remove` | Manage pinned paths |

## Entry Points

1. **Application**: `main.js` (Electron main process)
2. **Renderer**: `views/js/renderer.js` (loaded by index.html)
3. **Preload**: `src/preload.js` (isolated context)
4. **Service**: `src/sessions.js` (instantiated in main.js)
