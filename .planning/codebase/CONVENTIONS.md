# Coding Conventions

## Code Style

### Indentation & Formatting
- **4-space indentation** throughout JavaScript, HTML, CSS
- **Semicolons**: Always present on statements
- **Trailing commas**: Not used

### String Quotes
- **Single quotes** (`'`) for all JavaScript string literals
- Examples: `'electron'`, `'./src/sessions'`, `'Quit Claude Code'`

### Comments

**JavaScript Comments:**
- Single-line `//` for section markers and inline notes
- Pattern: `// Section Name` (capitalized, no period)
- Examples:
  - `// Initialize`
  - `// Globals`
  - `// IPC Handlers`
  - `// App lifecycle`

**CSS Comments:**
- Multi-line block comments with decorative borders
- Pattern: `/* ============= Section Name ============= */`

## Naming Conventions

### Files
| Type | Convention | Examples |
|------|------------|----------|
| JavaScript | camelCase | `renderer.js`, `sessions.js` |
| CSS | kebab-case | `style.css` |
| HTML | kebab-case | `index.html`, `settings.html` |

### Variables & Constants
| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `sessionManager`, `popover`, `tray` |
| Constants | UPPER_SNAKE_CASE | `GRID_WIDTH`, `GRID_HEIGHT`, `TERMINAL_WIDTH` |
| CSS Variables | --kebab-case | `--bg`, `--card-bg`, `--accent`, `--radius-lg` |

### Functions
| Type | Convention | Examples |
|------|------------|----------|
| Regular | camelCase | `createPopover()`, `showPopover()`, `renderGrid()` |
| Async | async + camelCase | `async function init()`, `async function createNewSession()` |
| Getters | get prefix | `getSession()`, `getAllSessions()`, `getPreviewLines()` |
| Event handlers | handle/on/setup | `handleResize()`, `setupEventListeners()` |

### CSS Classes & IDs
| Type | Convention | Examples |
|------|------------|----------|
| IDs | kebab-case | `#grid-view`, `#terminal-view`, `#pinned-section` |
| Classes | kebab-case | `.session-card`, `.pinned-item`, `.btn-primary` |
| Modifiers | BEM-inspired | `.card.active`, `.view.active`, `.btn-icon.btn-danger` |
| State classes | simple | `.hidden`, `.loading`, `.pin-success` |

## Patterns

### Module Pattern
- CommonJS `require()` for dependencies
- Class-based modules with `module.exports`

```javascript
const pty = require('node-pty');
class SessionManager { ... }
module.exports = SessionManager;
```

### Async Patterns
- Async/await for IPC handlers
- Promise-based IPC with `ipcMain.handle()` / `ipcRenderer.invoke()`

```javascript
ipcMain.handle('sessions:create', async (event, cwd) => {
    return sessionManager.createSession(cwd);
});
```

### State Management
- Simple object/Map-based state (no Redux/Vuex)
- Module-scope variables
- Callback-based event emission

### DOM Manipulation
- Direct DOM selection: `document.getElementById()`, `document.querySelector()`
- No DOM library - vanilla JavaScript
- HTML template strings for dynamic content

## Formatting Tools
- **No ESLint** configured
- **No Prettier** configured
- **No TypeScript** - pure JavaScript
- Code style manually maintained

## IPC Message Naming
- Pattern: `namespace:action`
- Examples: `sessions:create`, `popover:resize`, `pins:add`
