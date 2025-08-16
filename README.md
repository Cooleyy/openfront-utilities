# OpenFront Utilities - Developer Context for LLMs

This repository contains helper scripts and utilities for the browser game **OpenFront.io**. This README provides essential context for LLMs working on OpenFront-related development tasks.

## About OpenFront.io

OpenFront.io is a real-time strategy browser game built with TypeScript/JavaScript. Players compete to control territory, manage resources (gold, troops), build structures, and wage warfare on a shared map.


### Key Game Concepts
- **Resources**: Players have gold (for building) and troops (for attacking/defending)
- **Structures**: Cities, ports, missile silos, defense posts, SAM launchers, etc.
- **Warfare**: Nuclear weapons, conventional attacks, alliances, embargos
- **Real-time**: Game state updates continuously, ~10 ticks per second

## Understanding the Game's Technical Architecture

### Game Code Location
code location /mnt/c/Users/Jason/Documents/Repos/OpenFrontIO1
The main OpenFront.io game code is located in the **OpenFrontIO** repository (sibling to this repo). Key directories:
- `src/client/` - Browser-side game logic and UI
- `src/core/` - Shared game logic (client/server)
- `src/server/` - Server-side game management

### Important Files for Script Development

**Client-Side UI Components** (LitElement-based):
- `src/client/graphics/layers/ControlPanel.ts` - Player resource display (gold, troops)
- `src/client/graphics/layers/BuildMenu.ts` - Building placement menu
- `src/client/graphics/layers/PlayerPanel.ts` - Player information display
- `src/client/graphics/layers/GameLeftSidebar.ts` - Leaderboards
- `src/client/graphics/layers/GameRightSidebar.ts` - Game controls

**Core Game Logic**:
- `src/core/game/PlayerImpl.ts` - Player state and methods (gold, troops, buildings)
- `src/core/game/GameImpl.ts` - Main game state management
- `src/core/game/GameView.ts` - Client-side game state interface
- `src/client/Utils.ts` - Utility functions like `renderNumber()` for formatting

### Game State Access Patterns

**DOM-based approach** (recommended for userscripts):
```javascript
// Find UI elements
const controlPanel = document.querySelector('control-panel');
const buildMenu = document.querySelector('build-menu');

// Parse displayed values
const goldSpans = controlPanel.querySelectorAll('span[translate="no"]');
```

**Direct game object access** (more fragile):
```javascript
// Look for elements with game state
const gameElements = document.querySelectorAll('[class*="game"]');
const gameObj = element._game || element.game;
const player = gameObj.myPlayer();
const gold = player.gold(); // Returns bigint
```

## Userscript Development with Tampermonkey

### Platform
We use **Tampermonkey** (browser extension) to inject JavaScript into the OpenFront.io website. Scripts run in the browser alongside the game.

### Script Structure Template
```javascript
// ==UserScript==
// @name         Script Name
// @namespace    https://openfront.io
// @version      1.0
// @description  Brief description
// @match        https://openfront.io/*
// @match        https://www.openfront.io/*
// @match        http://localhost:9000/*
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[Script Name] Script loaded');
    
    // Your code here
    
})();
```

### Common Patterns and Best Practices

#### 1. Game State Detection
```javascript
function isInGame() {
    const gameCanvas = document.querySelector('canvas');
    const controlPanel = document.querySelector('control-panel');
    const gameLeftSidebar = document.querySelector('game-left-sidebar');
    return !!(gameCanvas && controlPanel && gameLeftSidebar);
}
```

#### 2. Resource Reading
```javascript
function getCurrentGold() {
    const controlPanel = document.querySelector('control-panel');
    if (!controlPanel) return null;
    
    const goldSpans = controlPanel.querySelectorAll('span[translate="no"]');
    for (const span of goldSpans) {
        const text = span.textContent;
        const match = text.match(/^([\d,]+(?:\.\d+)?)\s*([kKmM]?)$/);
        if (match) {
            let value = parseFloat(match[1].replace(/,/g, ''));
            const suffix = match[2].toLowerCase();
            if (suffix === 'k') value *= 1000;
            if (suffix === 'm') value *= 1000000;
            return Math.floor(value);
        }
    }
    return null;
}
```

