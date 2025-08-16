// ==UserScript==
// @name         OpenFront Nuke Radius Overlay
// @namespace    https://openfront.io
// @version      1.0
// @description  Nuke radius overlay that modifies actual game tiles
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
    
    console.log('[Nuke Overlay] Script loaded');
    
    // Nuke radius values from game code
    const NUKE_RADII = {
        ATOM_BOMB: 30,
        HYDROGEN_BOMB: 100
    };
    
    const OVERLAY_STATES = {
        NONE: 0,
        ATOM_BOMB: 1,
        HYDROGEN_BOMB: 2
    };
    
    let currentOverlayState = OVERLAY_STATES.NONE;
    let mouseX = 0, mouseY = 0;
    let gameStarted = false;
    let gameTransformHandler = null;
    let gameObj = null;
    let overlayTiles = new Set();
    let originalPixelData = new Map(); // Store original pixel colors
    let lastCenterX = -1, lastCenterY = -1, lastRadius = 0;
    let needsCleanup = false;
    let isApplyingOverlay = false; // Flag to prevent recursion
    
    // Check if we're in an active game
    function isInGame() {
        const gameCanvas = document.querySelector('canvas');
        const controlPanel = document.querySelector('control-panel');
        const gameLeftSidebar = document.querySelector('game-left-sidebar');
        return !!(gameCanvas && controlPanel && gameLeftSidebar);
    }
    
    // Find game objects
    function findGameObjects() {
        try {
            const buildMenu = document.querySelector('build-menu');
            if (buildMenu && buildMenu.transformHandler && buildMenu.game) {
                gameTransformHandler = buildMenu.transformHandler;
                gameObj = buildMenu.game;
                console.log('[Nuke Overlay] Found game objects through build-menu');
                return true;
            }
            
            const emojiTable = document.querySelector('emoji-table');
            if (emojiTable && emojiTable.transformHandler && emojiTable.game) {
                gameTransformHandler = emojiTable.transformHandler;
                gameObj = emojiTable.game;
                console.log('[Nuke Overlay] Found game objects through emoji-table');
                return true;
            }
        } catch (error) {
            console.error('[Nuke Overlay] Error finding game objects:', error);
        }
        return false;
    }
    
    // Calculate if a tile should be highlighted (outline only)
    function shouldHighlightTile(tileX, tileY, centerX, centerY, radius) {
        if (currentOverlayState === OVERLAY_STATES.NONE) return false;
        
        const dx = tileX - centerX;
        const dy = tileY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only highlight tiles on the border (outline)
        // We want tiles that are within the radius but close to the edge
        const borderThickness = 1.5; // How thick the border should be
        return distance <= radius && distance >= (radius - borderThickness);
    }
    
    // Hook into the game's territory layer to modify tile colors
    function hookIntoRendering() {
        // Hook into putImageData to modify tile colors
        const originalPutImageData = CanvasRenderingContext2D.prototype.putImageData;
        
        CanvasRenderingContext2D.prototype.putImageData = function(imageData, dx, dy, ...args) {
            // Prevent recursion when we're applying our overlay
            if (isApplyingOverlay) {
                return originalPutImageData.call(this, imageData, dx, dy, ...args);
            }
            
            // Check if this imageData contains updates to our overlayed pixels
            // and update our stored original colors accordingly
            if (gameObj && overlayTiles.size > 0) {
                const gameWidth = gameObj.width();
                const gameHeight = gameObj.height();
                
                if (imageData.width === gameWidth && imageData.height === gameHeight) {
                    for (const index of overlayTiles) {
                        const offset = index * 4;
                        if (offset + 3 < imageData.data.length) {
                            // Check if this pixel's color has changed from what we expect
                            const currentR = imageData.data[offset];
                            const currentG = imageData.data[offset + 1];
                            const currentB = imageData.data[offset + 2];
                            const currentA = imageData.data[offset + 3];
                            
                            // If this is not our orange color, the game updated this pixel
                            if (currentR !== 255 || currentG !== 69 || currentB !== 0) {
                                // Update our stored original color
                                originalPixelData.set(index, {
                                    r: currentR,
                                    g: currentG,
                                    b: currentB,
                                    a: currentA
                                });
                            }
                        }
                    }
                }
            }
            
            // Only modify if we have an active overlay and game objects
            if (currentOverlayState !== OVERLAY_STATES.NONE && gameObj && gameTransformHandler) {
                try {
                    // Get current mouse position in world coordinates
                    const worldCoords = gameTransformHandler.screenToWorldCoordinates(mouseX, mouseY);
                    const centerX = worldCoords.x;
                    const centerY = worldCoords.y;
                    
                    let radius;
                    switch (currentOverlayState) {
                        case OVERLAY_STATES.ATOM_BOMB:
                            radius = NUKE_RADII.ATOM_BOMB;
                            break;
                        case OVERLAY_STATES.HYDROGEN_BOMB:
                            radius = NUKE_RADII.HYDROGEN_BOMB;
                            break;
                        default:
                            radius = 0;
                    }
                    
                    if (radius > 0) {
                        // Check if position or radius changed
                        const positionChanged = (centerX !== lastCenterX || centerY !== lastCenterY || radius !== lastRadius);
                        
                        if (positionChanged || needsCleanup) {
                            // First, restore any previously modified pixels
                            restoreOriginalPixels(imageData);
                            needsCleanup = false;
                        }
                        
                        // Modify the imageData to highlight tiles in radius
                        const gameWidth = gameObj.width();
                        const gameHeight = gameObj.height();
                        
                        // Only process if this looks like territory data
                        if (imageData.width === gameWidth && imageData.height === gameHeight) {
                            // Clear old overlay tiles
                            overlayTiles.clear();
                            
                            for (let x = Math.max(0, centerX - radius); x <= Math.min(gameWidth - 1, centerX + radius); x++) {
                                for (let y = Math.max(0, centerY - radius); y <= Math.min(gameHeight - 1, centerY + radius); y++) {
                                    if (shouldHighlightTile(x, y, centerX, centerY, radius)) {
                                        const index = y * gameWidth + x;
                                        const offset = index * 4;
                                        
                                        if (offset + 3 < imageData.data.length) {
                                            // Store original color if we haven't already
                                            if (!originalPixelData.has(index)) {
                                                originalPixelData.set(index, {
                                                    r: imageData.data[offset],
                                                    g: imageData.data[offset + 1],
                                                    b: imageData.data[offset + 2],
                                                    a: imageData.data[offset + 3]
                                                });
                                            }
                                            
                                            // Set to orange
                                            imageData.data[offset] = 255;     // Red
                                            imageData.data[offset + 1] = 69;  // Green  
                                            imageData.data[offset + 2] = 0;   // Blue
                                            imageData.data[offset + 3] = 180; // Alpha
                                            
                                            overlayTiles.add(index);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Update last position
                        lastCenterX = centerX;
                        lastCenterY = centerY;
                        lastRadius = radius;
                    }
                } catch (error) {
                    console.error('[Nuke Overlay] Error in putImageData hook:', error);
                }
            } else if (needsCleanup) {
                // Restore pixels when overlay is disabled
                try {
                    restoreOriginalPixels(imageData);
                    needsCleanup = false;
                } catch (error) {
                    console.error('[Nuke Overlay] Error cleaning up pixels:', error);
                }
            }
            
            // Call original function
            return originalPutImageData.call(this, imageData, dx, dy, ...args);
        };
        
        console.log('[Nuke Overlay] Hooked into putImageData');
    }
    
    // Restore original pixel colors
    function restoreOriginalPixels(imageData) {
        if (!gameObj) return;
        
        const gameWidth = gameObj.width();
        const gameHeight = gameObj.height();
        
        // Only restore if this looks like territory data
        if (imageData.width === gameWidth && imageData.height === gameHeight) {
            isApplyingOverlay = true; // Prevent recursion
            
            for (const index of overlayTiles) {
                const originalColor = originalPixelData.get(index);
                if (originalColor) {
                    const offset = index * 4;
                    if (offset + 3 < imageData.data.length) {
                        imageData.data[offset] = originalColor.r;
                        imageData.data[offset + 1] = originalColor.g;
                        imageData.data[offset + 2] = originalColor.b;
                        imageData.data[offset + 3] = originalColor.a;
                    }
                }
            }
            
            // Clear the stored data
            for (const index of overlayTiles) {
                originalPixelData.delete(index);
            }
            overlayTiles.clear();
            
            isApplyingOverlay = false;
        }
    }
    
    // Handle tab key press
    function handleKeyPress(event) {
        if (!isInGame()) return;
        
        if (event.key === 'Tab') {
            event.preventDefault();
            
            // Cycle through overlay states
            currentOverlayState = (currentOverlayState + 1) % 3;
            
            let stateName;
            switch (currentOverlayState) {
                case OVERLAY_STATES.NONE:
                    stateName = 'None';
                    break;
                case OVERLAY_STATES.ATOM_BOMB:
                    stateName = 'Atom Bomb';
                    break;
                case OVERLAY_STATES.HYDROGEN_BOMB:
                    stateName = 'Hydrogen Bomb';
                    break;
            }
            
            console.log(`[Nuke Overlay] Switched to: ${stateName}`);
            
            // Mark that we need cleanup
            needsCleanup = true;
            
            // Find game objects if we don't have them
            if (!gameObj) {
                findGameObjects();
            }
        }
    }
    
    // Track mouse movement
    function handleMouseMove(event) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    }
    
    // Initialize script
    function initializeScript() {
        console.log('[Nuke Overlay] Game detected, initializing');
        currentOverlayState = OVERLAY_STATES.NONE;
        
        findGameObjects();
        hookIntoRendering();
        
        if (!gameObj) {
            const observer = new MutationObserver((mutations, obs) => {
                if (findGameObjects()) {
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 10000);
        }
    }
    
    // Reset script state
    function resetScriptState() {
        console.log('[Nuke Overlay] Game ended, resetting state');
        currentOverlayState = OVERLAY_STATES.NONE;
        gameObj = null;
        gameTransformHandler = null;
        overlayTiles.clear();
        originalPixelData.clear();
        needsCleanup = false;
    }
    
    // Monitor game state
    function monitorGameState() {
        if (!isInGame()) {
            if (gameStarted) {
                gameStarted = false;
                resetScriptState();
            }
            return;
        }
        
        if (!gameStarted) {
            gameStarted = true;
            initializeScript();
        }
    }
    
    // Set up event listeners
    document.addEventListener('keydown', handleKeyPress, true);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Start monitoring game state
    setInterval(monitorGameState, 500);
    
    console.log('[Nuke Overlay] Event listeners registered');
})();
