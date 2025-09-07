// Configuration and constants
import * as THREE from 'three';

// Map configurations
export const mapConfigs = {
  city: {
    path: './city.glb',
    scale: 1.0,
    groundLevel: 1.0,
    name: 'City',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './bgm.mp3',
    boundaries: {
      minX: -89.66609954833984,
      maxX: 77.09839630126953,
      minZ: -69.25510556510307,
      maxZ: 81.75081565644811,
      minY: -0.7359699416300538,
      maxY: 69.65262079978838
    }
  },
  subway: {
    path: './subway.glb',
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Subway',
    spawnPosition: { x: 10, y: 2.0, z: -10 },
    bgMusic: './subway.mp3',
    boundaries: {
      minX: -99.9751881950656,
      maxX: 100.02481311722796,
      minZ: -16.99069107225995,
      maxZ: 10.295412050123943,
      minY: -3.6196477823072923,
      maxY: 9.603929120581002
    }
  },
  silenthill: {
    path: './city.glb', // Use city model but darker
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Silent Hill',
    spawnPosition: { x: 0, y: 1.0, z: 0 },
    bgMusic: './silenthill.mp3',
    boundaries: {
      minX: -89.66609954833984,
      maxX: 77.09839630126953,
      minZ: -69.25510556510307,
      maxZ: 81.75081565644811,
      minY: -0.7359699416300538,
      maxY: 69.65262079978838
    }
  },
  tank: {
    path: './city.glb', // Use city model for tank mode
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Tank Mode',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './bgm.mp3',
    tankMode: true,
    boundaries: {
      minX: -200.0,  // Further expanded
      maxX: 200.0,   // Further expanded
      minZ: -300.0,  // Much more expanded on Z axis
      maxZ: 300.0,   // Much more expanded on Z axis
      minY: -20.0,   // Further expanded
      maxY: 150.0    // Further expanded
    }
  }
};

// Movement constants
export const MOVEMENT_CONFIG = {
  stepSize: 2.0,
  turnSpeed: 0.03,
  bobAmount: 0.1,
  bobSpeed: 0.1,
  maxHeightChange: 2,
  heightSmoothingFactor: 0.3
};

// Initial player state
export const INITIAL_PLAYER_STATE = {
  position: new THREE.Vector3(0, 0.5, 0),
  rotation: 0
};

// Interaction objects configuration
export const INTERACTION_CONFIGS = {
  city: [
    { targetMap: 'subway', label: 'SUBWAY', position: { x: 0, y: 0, z: 10 }, color: 0x00ff00 },
    { targetMap: 'silenthill', label: 'SILENT HILL', position: { x: 10, y: 0, z: 0 }, color: 0x330033 },
    { targetMap: 'tank', label: 'TANK', position: { x: -10, y: 0, z: 0 }, type: 'tank' }
  ],
  subway: [
    { targetMap: 'city', label: 'CITY', position: { x: -12, y: 0, z: -12 }, color: 0xff0000 }
  ],
  silenthill: [
    { targetMap: 'city', label: 'CITY', position: { x: 0, y: 0, z: 5 }, color: 0xff0000 }
  ],
  tank: [
    { targetMap: 'city', label: 'EXIT TANK', position: { x: 0, y: 0, z: 10 }, color: 0xff0000 }
  ]
};

// Label styling configuration for interaction objects
export const LABEL_CONFIG = {
  canvas: {
    width: 256,
    height: 128
  },
  background: {
    color: 'rgba(0, 0, 0, 0.8)'
  },
  text: {
    color: 'white',
    font: 'bold 32px Arial',
    align: 'center',
    position: { x: 128, y: 70 }
  },
  mesh: {
    geometry: { width: 2, height: 1 },
    yOffset: 2,
    transparent: true
  }
};

// CSS configurations for overlays
export const OVERLAY_CSS = {
  damageFlash: `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 0, 0, 0.4);
    z-index: 999;
    display: none;
    pointer-events: none;
  `,
  progressiveDamage: `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 0, 0, 0);
    z-index: 998;
    pointer-events: none;
    transition: background 0.5s ease-in-out;
  `,
  death: `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: black;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 3s ease-in-out;
  `
};