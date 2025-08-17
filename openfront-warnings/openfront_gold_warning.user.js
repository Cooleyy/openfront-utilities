// ==UserScript==
// @name         OpenFront Gold Warning
// @namespace    https://openfront.io
// @version      1.1
// @description  Audio warning when your gold reaches 125k for the first time in a game
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

    console.log('[OpenFront Gold Warning v1.1] Script loaded');

    // Configuration
    const GOLD_THRESHOLD = 125000; // 125k gold
    const AUDIO_FREQUENCY = 1200; // Hz for the warning tone
    const AUDIO_DURATION = 50; // ms for the beep

    // State tracking
    let warningTriggered = false;
    let lastKnownGold = 0;
    let gameStarted = false;
    let playerFound = false;
    let checkInterval = null;

    // Audio context for generating warning sound
    let audioContext = null;

    // Initialize audio context (must be done after user interaction)
    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('[OpenFront Gold Warning] Failed to initialize audio context:', e);
            }
        }
    }

    // Play warning beep sound
    function playWarningSound() {
        if (!audioContext) {
            initAudioContext();
            if (!audioContext) return;
        }

        // Resume audio context if suspended (browser policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = AUDIO_FREQUENCY;
        oscillator.type = 'sine';

        // Fade in/out to avoid clicks
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.5, now + AUDIO_DURATION / 1000 - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + AUDIO_DURATION / 1000);

        oscillator.start(now);
        oscillator.stop(now + AUDIO_DURATION / 1000);
    }

    // Get current player's gold from the game
    function getCurrentGold() {
        try {
            // Try to find the control panel which displays the player's gold
            const controlPanel = document.querySelector('control-panel');
            if (!controlPanel) return null;

            // Look for the gold display in the control panel
            // Based on the structure, gold comes after troops
            const goldSpans = controlPanel.querySelectorAll('span[translate="no"]');
            let foundTroopSection = false;
            
            for (let i = 0; i < goldSpans.length; i++) {
                const span = goldSpans[i];
                const text = span.textContent || span.innerText;

                if (!text) continue;

                // If this span contains "/", it's the main troop display
                if (text.includes('/')) {
                    foundTroopSection = true;
                    continue;
                }
                
                // Skip parentheses-only spans (troop rate indicators)
                if (text.includes('(') && text.includes(')') && !text.match(/^\d+/)) {
                    continue;
                }
                
                // If we haven't found the troop section yet, keep looking
                if (!foundTroopSection) {
                    continue;
                }

                // Look for gold pattern - could be "0 (+0)" format or simple number
                let goldText = text;
                if (text.includes('(') && text.includes(')')) {
                    // Extract number before parentheses: "0 (+0)" -> "0"
                    const match = text.match(/^([\d,]+(?:\.\d+)?[kKmM]?)/);
                    if (match) {
                        goldText = match[1].trim();
                    } else {
                        continue;
                    }
                }
                
                const goldMatch = goldText.match(/^([\d,]+(?:\.\d+)?)\s*([kKmM]?)$/);
                if (goldMatch) {
                    let value = parseFloat(goldMatch[1].replace(/,/g, ''));
                    const suffix = goldMatch[2].toLowerCase();

                    if (suffix === 'k') {
                        value *= 1000;
                    } else if (suffix === 'm') {
                        value *= 1000000;
                    }

                    // Gold should be in reasonable range
                    if (value >= 0 && value <= 10000000) {
                        return Math.floor(value);
                    }
                }
            }

            // Alternative approach: try to access game state directly if control panel parsing fails
            const gameElements = document.querySelectorAll('[class*="game"], [class*="player"], [class*="resource"]');

            for (let i = 0; i < gameElements.length; i++) {
                const element = gameElements[i];

                if (element._game || element.game) {
                    const gameObj = element._game || element.game;

                    if (gameObj.myPlayer && typeof gameObj.myPlayer === 'function') {
                        const player = gameObj.myPlayer();

                        if (player && player.gold && typeof player.gold === 'function') {
                            const gold = player.gold();
                            return typeof gold === 'bigint' ? Number(gold) : gold;
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    // Check if we're in a game (not lobby/menu)
    function isInGame() {
        // Look for game-specific elements that indicate we're in an active game
        const gameCanvas = document.querySelector('canvas');
        const controlPanel = document.querySelector('control-panel');
        const gameLeftSidebar = document.querySelector('game-left-sidebar');

        return !!(gameCanvas && controlPanel && gameLeftSidebar);
    }

    // Reset warning state for new game
    function resetForNewGame() {
        warningTriggered = false;
        lastKnownGold = 0;
        playerFound = false;
    }

    // Main monitoring function
    function checkGoldThreshold() {
        if (!isInGame()) {
            if (gameStarted) {
                resetForNewGame();
                gameStarted = false;
            }
            return;
        }

        if (!gameStarted) {
            gameStarted = true;
            resetForNewGame();
        }

        const currentGold = getCurrentGold();

        if (currentGold === null) {
            return;
        }
        
        // Log current detected gold
        console.log(`[OpenFront Gold Warning] Current gold: ${currentGold}`);

        if (!playerFound) {
            playerFound = true;
        }

        // Update last known gold
        lastKnownGold = currentGold;

        // Check if we've hit the threshold for the first time
        if (currentGold >= GOLD_THRESHOLD && !warningTriggered) {
            warningTriggered = true;
            console.log(`[OpenFront Gold Warning] THRESHOLD REACHED! Gold: ${currentGold.toLocaleString()}`);

            // Play warning sound
            playWarningSound();

            // Also show a console message that's easy to spot
            console.log('%c🚨 GOLD WARNING: 125K REACHED! TIME TO BUILD! 🚨',
                       'background: gold; color: black; font-size: 16px; font-weight: bold; padding: 10px;');
        }
    }

    // Initialize audio context on first user interaction
    function handleFirstInteraction() {
        initAudioContext();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
    }

    // Start monitoring when the page is ready
    function startMonitoring() {
        // Set up audio context initialization on first interaction
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);

        // Start checking every 500ms
        checkInterval = setInterval(checkGoldThreshold, 500);
    }

    // Wait for the page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        // Page already loaded
        setTimeout(startMonitoring, 1000);
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (checkInterval) {
            clearInterval(checkInterval);
        }
        if (audioContext) {
            audioContext.close();
        }
    });

})();


