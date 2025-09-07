// UI system for loading screens, damage overlays, and window management
import { OVERLAY_CSS } from './config.js';
import { camera, renderer } from './state.js';

// Create loading screen elements
export async function createLoadingScreen() {
  try {
    const response = await fetch('loading.html');
    const html = await response.text();
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (error) {
    console.error('Failed to load loading screen:', error);
  }
}

// Show loading screen with custom text
export function showLoadingScreen(text = 'Loading...') {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingText = document.getElementById('loadingText');
  if (loadingScreen && loadingText) {
    loadingText.textContent = text;
    loadingScreen.style.display = 'flex';
  }
}

// Create damage overlay elements
export function createDamageOverlay() {
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

// Show logo in center of screen
export function showLogo() {
  // Create logo overlay
  const logoOverlay = document.createElement('div');
  logoOverlay.id = 'logoOverlay';
  logoOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
    pointer-events: none;
  `;
  
  // Create logo image
  const logoImg = document.createElement('img');
  logoImg.src = './logo.png';
  logoImg.style.cssText = `
    max-width: 600px;
    max-height: 450px;
    width: auto;
    height: auto;
    pointer-events: auto;
  `;
  
  logoOverlay.appendChild(logoImg);
  document.body.appendChild(logoOverlay);
}

// Hide logo overlay
export function hideLogo() {
  const logoOverlay = document.getElementById('logoOverlay');
  if (logoOverlay) {
    document.body.removeChild(logoOverlay);
  }
}

// Handle window resize
export function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}