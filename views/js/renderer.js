// xterm loaded via script tags
const Terminal = window.Terminal;
const FitAddon = window.FitAddon?.FitAddon || window.FitAddon;

// State
let sessions = [];
let pins = [];
let currentSessionId = null;
let currentSessionPath = null;
let currentSessionDangerousMode = false;
let homeDir = ''; // Cached from main process

// Terminal instances cache - keeps terminals alive per session
const terminalCache = new Map(); // sessionId -> { terminal, fitAddon, element }

// DOM Elements
const gridView = document.getElementById('grid-view');
const terminalView = document.getElementById('terminal-view');
const sessionsGrid = document.getElementById('sessions-grid');
const pinnedSection = document.getElementById('pinned-section');
const pinnedList = document.getElementById('pinned-list');
const emptyState = document.getElementById('empty-state');
const addBtn = document.getElementById('add-btn');
const terminalContainer = document.getElementById('terminal-container');
const terminalTitle = document.getElementById('terminal-title');
const terminalPath = document.getElementById('terminal-path');
const btnBack = document.getElementById('btn-back');
const btnKill = document.getElementById('btn-kill');
const btnPin = document.getElementById('btn-pin');
const btnIDE = document.getElementById('btn-ide');
const btnSummarize = document.getElementById('btn-summarize');
const emptyAddBtn = document.getElementById('empty-add-btn');
const modeToggleInput = document.getElementById('mode-toggle-input');
const modeLabel = document.getElementById('mode-label');

// Summarize state
let summarizeState = 'idle'; // 'idle' | 'waiting' | 'ready'

// Initialize
async function init() {
    console.log('init() starting');
    // Fetch homeDir from main process
    homeDir = await window.api.getHomeDir() || '';
    await refreshAll();
    setupEventListeners();
    console.log('Event listeners set up');
    setupOutputListener();
    setupViewReset();
    console.log('init() complete');
}

function setupEventListeners() {
    addBtn.addEventListener('click', createNewSession);
    emptyAddBtn.addEventListener('click', createNewSession);
    btnBack.addEventListener('click', showGridView);
    btnKill.addEventListener('click', killCurrentSession);
    btnPin.addEventListener('click', pinCurrentPath);
    btnIDE.addEventListener('click', openInIDE);
    btnSummarize.addEventListener('click', handleSummarize);
    modeToggleInput.addEventListener('change', handleModeToggle);
    window.addEventListener('resize', handleResize);
}

// Open current project in IDE
async function openInIDE() {
    if (!currentSessionPath) return;

    const result = await window.api.openInIDE(currentSessionPath);
    const data = unwrap(result);

    if (data) {
        // Visual feedback
        btnIDE.classList.add('ide-success');
        setTimeout(() => {
            btnIDE.classList.remove('ide-success');
        }, 600);
    } else {
        // Show error - no IDE found
        btnIDE.classList.add('ide-error');
        setTimeout(() => {
            btnIDE.classList.remove('ide-error');
        }, 1000);
    }
}

