# Project: Claude Code Menu Bar

## One-Liner

A macOS menu bar companion for Claude Code that streamlines session management and GSD workflow execution with an iOS-inspired interface.

## Core Value

**Make Claude Code sessions instantly accessible and GSD workflows one-click away.**

The app should feel like a native iOS control center for Claude Code - tap to launch, tap to run commands, minimal friction.

## Vision

Transform the existing session launcher into a comprehensive Claude Code companion that:
- Manages multiple Claude sessions from the menu bar
- Provides quick-access buttons for GSD commands (`/gsd:plan-phase`, `/gsd:execute-plan`, etc.)
- Supports dangerous mode toggle (`--dangerously-skip-permissions`)
- Features a polished iOS liquid glass aesthetic with blur effects
- Keeps the current card-expands-to-terminal UX pattern

## Target User

Developers who use Claude Code daily and want:
- Faster session switching without terminal tab hunting
- One-click GSD workflow execution
- Visual session management with live previews
- A beautiful, native-feeling macOS experience

## Features

### Must Have (MVP)
- Quick command buttons for GSD workflows in terminal view
- Toggle for `--dangerously-skip-permissions` mode per session
- Security hardening (fix nodeIntegration, CSP, error handling)
- iOS liquid glass blur UI treatment

### Should Have
- Session preferences (remember mode settings per pinned path)
- Command palette / quick switcher
- Session status indicators (idle/active/error)

### Nice to Have
- Session persistence across app restarts
- Keyboard shortcuts for common actions
- Custom command presets

## Technical Constraints

- **Platform**: macOS only (Electron menu bar app)
- **Stack**: Electron 27+, node-pty, xterm.js, electron-store
- **Design**: iOS Human Interface Guidelines inspiration
- **Security**: Must fix current vulnerabilities before adding features

## Key Decisions

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Keep Electron | Yes | Existing foundation works, native PTY integration | 2026-01-15 |
| iOS design language | Yes | User preference, clean aesthetic | 2026-01-15 |
| Fix security first | Yes | nodeIntegration issue is critical | 2026-01-15 |

## Out of Scope

- Windows/Linux support
- Remote session management
- Built-in Claude API integration (uses CLI)
- Plugin system

## Success Criteria

1. Can launch GSD commands with single click from UI
2. Dangerous mode toggle works reliably
3. UI feels native and polished (liquid glass effects)
4. No security warnings in Electron
5. Smooth 60fps animations throughout
