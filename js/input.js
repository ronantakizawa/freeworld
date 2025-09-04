// Input handling and serial communication
import { 
  port, reader, isConnected, camera,
  hasGun, hasKnife, currentWeapon, fpsOverlay, fpsOverlayActive,
  tankMode, tankMoving, playerPosition, tankPosition, tankRotation, tankModeEnterTime, setIsConnected, isTurning, setCurrentWeapon,
  setIsTurning, setPort, setReader, setTankMoving, setTankMode, setPlayerRotation, setPreserveRotationOnMapLoad
} from './state.js';
import { toggleFPSOverlay, shootRecoil, playReloadAnimation } from './fps.js';
import { playFootstep } from './audio.js';
import { makeStep } from './movement.js';
import { startTankAnimation, stopTankAnimation, removeTankModel } from './tank.js';
import { updateCameraPosition, getGroundHeight } from './movement.js';
import { stopTankAudio } from './audio.js';
import { loadMap } from './maps.js';

// Initialize button state tracking for regular mode
if (typeof window.lastButtonBState === 'undefined') {
  window.lastButtonBState = 0;
}

// Handle key press events
export function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    
    // Disable weapon switching and FPS overlays in tank mode
    if (tankMode) {
      console.log('Tank mode - weapon/FPS overlay disabled');
      return;
    }
    
    if (hasGun || hasKnife) {
      // If overlay is active, switch weapons
      if (fpsOverlayActive) {
        switchWeapon();
      } else if (currentWeapon !== 'none') {
        // If no overlay and not 'none', activate with current weapon
        toggleFPSOverlay();
      } else {
        // If currentWeapon is 'none', cycle to first available weapon
        const availableWeapons = [];
        if (hasGun) availableWeapons.push('glock');
        if (hasKnife) availableWeapons.push('knife');
        if (availableWeapons.length > 0) {
          setCurrentWeapon(availableWeapons[0]);
          toggleFPSOverlay();
        }
      }
    }
  } else if (event.code === 'KeyZ') {
    event.preventDefault();
    
    // Z key pressed for shooting/slashing
    
    if (tankMode) {
      // Prevent immediate exit - require at least 1 second in tank mode
      const timeSinceEnter = Date.now() - tankModeEnterTime;
      
      if (timeSinceEnter > 1000) {
        exitTankMode();
      }
    } else if (currentWeapon !== 'none' && fpsOverlayActive && fpsOverlay) {
      shootRecoil();
    }
  }
  // Removed KeyX reload - now handled automatically every 3rd shot
}

// MicroBit serial communication
export async function connectMicrobit() {
  try {
    const newPort = await navigator.serial.requestPort();
    await newPort.open({ 
      baudRate: 115200,
      bufferSize: 64
    });
    
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = newPort.readable.pipeTo(textDecoder.writable);
    const newReader = textDecoder.readable.getReader();
    
    // Update global state
    setPort(newPort);
    setReader(newReader);
    setIsConnected(true);
    
    document.getElementById('startBtn').textContent = 'Disconnect';
    document.getElementById('startBtn').onclick = disconnectMicrobit;
    
    readSerialData();
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

export function disconnectMicrobit() {
  if (reader) {
    reader.releaseLock();
  }
  if (port) {
    port.close();
  }
  setIsConnected(false);
  document.getElementById('startBtn').textContent = 'Connect MicroBit';
  document.getElementById('startBtn').onclick = connectMicrobit;
}

async function readSerialData() {
  try {
    while (isConnected) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const lines = value.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          parseMicrobitData(trimmedLine);
        }
      }
    }
  } catch (error) {
    console.error('Reading error:', error);
    setIsConnected(false);
  }
}

function parseMicrobitData(dataString) {
  try {
    const trimmedData = dataString.trim();
    
    if (trimmedData.includes(',')) {
      const parts = trimmedData.split(',');
      if (parts.length === 2) {
        const buttonAState = parseInt(parts[0]);
        const buttonBEvent = parseInt(parts[1]);
        
        // Removed logging to clean up console
        
        if (!isNaN(buttonAState) && !isNaN(buttonBEvent)) {
          // Note: buttonBEvent is now actually buttonBState from MicroBit
          const buttonBState = buttonBEvent;
          
          if (tankMode) {
            // Tank mode: Button A for turning, Button B for continuous movement
            setIsTurning(buttonAState === 1);
            
            const wasMoving = tankMoving;
            const nowMoving = buttonBState === 1;
            
            setTankMoving(nowMoving);
            
            // Handle animation start/stop
            if (nowMoving && !wasMoving) {
              startTankAnimation();
            } else if (!nowMoving && wasMoving) {
              stopTankAnimation();
            }
          } else {
            // Regular mode: Button A continuous turning, Button B discrete steps
            setIsTurning(buttonAState === 1);
            
            // For regular mode, we need to detect button press edges from the state
            const wasPressed = window.lastButtonBState === 1;
            const nowPressed = buttonBState === 1;
            
            if (nowPressed && !wasPressed) {
              playFootstep();
              makeStep('forward');
            }
            
            window.lastButtonBState = buttonBState;
          }
          
          return;
        }
      }
    }
    
  } catch (error) {
    console.warn('Parse error:', error);
  }
}

// Switch between available weapons
function switchWeapon() {
  const availableWeapons = [];
  if (hasGun) availableWeapons.push('glock');
  if (hasKnife) availableWeapons.push('knife');
  availableWeapons.push('none'); // Always include 'none' option
  
  if (availableWeapons.length > 1) {
    const currentIndex = availableWeapons.indexOf(currentWeapon);
    const nextIndex = (currentIndex + 1) % availableWeapons.length;
    setCurrentWeapon(availableWeapons[nextIndex]);
    
    if (availableWeapons[nextIndex] === 'none') {
      // Hide overlay for 'none' state
      if (fpsOverlayActive) {
        toggleFPSOverlay();
      }
      console.log('Switched to no weapon');
    } else {
      // Reload the overlay with the new weapon
      toggleFPSOverlay(); // Hide current
      toggleFPSOverlay(); // Show new
      console.log(`Switched to ${availableWeapons[nextIndex]}`);
    }
  }
}

// Exit tank mode and return to normal city view
function exitTankMode() {
  // FIRST: Disable tank mode immediately to stop tank camera updates
  setTankMode(false);
  
  // Reset player rotation to 0 (facing forward)
  setPlayerRotation(0);
  
  // Explicitly reset camera rotation to clear any tank camera effects
  camera.rotation.set(0, 0, 0);
  camera.quaternion.set(0, 0, 0, 1); // Reset quaternion to identity
  
  // Set flag to preserve rotation during map load
  setPreserveRotationOnMapLoad(true);
  
  // Load the city map with preserved rotation
  loadMap('city');
}