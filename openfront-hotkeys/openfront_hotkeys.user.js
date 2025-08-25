// ==UserScript==
// @name         OpenFront Building Hotkeys
// @namespace    https://openfront.io
// @version      1.5
// @description  Hotkeys for buildings and nukes in OpenFront.io with optimized menu
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

    console.log('[OpenFront Hotkeys v1.5] Script loaded');

    // Hotkey configuration
    const HOTKEYS = {
        'KeyC': { icon: 'CityIconWhite', name: 'City', shift: false },
        'KeyQ': { icon: 'PortIcon', name: 'Port', shift: false },
        'KeyA': { icon: 'FactoryIconWhite', name: 'Factory', shift: false },
        'KeyW': { icon: 'BattleshipIconWhite', name: 'Warship', shift: false },
        'KeyS': { icon: 'MissileSiloIconWhite', name: 'Missile Silo', shift: false },
        'KeyD': { icon: 'ShieldIconWhite', name: 'Defense Post', shift: false },
        'KeyZ': { icon: 'SamLauncherIconWhite', name: 'SAM Launcher', shift: false },
        'KeyR': { icon: 'NukeIconWhite', name: 'Atom Bomb', shift: true },
        'KeyF': { icon: 'MushroomCloudIconWhite', name: 'Hydrogen Bomb', shift: true },
        'KeyV': { icon: 'MIRVIcon', name: 'MIRV', shift: true }
    };

    let mouseX = 0;
    let mouseY = 0;
    let isHotkeyTriggered = false;

    // Per-key debouncing and turbo state
    const keyState = {}; // e.g., keyState['KeyC'] = { pressed: false, pressedAt: 0, rapidStartTimeoutId: null, rapidIntervalId: null }
    const DEBOUNCE_TIME = 150; // reserved for future tap debouncing if needed
    const RAPID_BUILD_THRESHOLD = 1000; // ms holding before turbo starts
    const RAPID_BUILD_INTERVAL = 100; // ms between rapid builds

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Listen for hotkeys with per-key debouncing and turbo
    document.addEventListener('keydown', (e) => {
        const hotkey = HOTKEYS[e.code];
        if (!hotkey) return;

        // Shift requirement
        if (hotkey.shift && !e.shiftKey) return;
        if (!hotkey.shift && e.shiftKey) return;

        // Ignore typing in inputs
        const tag = (e.target && e.target.tagName) ? e.target.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        // Ignore other modifiers
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        e.preventDefault();

        // Ensure state object exists
        if (!keyState[e.code]) keyState[e.code] = { pressed: false, pressedAt: 0, rapidStartTimeoutId: null, rapidIntervalId: null };
        const state = keyState[e.code];

        // First physical press
        if (!state.pressed) {
            state.pressed = true;
            state.pressedAt = Date.now();
            console.log(`[OpenFront Hotkeys] ${e.code} pressed - single build for ${hotkey.name}`);
            performSingleBuild(hotkey);

            // Schedule turbo start after threshold if still held
            state.rapidStartTimeoutId = setTimeout(() => {
                if (state.pressed && !state.rapidIntervalId) {
                    console.log(`[OpenFront Hotkeys] ${hotkey.name} turbo mode started`);
                    state.rapidIntervalId = setInterval(() => {
                        if (!state.pressed) return;
                        performSingleBuild(hotkey);
                    }, RAPID_BUILD_INTERVAL);
                }
            }, RAPID_BUILD_THRESHOLD);
            return;
        }

        // Already pressed: ignore repeats until turbo kicks in. If threshold passed without repeat, ensure turbo starts.
        const now = Date.now();
        if (now - state.pressedAt >= RAPID_BUILD_THRESHOLD && !state.rapidIntervalId) {
            console.log(`[OpenFront Hotkeys] ${hotkey.name} turbo mode started (late)`);
            state.rapidIntervalId = setInterval(() => {
                if (!state.pressed) return;
                performSingleBuild(hotkey);
            }, RAPID_BUILD_INTERVAL);
        }
    });

    // Stop turbo and reset on keyup
    document.addEventListener('keyup', (e) => {
        const state = keyState[e.code];
        if (!state) return;
        state.pressed = false;
        if (state.rapidStartTimeoutId) {
            clearTimeout(state.rapidStartTimeoutId);
            state.rapidStartTimeoutId = null;
        }
        if (state.rapidIntervalId) {
            clearInterval(state.rapidIntervalId);
            state.rapidIntervalId = null;
            console.log(`[OpenFront Hotkeys] ${e.code} turbo mode stopped`);
        }
    });

    // Perform a single build action safely (no double-trigger from observer/fallback)
    async function performSingleBuild(hotkey) {
        // Find the game canvas
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            console.log('[OpenFront Hotkeys] No canvas found');
            return;
        }

        isHotkeyTriggered = true;
        console.log('[OpenFront Hotkeys] Opening build menu...');
        const isMac = /Mac/.test(navigator.userAgent);

        // IMPORTANT: Only send a modifier pointerup to open the menu.
        // Sending pointerdown sets the game's pointerDown flag and causes camera pan/zoom when the mouse moves during turbo.
        canvas.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            clientX: mouseX,
            clientY: mouseY,
            button: 0,
            buttons: 0,
            ctrlKey: !isMac,
            metaKey: isMac
        }));

        let processed = false;
        let fallbackId = null;

        const observer = new MutationObserver((mutations, obs) => {
            const buildMenu = document.querySelector('build-menu');
            if (buildMenu && buildMenu.shadowRoot && !processed) {
                processed = true;
                obs.disconnect();
                // Hide menu immediately for hotkey triggers
                buildMenu.style.transition = 'none';
                buildMenu.style.opacity = '0.01';
                buildMenu.style.pointerEvents = 'auto';
                if (fallbackId) clearTimeout(fallbackId);
                clickBuildingButton(buildMenu, hotkey);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Fallback after 80ms (slightly longer to reduce race)
        fallbackId = setTimeout(() => {
            if (processed) return;
            observer.disconnect();
            const buildMenu = document.querySelector('build-menu');
            if (!buildMenu) {
                console.log('[OpenFront Hotkeys] No build menu found');
                isHotkeyTriggered = false;
                return;
            }
            if (buildMenu.style.opacity !== '0.01') {
                buildMenu.style.transition = 'none';
                buildMenu.style.opacity = '0.01';
                buildMenu.style.pointerEvents = 'auto';
            }
            processed = true;
            clickBuildingButton(buildMenu, hotkey);
        }, 80);
    }

    // Helper to close the build menu cleanly (escape)
    function closeBuildMenu(buildMenu) {
        try {
            // Restore any styles we changed
            buildMenu.style.transition = '';
            buildMenu.style.opacity = '';
            buildMenu.style.pointerEvents = '';
            // Dispatch Escape to let the game close the menu in its normal path
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
        } catch (e) {
            console.warn('[OpenFront Hotkeys] Error closing build menu:', e);
        }
    }

    // Helper function to click the building button
    function clickBuildingButton(buildMenu, hotkey) {
        if (!buildMenu.shadowRoot) {
            console.log('[OpenFront Hotkeys] Build menu has no shadow root');
            isHotkeyTriggered = false;
            return;
        }

        console.log(`[OpenFront Hotkeys] Build menu found, looking for ${hotkey.name} button...`);

        // Find all buttons in the build menu
        const buttons = buildMenu.shadowRoot.querySelectorAll('button');
        console.log(`[OpenFront Hotkeys] Found ${buttons.length} buttons`);

        // Look for the target button
        let targetButton = null;
        for (const button of buttons) {
            const img = button.querySelector('img');
            if (img && img.src && img.src.includes(hotkey.icon)) {
                targetButton = button;
                console.log(`[OpenFront Hotkeys] Found ${hotkey.name} button!`);
                break;
            }
        }

        if (targetButton) {
            if (targetButton.disabled) {
                console.log(`[OpenFront Hotkeys] ${hotkey.name} button is disabled (not enough resources or invalid location)`);
                // Close the menu immediately so the next key press can try again
                closeBuildMenu(buildMenu);
            } else {
                console.log(`[OpenFront Hotkeys] Clicking ${hotkey.name} button...`);
                targetButton.click();
            }
        } else {
            console.log(`[OpenFront Hotkeys] ${hotkey.name} button not found`);
            // Keep menu hidden - user used hotkey intentionally
            // Log what buttons we did find for debugging
            buttons.forEach((button, i) => {
                const img = button.querySelector('img');
                if (img && img.src) {
                    const filename = img.src.split('/').pop();
                    console.log(`  Button ${i}: ${filename}`);
                }
            });
        }

        // Reset the flag after processing
        isHotkeyTriggered = false;
    }

    // Monitor for manual Ctrl+Click to ensure menu is ALWAYS visible
    document.addEventListener('pointerdown', (e) => {
        if ((e.ctrlKey || e.metaKey) && !isHotkeyTriggered) {
            console.log('[OpenFront Hotkeys] Manual Ctrl+Click detected');

            // Always restore any hidden menu immediately
            const existingMenu = document.querySelector('build-menu');
            if (existingMenu && (existingMenu.style.opacity === '0' || existingMenu.style.opacity === '0.01')) {
                console.log('[OpenFront Hotkeys] Restoring hidden menu for manual use');
                existingMenu.style.opacity = '';
                existingMenu.style.transition = '';
                existingMenu.style.pointerEvents = '';
            }

            // Watch for menu appearing and ensure it's visible
            const observer = new MutationObserver((mutations, obs) => {
                const buildMenu = document.querySelector('build-menu');
                if (buildMenu && !isHotkeyTriggered) {
                    // Force visibility for manual click
                    if (buildMenu.style.opacity === '0' || buildMenu.style.opacity === '0.01') {
                        console.log('[OpenFront Hotkeys] Forcing menu visible for manual click');
                        buildMenu.style.opacity = '';
                        buildMenu.style.transition = '';
                        buildMenu.style.pointerEvents = '';
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });

            // Stop observing after a moment
            setTimeout(() => {
                observer.disconnect();
            }, 200);
        }
    });

    // Monitor pointerup to ensure manual clicks always show menu
    document.addEventListener('pointerup', (e) => {
        if ((e.ctrlKey || e.metaKey) && !isHotkeyTriggered) {
            // Ensure menu is visible after manual click
            setTimeout(() => {
                const buildMenu = document.querySelector('build-menu');
                if (buildMenu && (buildMenu.style.opacity === '0' || buildMenu.style.opacity === '0.01')) {
                    console.log('[OpenFront Hotkeys] Ensuring menu visible after manual pointerup');
                    buildMenu.style.opacity = '';
                    buildMenu.style.transition = '';
                    buildMenu.style.pointerEvents = '';
                }
            }, 20);
        }
    });
})();
