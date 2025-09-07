// Tank system for tank mode
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, camera, tankMode, tankModel, tankPosition, tankRotation,
  setTankModel, setTankRotation
} from './state.js';
import { MOVEMENT_CONFIG } from './config.js';
import { checkCollision, getGroundHeight } from './movement.js';
import { checkInteractions } from './interactions.js';

// Load and setup tank model
export function loadTankModel() {
  const loader = new GLTFLoader();
  
  loader.load('./tank.glb', function(gltf) {
    const tank = gltf.scene;
    
    // Position tank on ground with correct height
    const correctHeight = getGroundHeight(tankPosition.x, tankPosition.z);
    tankPosition.y = correctHeight;
    tank.position.copy(tankPosition);
    tank.rotation.y = tankRotation;
    tank.scale.set(0.4, 0.2, 0.4); 
    
    
    // Fix materials and ensure proper coloring
    tank.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((material) => {
              // Convert all materials to Lambert to ensure consistent lighting
              const newMaterial = new THREE.MeshLambertMaterial({ 
                color: material.color || 0x228B22, // Use original color or forest green
                transparent: material.transparent || false,
                opacity: material.opacity || 1.0
              });
              
              // Only use texture map if it's not a blob URL (which causes loading errors)
              if (material.map && !material.map.image?.src?.startsWith('blob:')) {
                newMaterial.map = material.map;
              }
              
              return newMaterial;
            });
          } else {
            // Convert single material to Lambert
            const newMaterial = new THREE.MeshLambertMaterial({ 
              color: child.material.color || 0x228B22, // Use original color or forest green
              transparent: child.material.transparent || false,
              opacity: child.material.opacity || 1.0
            });
            
            // Only use texture map if it's not a blob URL (which causes loading errors)
            if (child.material.map && !child.material.map.image?.src?.startsWith('blob:')) {
              newMaterial.map = child.material.map;
            }
            
            child.material = newMaterial;
          }
        }
      }
    });
    
    scene.add(tank);
    setTankModel(tank);
    updateTankCamera();
    
    
  }, undefined, function(error) {
    console.error('Tank loading error:', error);
  });
}

// Remove tank model from scene
export function removeTankModel() {
  if (tankModel) {
    scene.remove(tankModel);
    setTankModel(null);
  }
}

// Move tank forward continuously and control animation
export function moveTankForward(deltaTime) {
  if (!tankModel || !tankMode) {
    return;
  }
  
  // Calculate movement speed (adjusted for continuous movement)
  const moveSpeed = MOVEMENT_CONFIG.stepSize * 5; // Smaller step sizes for tank
  
  // Calculate movement direction (same as regular movement system)
  const forward = new THREE.Vector3(
    -Math.sin(tankRotation),
    0,
    -Math.cos(tankRotation)
  );
  
  // Scale by movement distance for this frame
  const moveDistance = moveSpeed * deltaTime;
  const movementVector = forward.clone().multiplyScalar(moveDistance);
  
  // Enhanced collision detection for tank - check multiple points around the tank
  const tankWidth = 2.0; // Tank is wider than player, account for its size
  const forwardNorm = forward.clone().normalize();
  const rightNorm = new THREE.Vector3().crossVectors(forwardNorm, new THREE.Vector3(0, 1, 0));
  
  // Check collision at tank center and corners
  const checkPoints = [
    tankPosition.clone(), // Center
    tankPosition.clone().add(rightNorm.clone().multiplyScalar(tankWidth * 0.5)), // Right side
    tankPosition.clone().add(rightNorm.clone().multiplyScalar(-tankWidth * 0.5)), // Left side
  ];
  
  // Check collision for each point
  for (const point of checkPoints) {
    if (checkCollision(movementVector, point)) {
      return; // Block tank movement if any point collides
    }
  }
  
  tankPosition.add(movementVector);
  
  // Update tank Y position based on ground height (like regular player movement)
  const correctHeight = getGroundHeight(tankPosition.x, tankPosition.z);
  tankPosition.y = correctHeight;
  
  tankModel.position.copy(tankPosition);
  
  updateTankCamera();
}


// Turn tank
export function turnTank() {
  
  if (!tankModel || !tankMode) {
    return;
  }
  
  const oldRotation = tankRotation;
  const tankTurnSpeed = MOVEMENT_CONFIG.turnSpeed * 0.5; // 100x smaller turning angle
  const newRotation = tankRotation + tankTurnSpeed;
  
  setTankRotation(newRotation);
  tankModel.rotation.y = newRotation;
  
  updateTankCamera();
}

// Update camera to follow tank in third person
function updateTankCamera() {
  if (!tankModel || !tankMode) return;
  
  // Position camera behind and above tank (zoomed in closer)
  const cameraOffset = new THREE.Vector3(0, 3, 6);
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation);
  
  camera.position.copy(tankPosition);
  camera.position.add(cameraOffset);
  
  // Look at tank
  camera.lookAt(tankPosition);
}

// Update tank camera position (called from main render loop)
export function updateTankCameraPosition() {
  if (tankMode && tankModel) {
    updateTankCamera();
    // Check for interactions while in tank mode
    checkInteractions();
  }
}