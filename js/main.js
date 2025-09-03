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
import { rotateItems } from './items.js';
import { loadMap } from './maps.js';

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

function createLoadingScreen() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingScreen';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: black;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
    color: white;
  `;
  
  const loadingText = document.createElement('div');
  loadingText.id = 'loadingText';
  loadingText.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
  `;
  loadingText.textContent = 'Loading...';
  
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;
  
  if (!document.getElementById('spinnerStyle')) {
    const style = document.createElement('style');
    style.id = 'spinnerStyle';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  loadingDiv.appendChild(loadingText);
  loadingDiv.appendChild(spinner);
  document.body.appendChild(loadingDiv);
}

function showLoadingScreen(text = 'Loading...') {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingText = document.getElementById('loadingText');
  if (loadingScreen && loadingText) {
    loadingText.textContent = text;
    loadingScreen.style.display = 'flex';
  }
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
  updatePlayerMovement();
  
  // Update FPS overlay position if active
  updateFPSOverlayPosition();
  
  // Rotate Glock items (only if no GLB animation)
  rotateItems();
  
  renderer.render(scene, camera);
}

// Start the application
init();