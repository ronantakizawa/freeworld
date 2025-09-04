# FPS City Explorer

A 3D first-person city exploration game with weapons, zombies, and multiple environments. Built with Three.js and controlled via MicroBit or keyboard.

## Features

- 🌆 Multiple 3D environments: City, Subway, Silent Hill, and Tank mode
- 🔫 Weapon system: Glock pistol and knife with FPS overlay
- 🧟 Zombie combat system with animated GLB models
- 🎯 Target practice with bullet holes and slash marks
- 🚗 Tank driving mode with full controls
- 🎮 MicroBit + keyboard controls
- 🔊 Dynamic audio system with proximity-based effects
- 🚶 Realistic movement with collision detection
- 💾 State management system for items and weapons

## File Structure & Code Organization

### Core Application Files

**`index.html`** - Main HTML entry point
- Sets up the game container and UI
- Displays control instructions and current items
- Imports Three.js and starts the main application

**`js/main.js`** - Application entry point and animation loop
- Initializes the 3D scene, camera, and renderer
- Sets up loading screen and window resize handling
- Runs the main animation loop that updates all game systems
- Coordinates all other modules

### Game Systems

**`js/state.js`** - Global state management
- Manages all game state variables (player position, weapons, etc.)
- Provides getter/setter functions for state updates
- Handles audio context and animation mixers
- Central hub for cross-module communication

**`js/movement.js`** - Player movement and camera controls
- Handles player walking, rotation, and camera positioning
- Implements collision detection with raycasting
- Manages tank movement and camera modes
- Ground height detection for terrain following

**`js/input.js`** - Input handling and MicroBit communication
- Processes keyboard events (Space, Z key)
- Manages MicroBit serial communication
- Handles weapon switching and combat actions
- Tank mode entry/exit controls

**`js/audio.js`** - Sound system management
- Background music switching per map
- Footstep, reload, shot, and knife sound effects
- Tank and zombie proximity audio
- Audio context management and Web Audio API

### Game Content

**`js/maps.js`** - Map loading and management
- Loads GLB 3D models for different environments
- Switches between City, Subway, Silent Hill, and Tank maps
- Manages map-specific lighting and fog effects
- Handles map transition animations

**`js/items.js`** - Item system and interactions
- Loads collectible items (Glock, knife) and interactive objects
- Manages targets and zombies with animations
- Handles combat: shooting targets, eliminating zombies
- Creates bullet holes and slash marks
- Zombie proximity audio management

**`js/interactions.js`** - Object interactions and pickups
- Creates interaction objects (subway entrance, etc.)
- Handles item collection (weapons)
- Updates UI when items are acquired
- Map transition triggers

**`js/tank.js`** - Tank mode functionality
- Tank GLB model loading and animation
- Tank movement physics and controls
- Camera management for tank driving
- Tank-specific collision detection

**`js/fps.js`** - First-person weapon overlay
- FPS weapon models (Glock, knife) with animations
- Weapon switching and recoil effects
- Automatic reload system (every 3rd shot)
- Weapon animation timing and state management

**`js/config.js`** - Configuration settings
- Map configurations (models, music, lighting)
- Game constants and settings
- Centralized configuration management

## Game Mechanics

### Weapon System
- **Glock**: Semi-automatic pistol with recoil animation and auto-reload every 3 shots
- **Knife**: Melee weapon for close combat with slashing animation
- **FPS Overlay**: First-person weapon view with detailed animations
- **Target Practice**: Shoot targets to create bullet holes

### Zombie Combat
- **AI Behavior**: Zombies animate and move forward after each animation cycle
- **Combat**: Shoot (5.0 unit range) or slash (2.0 unit range) to defeat zombies
- **Death Animation**: Zombies flip to ground and stop animating when defeated
- **Audio**: Zombie sounds play when near active (non-defeated) zombies

### Movement & Controls
- **MicroBit Controls**: Button A (turn), Button B (forward step)
- **Keyboard**: Space (weapon switch), Z (use weapon/tank exit)
- **Tank Mode**: Full vehicle control with different camera perspective
- **Collision Detection**: Prevents walking through buildings and objects

### Environments
1. **City** - Main hub with weapon pickups and tank access
2. **Subway** - Underground environment with atmospheric lighting
3. **Silent Hill** - Combat area with targets and zombies
4. **Tank Mode** - Vehicle driving experience

## Technical Implementation

- **Three.js**: 3D graphics engine with WebGL rendering
- **GLB Models**: 3D assets loaded via GLTFLoader
- **Animation System**: Three.js AnimationMixer for model animations  
- **Audio System**: Web Audio API with spatial audio effects
- **Serial Communication**: Web Serial API for MicroBit integration
- **ES6 Modules**: Modern JavaScript module architecture
- **State Management**: Centralized state with reactive updates

## Setup & Running

1. Install dependencies: `npm install`
2. Start server: `npm run dev` or `npm start`
3. Open browser to `http://localhost:3000`
4. Connect MicroBit or use keyboard controls
5. Explore different environments and collect weapons

## Controls

- **Button A / Left Arrow**: Turn left/right
- **Button B / Up Arrow**: Move forward  
- **Space Bar**: Switch weapons when available
- **Z Key**: Use weapon (shoot/slash) or exit tank mode
- **Tank Mode**: Same buttons for tank movement and rotation

## Assets Required

- **3D Models**: city.glb, subway.glb, silenthill.glb, tank.glb, glock.glb, knife.glb, target.glb, zombie.glb
- **Audio Files**: bgm.mp3, subway.mp3, silenthill.mp3, tank.mp3, zombie.mp3, footstep.mp3, reload.mp3, shot.mp3, knife.wav
- **MicroBit Code**: For hardware controller support

This modular architecture allows for easy expansion and maintenance of the game systems while keeping concerns separated across different modules.