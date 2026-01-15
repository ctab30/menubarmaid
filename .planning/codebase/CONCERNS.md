# Technical Concerns & Debt

## Security Issues

### CSP Policy Too Permissive
- **Location**: `views/index.html:9`
- **Issue**: CSP includes `'unsafe-eval'` for script-src
- **Impact**: Weakens XSS protection
- **Fix**: Remove `'unsafe-eval'` if possible

### Electron nodeIntegration Contradiction
- **Location**: `main.js:40`
- **Issue**: `nodeIntegration: true` set while using contextIsolation
- **Impact**: Could bypass context isolation protections
- **Fix**: Set `nodeIntegration: false`

### Path Input Validation Missing
- **Location**: `main.js:209-223`
- **Issue**: Pinned paths stored without validation
- **Impact**: Potential path traversal attacks
- **Fix**: Validate with `path.normalize()`, check for `..`

## Error Handling Gaps

### Missing IPC Error Handling
- **Location**: `main.js:148-223`
- **Issue**: All IPC handlers lack try/catch blocks
- **Handlers affected**: sessions:create/kill/list/get/write/resize, pins:*, dialog:*
- **Fix**: Wrap handlers in try/catch, return proper error responses

### Renderer Initialization Errors
- **Location**: `views/js/renderer.js:30-35`
- **Issue**: `init()` and async operations lack error handling
- **Fix**: Add try/catch to async functions

## Race Conditions

### Arbitrary setTimeout Delays
- **Location**: `src/sessions.js:32-34`
- **Issue**: 300ms delay before `claude` command execution
- **Problem**: Shell init time is unpredictable
- **Fix**: Listen for shell prompt instead

### Terminal Fit Timing
- **Location**: `views/js/renderer.js:274-287`
- **Issue**: 150ms setTimeout for `fitAddon.fit()`
- **Fix**: Use callback-based initialization

## Resource Management

### Event Listener Leaks
- **Location**: `views/js/renderer.js`
- **Issue**: Listeners added but never removed
- **Lines**: 38-43, 46-60, 63-68
- **Fix**: Store unsubscribe functions, call on cleanup

### Incomplete Terminal Cleanup
- **Location**: `views/js/renderer.js:299-312`
- **Issue**: Only `terminal.dispose()` called, addons not cleaned
- **Fix**: Clean up xterm addons and callbacks

## Input Validation

### Session ID Validation Missing
- **Location**: `src/sessions.js:95-125`
- **Issue**: No validation of session IDs in write/resize/get
- **Fix**: Validate IDs exist, return errors for invalid

### Terminal Resize Validation Missing
- **Location**: `views/js/renderer.js:281-284`
- **Issue**: `proposeDimensions()` result not validated
- **Fix**: Check for undefined/null values

## Documentation Gaps

### Timing Logic Undocumented
- **Location**: `src/sessions.js:32-34`
- **Issue**: No explanation for 300ms delay

### Session Manager State Undocumented
- **Location**: `src/sessions.js:5-10`
- **Issue**: Buffer logic, maxBufferLines purpose unclear

### IPC Handlers Undocumented
- **Location**: `main.js:145-231`
- **Issue**: No JSDoc for parameters, returns, errors

## Performance Concerns

### Grid Re-rendering
- **Location**: `views/js/renderer.js:71-105`
- **Issue**: `renderGrid()` recreates all cards every time
- **Fix**: Use incremental updates

### Output Buffer Splitting
- **Location**: `src/sessions.js:51-56`
- **Issue**: Splits every output by `\n`, many array operations
- **Fix**: Batch processing for large outputs

## Missing Features

### No Session Persistence
- Sessions lost on app restart
- No recovery mechanism

### No Input Rate Limiting
- **Location**: `src/sessions.js:95-102`
- No rate limiting for terminal input

### No Output Line Length Limit
- **Location**: `src/sessions.js:51-56`
- Buffer has line count cap but no line length limit

## Summary

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 3 | CSP policy, nodeIntegration, path validation |
| High | 7 | Error handling, race conditions, memory leaks |
| Medium | 15+ | Validation gaps, performance, documentation |
| Low | 15+ | Missing features, code style |

## Positive Notes
- Context isolation enabled
- HTML escaping partially implemented
- Code is readable and well-organized
- Terminal cleanup is present
