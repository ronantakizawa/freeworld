// Audio system management
import { setAudioInitialized } from './state.js';
import { mapConfigs } from './config.js';

let footstepAudio;
let bgmAudio;
let tankAudio;
let zombieAudio;

// Initialize audio system
export function initAudio() {
  try {
    // Create audio context Different browsers historically used different names for the API.
    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create audio element for footsteps
    footstepAudio = new Audio('./footstep.mp3');
    footstepAudio.volume = 0.5;
    footstepAudio.preload = 'auto';
    
    // Start background music immediately
    setAudioInitialized(true);
    startBackgroundMusic();
    
    // Keep user interaction unlock as fallback for other audio
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
    
    // Stop tank audio if it's playing
    if (tankAudio) {
      tankAudio.pause();
      tankAudio.currentTime = 0;
      tankAudio = null;
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
    
    // Play the new music with a small delay to avoid conflicts
    setTimeout(() => {
      if (window.currentBgMusic) {
        window.currentBgMusic.play().catch(error => {
          console.warn('Background music playback failed:', error);
        });
      }
    }, 100);
    
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

// Start tank audio loop
export function startTankAudio() {
  if (!window.audioContext || window.audioContext.state === 'suspended') return;
  
  // Don't start if already playing
  if (tankAudio && !tankAudio.paused) return;
  
  try {
    // Stop current background music
    if (window.currentBgMusic) {
      window.currentBgMusic.pause();
      window.currentBgMusic.currentTime = 0;
    }
    
    // Stop existing tank audio if playing
    if (tankAudio) {
      tankAudio.pause();
      tankAudio.currentTime = 0;
    }
    
    // Start tank audio
    tankAudio = new Audio('./tank.mp3');
    tankAudio.volume = 0.4;
    tankAudio.loop = true;
    tankAudio.preload = 'auto';
    
    tankAudio.play().catch(error => {
      console.warn('Tank audio playback failed:', error);
    });
    
  } catch (error) {
    console.warn('Tank audio start failed:', error);
  }
}

// Stop tank audio and resume background music
export function stopTankAudio() {
  try {
    // Stop tank audio
    if (tankAudio) {
      tankAudio.pause();
      tankAudio.currentTime = 0;
      tankAudio = null;
    }
    
    // Resume background music for city
    switchBackgroundMusic(mapConfigs.city.bgMusic);
    
  } catch (error) {
  }
}

// Start zombie audio loop
export function startZombieAudio() {
  if (!window.audioContext || window.audioContext.state === 'suspended') return;
  
  // Don't start if already playing
  if (zombieAudio && !zombieAudio.paused) return;
  
  try {
    // Stop existing zombie audio if playing
    if (zombieAudio) {
      zombieAudio.pause();
      zombieAudio.currentTime = 0;
    }
    
    // Start zombie audio
    zombieAudio = new Audio('./zombie.mp3');
    zombieAudio.volume = 0.5;
    zombieAudio.loop = true;
    zombieAudio.preload = 'auto';
    
    zombieAudio.play().catch(error => {
      console.warn('Zombie audio playback failed:', error);
    });
    
  } catch (error) {
    console.warn('Zombie audio start failed:', error);
  }
}

// Stop zombie audio
export function stopZombieAudio() {
  try {
    if (zombieAudio) {
      zombieAudio.pause();
      zombieAudio.currentTime = 0;
      zombieAudio = null;
    }
  } catch (error) {
    console.warn('Zombie audio stop failed:', error);
  }
}

// Play damage sound
export function playDamageSound() {
  if (window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const damageAudio = new Audio('./damage.mp3');
      damageAudio.volume = 0.8;
      damageAudio.play().catch(error => {
        console.warn('Damage sound failed:', error);
      });
    } catch (error) {
      console.warn('Damage sound error:', error);
    }
  }
}

// Play heartbeat sound
export function playHeartbeatSound() {
  if (window.audioContext && window.audioContext.state !== 'suspended') {
    try {
      const heartbeatAudio = new Audio('./heartbeat.mp3');
      heartbeatAudio.volume = 1.5;
      heartbeatAudio.play().catch(error => {
        console.warn('Heartbeat sound failed:', error);
      });
    } catch (error) {
      console.warn('Heartbeat sound error:', error);
    }
  }
}