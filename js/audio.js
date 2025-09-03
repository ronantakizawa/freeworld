// Audio system management
import { audioContext, audioInitialized, currentBgMusic, setAudioInitialized } from './state.js';
import { mapConfigs } from './config.js';

let footstepAudio;
let bgmAudio;

// Initialize audio system
export function initAudio() {
  try {
    // Create audio context
    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create audio element for footsteps
    footstepAudio = new Audio('./footstep.mp3');
    footstepAudio.volume = 0.5;
    footstepAudio.preload = 'auto';
    
    // Enable user interaction to unlock audio
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    
  } catch (error) {
    console.warn('Audio initialization failed:', error);
  }
}

// Unlock audio context (required for web audio)
function unlockAudio() {
  if (window.audioContext && window.audioContext.state === 'suspended') {
    window.audioContext.resume().then(() => {
      setAudioInitialized(true);
      startBackgroundMusic();
    });
  } else {
    setAudioInitialized(true);
    startBackgroundMusic();
  }
}

// Start background music
function startBackgroundMusic() {
  // Start with the city music initially
  switchBackgroundMusic(mapConfigs.city.bgMusic);
}

// Switch background music
export function switchBackgroundMusic(musicPath) {
  if (!window.audioContext || window.audioContext.state === 'suspended') return;
  
  try {
    // Stop and cleanup current music if playing
    if (window.currentBgMusic) {
      window.currentBgMusic.pause();
      window.currentBgMusic.currentTime = 0;
      window.currentBgMusic.src = '';
      window.currentBgMusic = null;
    }
    
    // Stop the old bgmAudio if it exists
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
    
    // If musicPath is null, don't play any music
    if (musicPath === null) {
      return;
    }
    
    // Create new audio for the requested music
    window.currentBgMusic = new Audio(musicPath);
    window.currentBgMusic.volume = 0.3;
    window.currentBgMusic.loop = true;
    window.currentBgMusic.preload = 'auto';
    
    // Play the new music
    window.currentBgMusic.play().catch(error => {
      console.warn('Background music playback failed:', error);
    });
    
  } catch (error) {
    console.warn('Background music switch failed:', error);
  }
}

// Play footstep sound
export function playFootstep() {
  if (footstepAudio && window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const audioClone = footstepAudio.cloneNode();
      audioClone.volume = footstepAudio.volume;
      audioClone.play().catch(error => {
        console.warn('Footstep sound failed:', error);
      });
    } catch (error) {
      console.warn('Footstep sound error:', error);
    }
  }
}

// Play reload sound
export function playReloadSound() {
  if (window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const reloadAudio = new Audio('./reload.mp3');
      reloadAudio.volume = 0.7;
      reloadAudio.play().catch(error => {
        console.warn('Reload sound failed:', error);
      });
    } catch (error) {
      console.warn('Reload sound error:', error);
    }
  }
}

// Play shot sound
export function playShotSound() {
  if (window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const shotAudio = new Audio('./shot.mp3');
      shotAudio.volume = 0.8;
      shotAudio.play().catch(error => {
        console.warn('Shot sound failed:', error);
      });
    } catch (error) {
      console.warn('Shot sound error:', error);
    }
  }
}

// Play knife sound
export function playKnifeSound() {
  if (window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const knifeAudio = new Audio('./knife.wav');
      knifeAudio.volume = 0.7;
      knifeAudio.play().catch(error => {
        console.warn('Knife sound failed:', error);
      });
    } catch (error) {
      console.warn('Knife sound error:', error);
    }
  }
}