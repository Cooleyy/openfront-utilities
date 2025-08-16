# OpenFront Utilities

A collection of Tampermonkey userscripts that enhance the [OpenFront.io](https://openfront.io) browser game experience.

## About OpenFront.io

OpenFront.io is a real-time strategy browser game where players compete to control territory, manage resources (gold and troops), build structures, and engage in warfare on a shared map. The game features:

- **Resource Management**: Gold for building, troops for combat
- **Strategic Building**: Cities, ports, missile silos, defense posts, SAM launchers
- **Warfare Systems**: Nuclear weapons, conventional attacks, alliances, embargos
- **Real-time Gameplay**: Continuous updates at ~10 ticks per second

## Available Scripts

### 🎯 OpenFront Hotkeys
**File**: `openfront-hotkeys/openfront_hotkeys.user.js`

**Features**:
- Keyboard shortcuts for rapid building (C=City, Q=Port, S=Silo, etc.)
- Nuclear weapon hotkeys (Shift+R=Atom Bomb, Shift+F=Hydrogen Bomb)
- Turbo mode for continuous building while holding keys
- Invisible build menu manipulation for seamless gameplay

**Usage**: Press and hold hotkeys to build structures quickly at your mouse position.

### 🔊 OpenFront Warnings
**File**: `openfront-warnings/openfront_gold_warning.user.js`

**Features**:
- Audio alerts when your gold reaches critical thresholds
- Customizable warning levels (default: 125k gold)
- Game state detection to only alert during active games
- Web Audio API integration for reliable sound generation

**Usage**: Script automatically monitors your resources and plays warning sounds.

### 💥 OpenFront Nuke Overlay
**File**: `openfront-overlay/openfront_nuke_overlay.user.js`

**Features**:
- Visual blast radius overlay for nuclear weapons
- Tab key cycling: None → Atom Bomb (30 tiles) → Hydrogen Bomb (100 tiles)
- Real-time mouse tracking with game coordinate integration
- Outline-only display that scales correctly with zoom levels
- Accurate radius values extracted from game source code

**Usage**: Press Tab to cycle through overlay modes, move mouse to position the radius indicator.

## Installation

### Prerequisites
1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Ensure you have access to OpenFront.io

### Installing Scripts
1. Click on the Tampermonkey extension icon in your browser
2. Select "Create a new script"
3. Copy the contents of any `.user.js` file from this repository
4. Paste into the Tampermonkey editor
5. Save the script (Ctrl+S)
6. The script will automatically activate when you visit OpenFront.io

## Browser Compatibility

- ✅ **Chrome** - Fully supported
- ✅ **Firefox** - Fully supported  
- ✅ **Edge** - Fully supported
- ⚠️ **Safari** - Limited Tampermonkey support

**Requirements**:
- Modern browser with ES6+ support
- HTML5 Canvas API
- Web Audio API (for warning sounds)

## Contributing

Contributions are welcome! When developing new scripts:

1. Follow the established code patterns
2. Include comprehensive error handling
3. Test thoroughly in actual game sessions
4. Use semantic DOM selectors when possible
5. Minimize performance impact on the game

### Development Tips
- The game uses Shadow DOM for some elements
- Game state changes frequently - use robust detection methods
- Browser autoplay policies affect audio - initialize after user interaction
- Target 500ms intervals for monitoring to balance responsiveness and performance

## Repository Structure

```
openfront-utilities/
├── README.md
├── .gitignore
├── openfront-hotkeys/
│   └── openfront_hotkeys.user.js
├── openfront-overlay/
│   └── openfront_nuke_overlay.user.js
└── openfront-warnings/
    └── openfront_gold_warning.user.js
```

## License

These scripts are provided as-is for educational and enhancement purposes. Use responsibly and in accordance with OpenFront.io's terms of service.

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify the script is enabled in Tampermonkey
3. Ensure you're using a compatible browser
4. Try refreshing the OpenFront.io page

For bugs or feature requests, please open an issue in this repository.

---

**Disclaimer**: These userscripts are community-created tools and are not officially affiliated with or endorsed by OpenFront.io. Use at your own discretion.
