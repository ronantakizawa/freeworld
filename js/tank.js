// Tank system for tank mode
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, camera, tankMode, tankModel, tankMixer, tankPosition, tankRotation,
  setTankModel, setTankMixer, setTankRotation, animationMixers, collisionObjects, raycaster
} from './state.js';
import { MOVEMENT_CONFIG } from './config.js';
import { getMapBoundaries } from './maps.js';

// Load and setup tank model
export function loadTankModel() {
  console.log('Loading tank model...');
  const loader = new GLTFLoader();
  
  loader.load('./tank.glb', function(gltf) {
    console.log('Tank GLB loaded successfully', gltf);
    const tank = gltf.scene;
    
    // Position tank on ground
    tank.position.copy(tankPosition);
    tank.rotation.y = tankRotation;
    tank.scale.set(0.4, 0.35, 0.4); // 2.5x smaller (2x bigger than before)
    
    // Setup animations if they exist
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(tank);
      setTankMixer(mixer);
      animationMixers.push(mixer);
      
      console.log(`Tank has ${gltf.animations.length} animations available`);
      gltf.animations.forEach((clip, index) => {
        console.log(`Animation ${index}: ${clip.name}, Duration: ${clip.duration}s`);
      });
    }
    
    // Fix materials
    tank.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              if (material.uniforms || material.type === 'ShaderMaterial') {
                return new THREE.MeshLambertMaterial({ 
                  color: material.color || 0x444444,
                  map: material.map || null
                });
              }
              return material;
            });
          } else if (child.material.uniforms || child.material.type === 'ShaderMaterial') {
            child.material = new THREE.MeshLambertMaterial({ 
              color: child.material.color || 0x444444,
              map: child.material.map || null
            });
          }
        }
      }
    });
    
    scene.add(tank);
    setTankModel(tank);
    updateTankCamera();
    
    console.log('Tank loaded and added to scene');
    
  }, undefined, function(error) {
    console.error('Tank loading error:', error);
  });
}

// Remove tank model from scene
export function removeTankModel() {
  if (tankModel) {
    scene.remove(tankModel);
    
    // Clean up mixer
    if (tankMixer) {
      const mixerIndex = animationMixers.indexOf(tankMixer);
      if (mixerIndex > -1) {
        animationMixers.splice(mixerIndex, 1);
      }
      tankMixer.stopAllAction();
      setTankMixer(null);
    }
    
    setTankModel(null);
  }
}

// Move tank forward continuously and control animation
export function moveTankForward(deltaTime) {
  if (!tankModel || !tankMode) {
    return;
  }
  
  // Calculate movement speed (adjusted for continuous movement)
  const moveSpeed = MOVEMENT_CONFIG.stepSize * 10; // Smaller step sizes for tank
  
  // Calculate new position
  const forward = new THREE.Vector3(0, 0, -moveSpeed * deltaTime);
  forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation);
  
  // Check for collisions with buildings and objects
  const direction = forward.clone().normalize();
  raycaster.set(tankPosition, direction);
  const intersects = raycaster.intersectObjects(collisionObjects, true);
  if (intersects.length > 0 && intersects[0].distance < moveSpeed * deltaTime + 1.0) {
    return; // Block tank movement
  }
  
  // Check actual map boundaries for tank movement
  const newX = tankPosition.x + forward.x;
  const newZ = tankPosition.z + forward.z;
  
  const boundaries = getMapBoundaries();
  if (boundaries) {
    // Add small buffer to boundaries for smoother tank experience
    const buffer = 5;
    if (newX < boundaries.minX + buffer || newX > boundaries.maxX - buffer ||
        newZ < boundaries.minZ + buffer || newZ > boundaries.maxZ - buffer) {
      return; // Block tank movement
    }
  }
  
  tankPosition.add(forward);
  tankModel.position.copy(tankPosition);
  
  updateTankCamera();
}

// Start tank animation
export function startTankAnimation() {
  if (!tankMixer || tankMixer._actions.length === 0) return;
  
  const action = tankMixer._actions[0];
  if (!action.isRunning()) {
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.play();
  }
}

// Stop tank animation
export function stopTankAnimation() {
  if (!tankMixer || tankMixer._actions.length === 0) return;
  
  const action = tankMixer._actions[0];
  if (action.isRunning()) {
    action.stop();
  }
}

// Turn tank
export function turnTank() {
  console.log('turnTank called', { tankModel: !!tankModel, tankMode });
  
  if (!tankModel || !tankMode) {
    console.log('Tank turning blocked:', { tankModel: !!tankModel, tankMode });
    return;
  }
  
  const oldRotation = tankRotation;
  const tankTurnSpeed = MOVEMENT_CONFIG.turnSpeed * 0.5; // 100x smaller turning angle
  const newRotation = tankRotation + tankTurnSpeed;
  
  console.log('Tank turning:', { oldRotation, newRotation, originalTurnSpeed: MOVEMENT_CONFIG.turnSpeed, tankTurnSpeed });
  
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
  }
}