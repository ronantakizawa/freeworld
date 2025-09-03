// Player movement and camera controls
import * as THREE from 'three';
import { 
  camera, playerPosition, playerRotation, isTurning,
  currentMap, collisionObjects, groundRaycaster, lastGroundHeight,
  raycaster, bobOffset, recoilOffset,
  setLastGroundHeight, setPlayerRotation
} from './state.js';
import { MOVEMENT_CONFIG } from './config.js';
import { mapConfigs } from './config.js';
import { checkInteractions } from './interactions.js';

// Check for collisions in a given direction
export function checkCollision(direction) {
  raycaster.set(playerPosition, direction.normalize());
  const intersects = raycaster.intersectObjects(collisionObjects, true);
  return intersects.length > 0 && intersects[0].distance < MOVEMENT_CONFIG.stepSize + 0.5;
}

// Make a discrete movement step
export function makeStep(action) {
  if (action === 'forward') {
    const forward = new THREE.Vector3(
      -Math.sin(playerRotation),
      0,
      -Math.cos(playerRotation)
    );
    
    if (checkCollision(forward)) {
      return;
    }
    
    const newX = playerPosition.x + forward.x * MOVEMENT_CONFIG.stepSize;
    const newZ = playerPosition.z + forward.z * MOVEMENT_CONFIG.stepSize;
    
    playerPosition.set(newX, playerPosition.y, newZ);
    
    const correctHeight = getGroundHeight(newX, newZ);
    playerPosition.y = correctHeight;
    
    triggerWalkBob();
    checkInteractions();
  }
  
  updateCameraPosition();
}

// Trigger walking bob animation
function triggerWalkBob() {
  const currentGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
  const bobHeight = MOVEMENT_CONFIG.bobAmount * 0.5;
  const duration = 400;
  const startTime = Date.now();
  
  function animateBob() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const bobValue = Math.abs(Math.sin(progress * Math.PI)) * bobHeight;
    camera.position.y = currentGroundHeight + bobValue;
    
    if (progress < 1) {
      requestAnimationFrame(animateBob);
    } else {
      const finalGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
      camera.position.y = finalGroundHeight;
      playerPosition.y = finalGroundHeight;
    }
  }
  
  animateBob();
}

// Update camera position and rotation
export function updateCameraPosition() {
  const actualGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
  playerPosition.y = actualGroundHeight;
  
  camera.position.set(playerPosition.x, actualGroundHeight, playerPosition.z);
  camera.rotation.y = playerRotation;
  camera.rotation.x = 0;
}

// Handle continuous turning and any ongoing animations
export function updatePlayerMovement() {
  if (isTurning) {
    let newRotation = playerRotation + MOVEMENT_CONFIG.turnSpeed;
    
    if (newRotation > Math.PI * 2) {
      newRotation -= Math.PI * 2;
    } else if (newRotation < 0) {
      newRotation += Math.PI * 2;
    }
    
    setPlayerRotation(newRotation);
    camera.rotation.y = newRotation;
  }
}

// Get ground height at current position with smoothing
export function getGroundHeight(x, z) {
  if (currentMap === 'subway') {
    return mapConfigs[currentMap].groundLevel;
  }
  
  const rayOrigin = new THREE.Vector3(x, 100, z);
  const rayDirection = new THREE.Vector3(0, -1, 0);
  
  groundRaycaster.set(rayOrigin, rayDirection);
  const intersects = groundRaycaster.intersectObjects(collisionObjects, true);
  
  let newHeight;
  
  if (intersects.length > 0) {
    newHeight = intersects[0].point.y + 0.5;
  } else {
    newHeight = mapConfigs[currentMap].groundLevel;
  }
  
  if (lastGroundHeight === null) {
    setLastGroundHeight(newHeight);
    return newHeight;
  }
  
  const heightDifference = Math.abs(newHeight - lastGroundHeight);
  
  if (heightDifference > MOVEMENT_CONFIG.maxHeightChange) {
    if (newHeight > lastGroundHeight) {
      newHeight = lastGroundHeight + MOVEMENT_CONFIG.maxHeightChange;
    } else {
      newHeight = lastGroundHeight - MOVEMENT_CONFIG.maxHeightChange;
    }
  }
  
  const smoothedHeight = lastGroundHeight + (newHeight - lastGroundHeight) * MOVEMENT_CONFIG.heightSmoothingFactor;
  setLastGroundHeight(smoothedHeight);
  
  return smoothedHeight;
}