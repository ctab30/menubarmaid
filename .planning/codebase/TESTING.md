# Testing

## Current State

**NO TESTS IMPLEMENTED**

- No test files found (`*.test.js`, `*.spec.js`)
- No test runner configuration
- No testing dependencies in `package.json`
- Test coverage: 0%

## Testing Dependencies

**None installed.** Missing:
- vitest / jest / mocha
- chai / expect
- @testing-library
- spectron (Electron E2E)

## Manual Testing

Current verification approach:
```bash
npm start   # Manual UI testing
npm run build   # Build verification
```

## Recommended Test Structure

If tests were implemented:

```
CluadeCodeMenuBar/
├── src/
│   ├── __tests__/
│   │   └── sessions.test.js     # SessionManager unit tests
│   └── sessions.js
├── tests/
│   ├── integration/
│   │   └── ipc.test.js          # IPC communication tests
│   └── e2e/
│       └── app.test.js          # Electron window tests
```

## Testability Analysis

### Highly Testable
| Component | Location | Approach |
|-----------|----------|----------|
| SessionManager | `src/sessions.js` | Unit tests with mocked node-pty |
| IPC handlers | `main.js:148-223` | Integration tests with IPC mocking |
| Utility functions | `views/js/renderer.js` | Unit tests (stripAnsi, escapeHtml) |

### Requires DOM Environment
| Component | Location | Approach |
|-----------|----------|----------|
| Renderer functions | `views/js/renderer.js` | jsdom/happy-dom |
| View rendering | `renderGrid()`, `createSessionCard()` | Component tests |

### Requires Electron Environment
| Component | Location | Approach |
|-----------|----------|----------|
| Main process | `main.js` | spectron or Playwright |
| Tray/Window | `createPopover()`, `createTray()` | E2E tests |

## Linting & Quality

**None configured:**
- No `.eslintrc`
- No `.prettierrc`
- No StyleLint
- No pre-commit hooks

## Coverage Recommendations

| Target | Coverage |
|--------|----------|
| Minimum | 70% |
| Focus areas | SessionManager, IPC handlers, utilities |
| Critical paths | Session creation/termination, terminal I/O |
