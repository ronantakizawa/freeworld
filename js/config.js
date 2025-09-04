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
    bgMusic: './bgm.mp3'
  },
  subway: {
    path: './subway.glb',
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Subway',
    spawnPosition: { x: 10, y: 2.0, z: -10 },
    bgMusic: './subway.mp3'
  },
  silenthill: {
    path: './city.glb', // Use city model but darker
    scale: 1.0,
    groundLevel: 2.0,
    name: 'Silent Hill',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './silenthill.mp3'
  },
  tank: {
    path: './city.glb', // Use city model for tank mode
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Tank Mode',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './bgm.mp3',
    tankMode: true
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