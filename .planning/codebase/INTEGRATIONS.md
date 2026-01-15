# External Integrations

## Overview

**No external cloud services or APIs** - This is a fully local, standalone application with no network dependencies.

## System Integrations

### macOS Menu Bar
- **API**: Electron Tray API
- **Location**: `main.js:116-143`
- **Purpose**: Native tray icon integration
- **Icon**: `assets/IconTerminalTemplate.png`

### macOS File Picker
- **API**: Electron dialog API
- **Location**: `main.js:187-202`
- **Purpose**: Native directory selection
- **Method**: `dialog.showOpenDialog()`

### macOS Screen/Display
- **API**: Electron screen API
- **Location**: `main.js:62-114`
- **Purpose**: Popover positioning relative to menu bar

## Terminal Integration

### Shell Spawning
- **Library**: node-pty
- **Location**: `src/sessions.js:14-17`
- **Shell**: Uses `$SHELL` environment variable (fallback: `/bin/zsh`)
- **Mode**: Interactive login shell (`['--login', '-i']`)

### Claude CLI
- **Integration**: Auto-launches `claude` command after shell init
- **Location**: `src/sessions.js:32-34`
- **Trigger**: 300ms delay after shell spawn
- **Command**: `ptyProcess.write('claude\\r')`

## Storage

### electron-store
- **Purpose**: Persistent key-value storage
- **Location**: `main.js:205-223`
- **Data stored**: `pinnedPaths` array (max 10 items)
- **Storage format**: JSON file in user data directory

## Third-Party Services

| Service Type | Status |
|--------------|--------|
| External APIs | None |
| Payment processors | None |
| Analytics/telemetry | None |
| Authentication | None |
| Error tracking | None |
| Cloud storage | None |

## Data Flow

```
Local → PTY session (user input/output)
PTY → IPC → Renderer (terminal display)
Renderer ← Main process (session management)
Persistent: electron-store (JSON file)
```

## Network Dependencies

**None** - Application operates entirely offline.