// Handle summarize & restart
async function handleSummarize() {
    if (!currentSessionId || !currentSessionPath) return;

    if (summarizeState === 'idle') {
        // Step 1: Send summarize prompt
        summarizeState = 'waiting';
        btnSummarize.classList.add('summarize-waiting');
        btnSummarize.title = 'Click again when summary is ready to start fresh session';

        const summarizePrompt = '/compact\r';
        await window.api.write(currentSessionId, summarizePrompt);

        // After brief delay, mark as ready
        setTimeout(() => {
            summarizeState = 'ready';
            btnSummarize.classList.remove('summarize-waiting');
            btnSummarize.classList.add('summarize-ready');
        }, 2000);

    } else if (summarizeState === 'ready' || summarizeState === 'waiting') {
        // Step 2: Get current session data, kill it, start fresh with summary
        const sessionResult = await window.api.getSession(currentSessionId);
        const session = unwrap(sessionResult);
        if (!session) return;

        const savedPath = currentSessionPath;
        const savedDangerousMode = currentSessionDangerousMode;
        const summaryContext = session.recentOutput;

        // Dispose and remove old terminal from cache
        const cached = terminalCache.get(currentSessionId);
        if (cached) {
            cached.terminal.dispose();
            terminalCache.delete(currentSessionId);
        }

        // Kill current session
        await window.api.killSession(currentSessionId);

        // Start new session
        const newResult = await window.api.createSession(savedPath, { dangerousMode: savedDangerousMode });
        const newSession = unwrap(newResult);
        if (!newSession) return;

        // Reset state
        summarizeState = 'idle';
        btnSummarize.classList.remove('summarize-waiting', 'summarize-ready');
        btnSummarize.title = 'Summarize & start fresh session';

        await refreshAll();
        showTerminalView(newSession.id);

        // Wait for Claude to start, then paste summary context
        setTimeout(async () => {
            // Send the summary as context for the new session
            const contextPrompt = `Here is a summary of my previous session for context:\n\n---\n${extractSummaryFromOutput(summaryContext)}\n---\n\nPlease continue helping me with this project.\r`;
            await window.api.write(newSession.id, contextPrompt);
        }, 3000);
    }
}

// Extract meaningful summary from raw output
function extractSummaryFromOutput(rawOutput) {
    // Try to get the last meaningful chunk (after /compact was sent)
    // This is a simple heuristic - get last ~2000 chars
    const cleaned = rawOutput
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI codes
        .replace(/\x1b\][^\x07]*\x07/g, '')     // Remove OSC codes
        .trim();

    // Get last portion as summary
    const maxLen = 3000;
    if (cleaned.length > maxLen) {
        return cleaned.slice(-maxLen);
    }
    return cleaned;
}

// Handle mode toggle
async function handleModeToggle() {
    if (!currentSessionId || !currentSessionPath) return;

    const newDangerousMode = modeToggleInput.checked;

    // Save preference for this path
    await window.api.modes.set(currentSessionPath, { dangerousMode: newDangerousMode });

    // Update label
    updateModeLabel(newDangerousMode);

    // Dispose and remove old terminal from cache
    const cached = terminalCache.get(currentSessionId);
    if (cached) {
        cached.terminal.dispose();
        terminalCache.delete(currentSessionId);
    }

    // Kill current session and restart with new mode
    await window.api.killSession(currentSessionId);

    // Start new session with the mode preference
    const result = await window.api.createSession(currentSessionPath, { dangerousMode: newDangerousMode });
    const session = unwrap(result);
    if (session) {
        await refreshAll();
        showTerminalView(session.id);
    }
}

function updateModeLabel(dangerousMode) {
    if (dangerousMode) {
        modeLabel.textContent = 'Dangerous';
        modeLabel.classList.add('dangerous');
    } else {
        modeLabel.textContent = 'Safe';
        modeLabel.classList.remove('dangerous');
    }
    currentSessionDangerousMode = dangerousMode;
}

function setupOutputListener() {
    window.api.onOutput((sessionId, data, meta) => {
        // Write to cached terminal (even if not currently viewing it)
        const cached = terminalCache.get(sessionId);
        if (cached) {
            if (data) {
                cached.terminal.write(data);
            }
            if (meta?.exited) {
                cached.terminal.write('\r\n\x1b[38;5;245m[Session ended]\x1b[0m\r\n');
                // Clean up cache for exited sessions
                cached.terminal.dispose();
                terminalCache.delete(sessionId);
            }
        }

        if (meta?.exited) {
            refreshAll();
        }
    });
}

function setupViewReset() {
    window.api.onViewReset(() => {
        if (currentSessionId) {
            resetToGrid();
        }
    });
}

// Helper to unwrap IPC responses
function unwrap(response) {
    if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
            console.error('IPC error:', response.error);
            return null;
        }
        return response.data;
    }
    return response; // Fallback for non-wrapped responses
}