#### 3. Menu Interaction (Build Menu Example)
```javascript
function openBuildMenu(mouseX, mouseY) {
    const canvas = document.querySelector('canvas');
    const isMac = /Mac/.test(navigator.userAgent);
    
    canvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: mouseX,
        clientY: mouseY,
        ctrlKey: !isMac,
        metaKey: isMac
    }));
}

function clickBuildingButton(buildMenu, iconName) {
    const buttons = buildMenu.shadowRoot.querySelectorAll('button');
    for (const button of buttons) {
        const img = button.querySelector('img');
        if (img && img.src.includes(iconName)) {
            if (!button.disabled) {
                button.click();
            }
            break;
        }
    }
}
```

#### 4. Audio Generation
```javascript
function playWarningSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    
    // Fade in/out to avoid clicks
    const now = audioContext.currentTime;
    const duration = 0.5; // seconds
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
}
```

#### 5. Game State Monitoring
```javascript
let gameStarted = false;

function monitorGameState() {
    if (!isInGame()) {
        if (gameStarted) {
            // Player left game, reset state
            gameStarted = false;
            resetScriptState();
        }
        return;
    }
    
    if (!gameStarted) {
        // Player entered game
        gameStarted = true;
        initializeScript();
    }
    
    // Main monitoring logic here
}

setInterval(monitorGameState, 500); // Check every 500ms
```

### Logging Best Practices
- Use consistent prefixes: `[Script Name] Message`
- Minimize spam - only log important events
- Use styled console messages for warnings:
```javascript
console.log('%c⚠️ WARNING MESSAGE', 
           'background: red; color: white; font-weight: bold; padding: 5px;');
```

### Browser Compatibility
- Target modern browsers (Chrome, Firefox, Edge)
- Use standard Web APIs (DOM, Web Audio, etc.)
- No external dependencies - scripts must be self-contained
- Handle browser autoplay policies for audio

## Existing Scripts

### openfront-hotkeys
**Purpose**: Keyboard shortcuts for building structures and launching nukes
**Key Features**: 
- Invisible build menu manipulation
- Turbo mode for rapid building
- Hotkey mapping (C=City, Q=Port, etc.)

### openfront-warnings  
**Purpose**: Audio alerts for game events
**Current Implementation**: Gold threshold warning at 125k
**Key Features**:
- Game state detection
- Resource monitoring
- Audio generation

## Common Challenges & Solutions

### 1. Game Updates Breaking Scripts
**Problem**: Game UI changes can break DOM selectors
**Solution**: Use semantic selectors when possible, fallback methods

### 2. Shadow DOM Access
**Problem**: Build menu uses Shadow DOM
**Solution**: Access via `element.shadowRoot.querySelector()`

### 3. Audio Context Restrictions
**Problem**: Browser autoplay policies prevent audio
**Solution**: Initialize audio context after user interaction

### 4. Performance Concerns
**Problem**: Continuous monitoring can impact performance
**Solution**: Use reasonable intervals (500ms), efficient selectors

### 5. Game State Transitions
**Problem**: Detecting lobby vs. active game
**Solution**: Check for multiple UI elements simultaneously

## Development Workflow

1. **Research**: Examine OpenFrontIO source code to understand game mechanics
2. **Plan**: Identify DOM elements and interaction patterns needed
3. **Develop**: Write userscript with proper error handling
4. **Test**: Verify functionality in actual game sessions
5. **Document**: Update CONTEXT_FOR_LLM.txt with implementation details
6. **Maintain**: Monitor for game updates that might break functionality

## Repository Structure

```
openfront-utilities/
├── README.md (this file)
├── openfront-hotkeys/
│   ├── openfront_hotkeys.user.js
│   └── CONTEXT_FOR_LLM.txt
└── openfront-warnings/
    ├── openfront_gold_warning.user.js
    └── CONTEXT_FOR_LLM.txt
```

Each script directory contains:
- `.user.js` - The Tampermonkey userscript
- `CONTEXT_FOR_LLM.txt` - Detailed technical documentation

## Getting Started for New LLMs

1. **Read the game context**: Start with this README
2. **Examine existing scripts**: Look at openfront-hotkeys for complex examples
3. **Check the OpenFrontIO source**: Use `../OpenFrontIO/` to understand game internals
4. **Read CONTEXT files**: Each script has detailed implementation notes
5. **Follow the patterns**: Use established conventions for consistency

## Important Notes for LLMs

- **Game changes frequently**: Always verify current DOM structure
- **User experience matters**: Scripts should enhance, not disrupt gameplay
- **Performance is critical**: The game runs real-time, avoid heavy operations
- **Security first**: Never access sensitive data or make external requests
- **Test thoroughly**: Game mechanics can be complex and scripts must handle edge cases

This context should provide sufficient background for developing robust, maintainable OpenFront.io userscripts.
