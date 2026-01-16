const pty = require('node-pty');
const os = require('os');
const path = require('path');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.nextId = 1;
        this.outputCallbacks = new Set();
    }

    createSession(cwd = os.homedir(), options = {}) {
        const { dangerousMode = false } = options;
        const id = this.nextId++;
        const shell = process.env.SHELL || '/bin/zsh';

        // Spawn an interactive login shell
        const ptyProcess = pty.spawn(shell, ['--login', '-i'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: cwd,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                // Ensure PATH includes common locations for claude
                PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin:${os.homedir()}/.local/bin:${os.homedir()}/.npm-global/bin`
            }
        });

        // Track shell readiness for claude launch
        let claudeLaunched = false;
        let outputBuffer = '';

        const session = {
            id,
            pid: ptyProcess.pid,
            cwd,
            dangerousMode,
            ptyProcess,
            outputBuffer: [],      // Line-based buffer for preview cards
            rawBuffer: '',         // Raw output for terminal restoration
            maxBufferLines: 1000,
            maxRawBuffer: 100000,  // ~100KB of raw output
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        // Capture output and detect shell ready state
        ptyProcess.onData((data) => {
            session.lastActivity = Date.now();
            outputBuffer += data;

            // Detect shell ready state by looking for prompt patterns
            // Strip ANSI escape codes first for reliable detection
            const cleanBuffer = outputBuffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
            // Common prompts: $ (bash/zsh), % (zsh), > (fish), # (root), or ❯ (starship/powerlevel)
            // Only launch claude once, after first prompt is detected
            if (!claudeLaunched && /[$%>#❯→]\s*$/.test(cleanBuffer)) {
                claudeLaunched = true;
                // Small delay after prompt detection to ensure shell is fully ready
                setTimeout(() => {
                    const claudeCmd = dangerousMode
                        ? 'claude --dangerously-skip-permissions\r'
                        : 'claude\r';
                    ptyProcess.write(claudeCmd);
                }, 100);
            }

            // Add to raw buffer for terminal restoration
            session.rawBuffer += data;
            if (session.rawBuffer.length > session.maxRawBuffer) {
                session.rawBuffer = session.rawBuffer.slice(-session.maxRawBuffer);
            }

            // Add to line buffer for preview cards
            const lines = data.split('\n');
            session.outputBuffer.push(...lines);
            if (session.outputBuffer.length > session.maxBufferLines) {
                session.outputBuffer = session.outputBuffer.slice(-session.maxBufferLines);
            }

            // Notify all callbacks
            this.outputCallbacks.forEach(cb => {
                try {
                    cb(id, data);
                } catch (e) {
                    console.error('Output callback error:', e);
                }
            });
        });

        ptyProcess.onExit(({ exitCode }) => {
            console.log(`Session ${id} exited with code ${exitCode}`);
            this.sessions.delete(id);
            // Notify that session ended
            this.outputCallbacks.forEach(cb => {
                try {
                    cb(id, null, { exited: true, exitCode });
                } catch (e) {
                    console.error('Exit callback error:', e);
                }
            });
        });

        this.sessions.set(id, session);
        return { id, cwd, pid: ptyProcess.pid };
    }

    // Validate session ID exists
    validateSessionId(id) {
        if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
            throw new Error('Invalid session ID: must be a non-empty string or number');
        }
        if (!this.sessions.has(id)) {
            throw new Error(`Session not found: ${id}`);
        }
        return true;
    }

    killSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            session.ptyProcess.kill();
            this.sessions.delete(id);
            return true;
        }
        return false;
    }

    write(id, data) {
        this.validateSessionId(id);
        if (typeof data !== 'string') {
            throw new Error('Invalid data: must be a string');
        }
        const session = this.sessions.get(id);
        session.ptyProcess.write(data);
        return true;
    }

    resize(id, cols, rows) {
        this.validateSessionId(id);

        // Parse and validate dimensions
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
        return true;
    }

    getSession(id) {
        this.validateSessionId(id);
        const session = this.sessions.get(id);

        return {
            id: session.id,
            cwd: session.cwd,
            pid: session.pid,
            dangerousMode: session.dangerousMode,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            recentOutput: session.rawBuffer  // Raw output preserves escape sequences
        };
    }

    getAllSessions() {
        return Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            cwd: session.cwd,
            pid: session.pid,
            dangerousMode: session.dangerousMode,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            preview: this.getPreviewLines(session, 4)
        }));
    }

    getPreviewLines(session, lineCount = 4) {
        // Get last N non-empty lines for preview
        const lines = session.outputBuffer
            .filter(line => line.trim().length > 0)
            .slice(-lineCount);
        return lines;
    }

    onOutput(callback) {
        this.outputCallbacks.add(callback);
        return () => this.outputCallbacks.delete(callback);
    }

    killAll() {
        for (const [id, session] of this.sessions) {
            session.ptyProcess.kill();
        }
        this.sessions.clear();
    }
}

module.exports = SessionManager;
