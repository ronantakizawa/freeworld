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
import { OVERLAY_CSS } from './config.js';

// Initialize the 3D scene
function init() {
  // Create loading screen elements
  createLoadingScreen();
  
  // Show initial loading
  showLoadingScreen('Initializing City Explorer...');
  
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

async function createLoadingScreen() {
  try {
    const response = await fetch('loading.html');
    const html = await response.text();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (error) {
    console.error('Failed to load loading screen:', error);
  }
}

function showLoadingScreen(text = 'Loading...') {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingText = document.getElementById('loadingText');
  if (loadingScreen && loadingText) {
    loadingText.textContent = text;
    loadingScreen.style.display = 'flex';
  }
}

function createDamageOverlay() {
  // Create temporary damage flash overlay
  const damageOverlay = document.createElement('div');
  damageOverlay.id = 'damageOverlay';
  damageOverlay.style.cssText = OVERLAY_CSS.damageFlash;
  document.body.appendChild(damageOverlay);
  
  // Create persistent progressive damage overlay
  const progressiveOverlay = document.createElement('div');
  progressiveOverlay.id = 'progressiveDamageOverlay';
  progressiveOverlay.style.cssText = OVERLAY_CSS.progressiveDamage;
  document.body.appendChild(progressiveOverlay);
}

// Show damage overlay for 1 second
export function showDamageEffect() {
  const overlay = document.getElementById('damageOverlay');
  if (overlay) {
    overlay.style.display = 'block';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 1000);
  }
}

// Update progressive damage overlay based on damage count
export function updateProgressiveDamage(damageCount) {
  const overlay = document.getElementById('progressiveDamageOverlay');
  if (overlay) {
    // Increase red opacity based on damage count (0.08 per damage, max 0.4 at 5 damage)
    const opacity = Math.min(damageCount * 0.08, 0.4);
    overlay.style.background = `rgba(255, 0, 0, ${opacity})`;
  }
}

// Show death fade to black and reload page
export function showDeathEffect() {
  // Create death overlay
  const deathOverlay = document.createElement('div');
  deathOverlay.style.cssText = OVERLAY_CSS.death;
  document.body.appendChild(deathOverlay);
  
  // Start fade to black
  setTimeout(() => {
    deathOverlay.style.opacity = '1';
  }, 100);
  
  // Reload page after fade completes
  setTimeout(() => {
    window.location.reload();
  }, 3500);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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