async function refreshAll() {
    const sessionsResult = await window.api.listSessions();
    const pinsResult = await window.api.getPins();
    sessions = unwrap(sessionsResult) || [];
    pins = unwrap(pinsResult) || [];
    renderGrid();
}

function renderGrid() {
    // Render pinned paths
    pinnedList.innerHTML = '';
    if (pins.length > 0) {
        pinnedSection.classList.remove('hidden');
        pins.forEach(pinPath => {
            const item = createPinnedItem(pinPath);
            pinnedList.appendChild(item);
        });
    } else {
        pinnedSection.classList.add('hidden');
    }

    // Render sessions
    sessionsGrid.innerHTML = '';
    sessions.forEach(session => {
        const card = createSessionCard(session);
        sessionsGrid.appendChild(card);
    });

    // Show empty state if nothing
    if (sessions.length === 0 && pins.length === 0) {
        emptyState.classList.remove('hidden');
        addBtn.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        addBtn.classList.remove('hidden');
    }
}

function createPinnedItem(pinPath) {
    const item = document.createElement('div');
    item.className = 'pinned-item';

    const folderName = pinPath.split('/').pop() || 'Folder';
    const shortPath = shortenPath(pinPath);

    item.innerHTML = `
        <div class="pinned-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
        </div>
        <div class="pinned-info">
            <div class="pinned-name">${escapeHtml(folderName)}</div>
            <div class="pinned-path">${escapeHtml(shortPath)}</div>
        </div>
        <button class="pinned-remove" title="Remove pin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    // Click to start session
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.pinned-remove')) {
            startSessionAtPath(pinPath);
        }
    });

    // Remove pin
    item.querySelector('.pinned-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        const result = await window.api.removePin(pinPath);
        unwrap(result);
        refreshAll();
    });

    return item;
}

function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'card session-card';
    if (session.dangerousMode) {
        card.classList.add('dangerous-mode');
    }
    card.dataset.sessionId = session.id;

    const preview = session.preview?.slice(-3).join('\n') || '';
    const cleanPreview = stripAnsi(preview);
    const shortPath = shortenPath(session.cwd);
    const folderName = session.cwd.split('/').pop() || 'Home';

    card.innerHTML = `
        <div class="session-card-header">
            <span class="session-status"></span>
            <span class="session-name">${escapeHtml(folderName)}</span>
        </div>
        <div class="session-card-preview">
            <pre>${escapeHtml(cleanPreview) || 'Starting...'}</pre>
        </div>
        <div class="session-card-footer">
            <span class="session-path">${escapeHtml(shortPath)}</span>
        </div>
    `;

    card.addEventListener('click', () => showTerminalView(session.id));
    return card;
}

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shortenPath(fullPath) {
    if (homeDir && fullPath.startsWith(homeDir)) {
        return '~' + fullPath.slice(homeDir.length);
    }
    return fullPath;
}

async function createNewSession() {
    console.log('createNewSession called');
    const result = await window.api.selectDirectory();
    console.log('selectDirectory result:', result);
    const folder = unwrap(result);
    if (!folder) return;

    await startSessionAtPath(folder);
}

async function startSessionAtPath(folder) {
    // Load mode preference for this path
    const modeResult = await window.api.modes.get(folder);
    const modeData = unwrap(modeResult) || { dangerousMode: false };

    const result = await window.api.createSession(folder, { dangerousMode: modeData.dangerousMode });
    const session = unwrap(result);
    if (!session) return;
    await refreshAll();
    showTerminalView(session.id);
}

async function pinCurrentPath() {
    if (currentSessionPath) {
        const result = await window.api.addPin(currentSessionPath);
        unwrap(result);
        // Visual feedback with iOS-style animation
        btnPin.classList.add('pin-success');
        setTimeout(() => {
            btnPin.classList.remove('pin-success');
        }, 600);
    }
}

async function showTerminalView(sessionId) {
    const result = await window.api.getSession(sessionId);
    const session = unwrap(result);
    if (!session) {
        showGridView();
        return;
    }

    currentSessionId = sessionId;
    currentSessionPath = session.cwd;

    // Load mode preference and update toggle
    const modeResult = await window.api.modes.get(session.cwd);
    const modeData = unwrap(modeResult) || { dangerousMode: false };
    const isDangerousMode = session.dangerousMode || modeData.dangerousMode;
    modeToggleInput.checked = isDangerousMode;
    updateModeLabel(isDangerousMode);

    const folderName = session.cwd.split('/').pop() || 'Session';
    terminalTitle.textContent = folderName;
    terminalPath.textContent = shortenPath(session.cwd);

    // Check if we have a cached terminal for this session
    let cached = terminalCache.get(sessionId);

    if (cached) {
        // Reuse existing terminal - just reattach it
        terminalContainer.innerHTML = '';
        terminalContainer.appendChild(cached.element);

        // Switch views
        gridView.classList.remove('active');
        terminalView.classList.add('active');
        await window.api.resizePopover('terminal');

        // Refit and focus
        setTimeout(() => {
            cached.fitAddon.fit();
            cached.terminal.focus();
        }, 50);
    } else {
        // Create new terminal for this session
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: '"SF Mono", "Monaco", "Menlo", monospace',
            lineHeight: 1.2,
            theme: {
                background: '#161618',
                foreground: '#ffffff',
                cursor: '#0a84ff',
                cursorAccent: '#161618',
                selectionBackground: 'rgba(10, 132, 255, 0.3)',
                black: '#1c1c1e',
                red: '#ff453a',
                green: '#30d158',
                yellow: '#ffd60a',
                blue: '#0a84ff',
                magenta: '#bf5af2',
                cyan: '#64d2ff',
                white: '#ffffff',
                brightBlack: '#636366',
                brightRed: '#ff453a',
                brightGreen: '#30d158',
                brightYellow: '#ffd60a',
                brightBlue: '#0a84ff',
                brightMagenta: '#bf5af2',
                brightCyan: '#64d2ff',
                brightWhite: '#ffffff'
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Create element to hold terminal
        const element = document.createElement('div');
        element.style.height = '100%';
        element.style.width = '100%';

        terminalContainer.innerHTML = '';
        terminalContainer.appendChild(element);

        // Switch views
        gridView.classList.remove('active');
        terminalView.classList.add('active');
        await window.api.resizePopover('terminal');

        // Open terminal
        terminal.open(element);

        // Cache it
        terminalCache.set(sessionId, { terminal, fitAddon, element });

        // Setup after DOM is ready
        setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims && dims.cols > 0 && dims.rows > 0) {
                window.api.resize(sessionId, dims.cols, dims.rows);
            }
            terminal.focus();
        }, 100);

        // Wire up input
        terminal.onData((data) => {
            window.api.write(sessionId, data);
        });
    }
}

function showGridView() {
    resetToGrid();
    window.api.resizePopover('grid');
}

function resetToGrid() {
    gridView.classList.add('active');
    terminalView.classList.remove('active');

    // Don't dispose terminal - keep it cached
    currentSessionId = null;
    currentSessionPath = null;

    refreshAll();
}

async function killCurrentSession() {
    if (currentSessionId) {
        // Dispose and remove from cache
        const cached = terminalCache.get(currentSessionId);
        if (cached) {
            cached.terminal.dispose();
            terminalCache.delete(currentSessionId);
        }

        const result = await window.api.killSession(currentSessionId);
        unwrap(result);
        showGridView();
    }
}

function handleResize() {
    if (!currentSessionId) return;
    const cached = terminalCache.get(currentSessionId);
    if (cached) {
        cached.fitAddon.fit();
        const dims = cached.fitAddon.proposeDimensions();
        if (dims && typeof dims.cols === 'number' && typeof dims.rows === 'number'
            && dims.cols > 0 && dims.rows > 0) {
            window.api.resize(currentSessionId, dims.cols, dims.rows);
        } else {
            console.warn('Invalid terminal dimensions from fitAddon:', dims);
        }
    }
}

// Start
init();
