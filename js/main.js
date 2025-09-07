// Main application entry point
import * as THREE from 'three';
import { 
  setScene, setCamera, setRenderer, 
  animationMixers, clock, fpsOverlayMixer,
  scene, camera, renderer
} from './state.js';
import { initAudio } from './audio.js';
import { handleKeyPress, connectMicrobit } from './input.js';
import { updatePlayerMovement } from './movement.js';
import { updateFPSOverlayPosition } from './fps.js';
import { rotateItems, checkZombieProximity } from './items.js';
import { loadMap } from './maps.js';
import { 
  createLoadingScreen, showLoadingScreen, createDamageOverlay,
  showDamageEffect, updateProgressiveDamage, showDeathEffect, onWindowResize,
  showLogo, hideLogo
} from './ui.js';

// Initialize the 3D scene
function init() {
  // Create loading screen elements
  createLoadingScreen();
  
  // Show logo initially instead of loading screen
  showLogo();
  
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  setScene(scene);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  setCamera(camera);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);
  setRenderer(renderer);
  
  // Create damage overlay
  createDamageOverlay();
  
  // Load initial map
  loadMap('city');
  
  // Initialize audio
  initAudio();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize, false);
  
  // Set up UI event listeners
  document.getElementById('startBtn').addEventListener('click', connectMicrobit);
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyPress);
  
  // Start render loop
  animate();
}



function animate() {
  requestAnimationFrame(animate);
  
  // Update animations
  const delta = clock.getDelta();
  animationMixers.forEach(mixer => mixer.update(delta));
  
  // Update FPS overlay animations
  if (fpsOverlayMixer) {
    fpsOverlayMixer.update(delta);
  }
  
  // Update player movement
  updatePlayerMovement(delta);
  
  // Update FPS overlay position if active
  updateFPSOverlayPosition();
  
  // Rotate items (only if no GLB animation)
  rotateItems();
  
  // Check zombie proximity for audio
  checkZombieProximity();
  
  renderer.render(scene, camera);
}

// Start the application
init();

