# Roadmap: Claude Code Menu Bar

## Overview

Transform the existing Claude Code session launcher into a comprehensive developer companion with GSD workflow integration, session mode controls, and an iOS liquid glass aesthetic. Security hardening comes first, then features, then polish.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Security Foundation** - Fix critical vulnerabilities and error handling
- [ ] **Phase 2: GSD Quick Commands** - Add command buttons for GSD workflows
- [ ] **Phase 3: Session Modes** - Dangerous mode toggle and session preferences
- [ ] **Phase 4: iOS Liquid Glass UI** - Blur effects, animations, visual polish
- [ ] **Phase 5: Developer Features** - Session persistence, shortcuts, status indicators

## Phase Details

### Phase 1: Security Foundation
**Goal**: Harden the app by fixing security vulnerabilities and adding proper error handling
**Depends on**: Nothing (first phase)
**Research**: Unlikely (established Electron security patterns)
**Plans**: TBD

Key work:
- Set `nodeIntegration: false` (currently contradicts contextIsolation)
- Tighten CSP policy (remove `unsafe-eval` if possible)
- Add try/catch to all IPC handlers
- Add input validation for paths and session IDs
- Fix race conditions (shell init timing)

### Phase 2: GSD Quick Commands
**Goal**: Add UI for launching GSD commands directly from terminal view
**Depends on**: Phase 1
**Research**: Unlikely (internal UI work)
**Plans**: TBD

Key work:
- Command button bar in terminal header
- Quick commands: `/gsd:plan-phase`, `/gsd:execute-plan`, `/gsd:progress`, `/gsd:status`
- Send command text directly to PTY session
- Visual feedback on command execution

### Phase 3: Session Modes
**Goal**: Add dangerous mode toggle and session-level preferences
**Depends on**: Phase 2
**Research**: Unlikely (internal feature)
**Plans**: TBD

Key work:
- Toggle switch for `--dangerously-skip-permissions` mode
- Restart session with new flags when toggled
- Remember mode preference per pinned path
- Visual indicator showing current mode (safe/dangerous)

### Phase 4: iOS Liquid Glass UI
**Goal**: Apply iOS-inspired liquid glass blur effects throughout the UI
**Depends on**: Phase 3
**Research**: Likely (CSS backdrop-filter patterns, macOS vibrancy)
**Research topics**: CSS backdrop-filter performance, Electron vibrancy API, iOS glassmorphism patterns
**Plans**: TBD

Key work:
- Frosted glass effect on popover background
- Blur behind cards and headers
- Refined shadows and depth
- Smooth transitions between blur states
- Ensure 60fps performance

### Phase 5: Developer Features
**Goal**: Add quality-of-life features for power users
**Depends on**: Phase 4
**Research**: Unlikely (internal features)
**Plans**: TBD

Key work:
- Session persistence across app restarts
- Keyboard shortcuts (Cmd+1-9 for sessions, Cmd+N new session)
- Session status indicators (idle/active/error with colors)
- Command history per session

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation | 0/TBD | Not started | - |
| 2. GSD Quick Commands | 0/TBD | Not started | - |
| 3. Session Modes | 0/TBD | Not started | - |
| 4. iOS Liquid Glass UI | 0/TBD | Not started | - |
| 5. Developer Features | 0/TBD | Not started | - |
