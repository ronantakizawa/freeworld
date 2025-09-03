# City Explorer

A 3D city exploration game controlled with MicroBit buttons, built with Three.js.

## Features

- 🌆 Explore 3D city and subway environments
- 🎮 MicroBit button controls (Button A: Turn, Button B: Move Forward)
- 🔊 Dynamic background music and footstep sounds
- 🚇 Switch between city and subway maps
- 🚶 Realistic walking animation with camera bobbing
- 🏔️ Terrain-following camera system
- 🚧 Collision detection to prevent walking through buildings

## Requirements

- Node.js (v14 or higher)
- MicroBit device with USB connection
- Modern web browser with Web Serial API support (Chrome/Edge recommended)

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Make sure you have these files in your project directory:**
   - `index.html` - Main HTML file
   - `cityexplorer.js` - Game logic
   - `city.glb` - City 3D model
   - `subway.glb` - Subway 3D model
   - `bgm.mp3` - City background music
   - `subway.mp3` - Subway background music
   - `footstep.mp3` - Footstep sound effect
   - `microbit.py` - MicroBit Python code

3. **Upload the MicroBit code:**
   - Flash `microbit.py` to your MicroBit device
   - Connect MicroBit to your computer via USB

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## How to Play

1. Open your browser and go to `http://localhost:3000`
2. Click "Connect MicroBit" and select your MicroBit from the serial port list
3. Use the MicroBit buttons to control your character:
   - **Button A**: Turn right (continuous while held)
   - **Button B**: Move forward (discrete steps)
4. Find the green "SUBWAY" cube in the city to enter the subway
5. Find the red "CITY" cube in the subway to return to the city

## Controls

- **Button A**: Hold to turn right continuously
- **Button B**: Press to take one step forward
- **Audio**: Automatic background music and footstep sounds

## Troubleshooting

- **MicroBit not connecting**: Make sure you're using Chrome or Edge browser
- **No audio**: Click anywhere on the page first to enable audio
- **Models not loading**: Ensure all .glb and .mp3 files are in the project directory
- **Collision issues**: The game prevents walking through buildings using raycasting

## File Structure

```
freeworld/
├── server.js          # Express server
├── package.json       # Node.js dependencies
├── index.html        # Main HTML file
├── cityexplorer.js    # Game logic
├── microbit.py        # MicroBit controller code
├── city.glb          # City 3D model
├── subway.glb        # Subway 3D model
├── bgm.mp3           # City background music
├── subway.mp3        # Subway background music
├── footstep.mp3      # Footstep sound effect
└── README.md         # This file
```

## Development

The server uses Express.js to serve static files and handles proper MIME types for .glb models and .mp3 audio files. CORS is enabled for development purposes.

For development, use `npm run dev` which uses nodemon for automatic server restart on file changes.