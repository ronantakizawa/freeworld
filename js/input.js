// Input handling and serial communication
import { 
  port, reader, isConnected, 
  hasGun, hasKnife, currentWeapon, fpsOverlay, fpsOverlayActive,
  setIsConnected, isTurning, setCurrentWeapon,
  setIsTurning, setPort, setReader
} from './state.js';
import { toggleFPSOverlay, shootRecoil, playReloadAnimation } from './fps.js';
import { playFootstep } from './audio.js';
import { makeStep } from './movement.js';

// Handle key press events
export function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    
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
    
    if (currentWeapon !== 'none' && fpsOverlayActive && fpsOverlay) {
      shootRecoil();
    }
  } else if (event.code === 'KeyX') {
    event.preventDefault();
    
    if (currentWeapon === 'glock' && fpsOverlayActive && fpsOverlay) {
      playReloadAnimation();
    }
  }
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
        
        if (!isNaN(buttonAState) && !isNaN(buttonBEvent)) {
          // Button A state - continuous turning
          setIsTurning(buttonAState === 1);
          
          // Button B event - discrete forward step
          if (buttonBEvent === 1) {
            playFootstep();
            makeStep('forward');
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