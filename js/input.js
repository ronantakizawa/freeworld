// Input handling and serial communication
import { 
  port, reader, isConnected, 
  hasGun, fpsOverlay, fpsOverlayActive,
  setIsConnected, isTurning,
  setIsTurning, setPort, setReader
} from './state.js';
import { toggleFPSOverlay, shootRecoil, playReloadAnimation } from './fps.js';
import { playFootstep } from './audio.js';
import { makeStep } from './movement.js';

// Handle key press events
export function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    
    if (hasGun) {
      toggleFPSOverlay();
    }
  } else if (event.code === 'KeyZ') {
    event.preventDefault();
    
    if (hasGun && fpsOverlayActive && fpsOverlay) {
      shootRecoil();
    }
  } else if (event.code === 'KeyX') {
    event.preventDefault();
    
    if (hasGun && fpsOverlayActive && fpsOverlay) {
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