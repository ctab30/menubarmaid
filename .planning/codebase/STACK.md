# Technology Stack

## Languages
- **JavaScript (Node.js)** - `main.js`, `src/sessions.js`, `src/preload.js`, `views/js/renderer.js`
- **HTML5** - `views/index.html`, `views/settings.html`
- **CSS3** - `views/css/style.css`

## Runtime Environment
- **Node.js** - Embedded via Electron (no .nvmrc version pinning)
- **macOS exclusive** - Built and optimized for macOS only
- **Electron v27.0.0** - Desktop application framework

## Package Manager
- **npm** - Package manager
- **package.json** - Project configuration
- **package-lock.json** - Dependency lock file

## Core Dependencies

### Runtime Dependencies
| Package | Version | Purpose | Location |
|---------|---------|---------|----------|
| electron-store | ^8.1.0 | Persistent key-value storage | `main.js:3,7,205-223` |
| node-pty | ^1.0.0 | PTY spawning for shell sessions | `src/sessions.js:1` |
| xterm | ^5.3.0 | Terminal emulator UI | `views/index.html:99` |
| xterm-addon-fit | ^0.8.0 | Terminal auto-sizing | `views/js/renderer.js:270-271` |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^27.0.0 | Electron framework |
| electron-builder | ^24.9.1 | App bundler/installer |
| electron-rebuild | ^3.2.9 | Native module rebuilder |

## Configuration

### Build Configuration
Located in `package.json` lines 29-35:
- **Target**: macOS DMG format
- **Category**: Developer tools

### Content Security Policy
Located in `views/index.html` line 9:
```
default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'
```

### Persistent Storage
- **electron-store** for pinned paths
- Stored as JSON in user data directory

## Build Process
```bash
npm install     # Install dependencies
npm start       # Run development (electron .)
npm run build   # Build DMG installer (electron-builder)
npm run rebuild # Rebuild native modules (electron-rebuild -f -w node-pty)
```

## Environment Variables
- No `.env` files used
- Configuration is hardcoded or stored via electron-store
- `SHELL` environment variable used for default shell (`/bin/zsh` fallback)
