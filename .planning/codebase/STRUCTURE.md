# Project Structure

## Directory Layout

```
CluadeCodeMenuBar/
├── main.js                          # Electron main process (entry point)
├── package.json                     # Project metadata and dependencies
├── package-lock.json                # Dependency lock file
├── README.md                        # Project documentation
├── .gitignore                       # Git ignore rules
│
├── src/                             # Source code (backend logic)
│   ├── sessions.js                  # SessionManager class (PTY wrapper)
│   └── preload.js                   # Electron preload script (IPC bridge)
│
├── views/                           # UI layer (frontend)
│   ├── index.html                   # Main app layout (grid + terminal)
│   ├── settings.html                # Settings page (stub)
│   ├── css/
│   │   └── style.css                # iOS-inspired dark theme
│   └── js/
│       └── renderer.js              # Renderer process (UI logic)
│
├── assets/                          # App assets
│   ├── IconTerminalTemplate.png     # Tray icon
│   ├── IconTerminalTemplate@2x.png  # Tray icon (retina)
│   ├── IconEnergyTemplate.png       # Alternate icon
│   ├── IconEnergyTemplate@2x.png    # Alternate icon (retina)
│   └── Menu_Barmaid_Screenshot.png  # Documentation screenshot
│
├── .planning/                       # Planning documentation
│   └── codebase/                    # Codebase analysis docs
│
└── node_modules/                    # Dependencies (generated)
```

## Directory Purposes

### Root Level (`/`)
- **main.js**: Single-file Electron main process
  - Tray icon lifecycle
  - Window/popover management
  - IPC handler setup
  - Session manager initialization

### src/
Backend/service layer
- **sessions.js**: Terminal session abstraction
  - Encapsulates node-pty complexity
  - Manages session lifecycle
  - Handles output buffering
- **preload.js**: Security bridge
  - Exposes safe API to renderer
  - Abstracts IPC plumbing

### views/
Frontend/UI layer
- **index.html**: Application structure
  - Two-view layout (grid, terminal)
  - Script imports for xterm and renderer
- **js/renderer.js**: UI business logic
  - State management
  - Event listeners
  - View transitions
  - Terminal initialization
- **css/style.css**: Visual design
  - CSS custom properties
  - iOS-inspired design system
  - Animations

### assets/
Visual resources
- macOS template icons for tray (1x and 2x)
- Documentation screenshots

## Key Locations by Functionality

| Functionality | Location |
|---------------|----------|
| Session creation | `src/sessions.js:12-83` |
| Session termination | `src/sessions.js:85-93` |
| IPC handlers | `main.js:148-171` |
| Terminal rendering | `views/js/renderer.js:239-291` |
| Output streaming | `views/js/renderer.js:46-60` |
| Grid rendering | `views/js/renderer.js:77-105` |
| View switching | `views/js/renderer.js:294-312` |
| Pin management | `main.js:205-223` |
| Window positioning | `main.js:62-114` |
| Tray integration | `main.js:116-143` |

## File Statistics

| File | Lines | Purpose |
|------|-------|---------|
| main.js | ~252 | Main process |
| src/sessions.js | ~160 | Session manager |
| src/preload.js | ~46 | IPC bridge |
| views/js/renderer.js | ~333 | UI logic |
| views/css/style.css | ~900+ | Styling |
| views/index.html | ~103 | Layout |
