// Interaction system for maps and items
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, camera, playerPosition, interactionObjects, itemObjects, 
  currentMap, animationMixers, hasGun, tankMode, tankPosition, availableWeapons, isReturningToCity,
  setHasGun, setHasKnife, setCurrentWeapon, setInteractionObjects, setItemObjects, updateAvailableWeapons
} from './state.js';
import { loadMap } from './maps.js';
import { playReloadSound, playKnifeSound } from './audio.js';
import { INTERACTION_CONFIGS, LABEL_CONFIG } from './config.js';

// Create a label mesh using config
function createLabel(text, x, y, z) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Use config for canvas setup
  canvas.width = LABEL_CONFIG.canvas.width;
  canvas.height = LABEL_CONFIG.canvas.height;
  
  // Background
  context.fillStyle = LABEL_CONFIG.background.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Text
  context.fillStyle = LABEL_CONFIG.text.color;
  context.font = LABEL_CONFIG.text.font;
  context.textAlign = LABEL_CONFIG.text.align;
  context.fillText(text, LABEL_CONFIG.text.position.x, LABEL_CONFIG.text.position.y);
  
  // Create mesh
  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({ 
    map: texture, 
    transparent: LABEL_CONFIG.mesh.transparent 
  });
  const labelGeometry = new THREE.PlaneGeometry(
    LABEL_CONFIG.mesh.geometry.width, 
    LABEL_CONFIG.mesh.geometry.height
  );
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
  labelMesh.position.set(x, y + LABEL_CONFIG.mesh.yOffset, z);
  labelMesh.lookAt(camera.position);
  
  return labelMesh;
}

// Update the items list in the UI
function updateItemsList() {
  const itemsListElement = document.getElementById('itemsList');
  if (!itemsListElement) return;
  
  // Update available weapons in state and get the current list
  const weapons = updateAvailableWeapons();
  
  // Convert internal names to display names
  const displayNames = weapons.map(weapon => {
    switch(weapon) {
      case 'gun': return 'Gun';
      case 'knife': return 'Knife';
      default: return weapon;
    }
  });
  
  itemsListElement.textContent = displayNames.length > 0 ? displayNames.join(', ') : 'None';
}

// Create an interactive object
export function createInteractionObject(targetMap, label, x, y, z, color) {
  const geometry = new THREE.BoxGeometry(1, 1.5, 1);
  const material = new THREE.MeshLambertMaterial({ color: color });
  const object = new THREE.Mesh(geometry, material);
  
  object.position.set(x, y + 0.75, z);
  object.castShadow = true;
  object.receiveShadow = true;
  
  // Mark as interaction object to exclude from collision detection
  object.userData = { 
    type: 'interaction', 
    targetMap: targetMap, 
    label: label,
    isInteractionObject: true  // Key flag to exclude from collisions
  };
  
  // Create label using config
  const labelMesh = createLabel(label, x, y, z);
  
  scene.add(object);
  scene.add(labelMesh);
  
  const newInteractionObjects = [...interactionObjects, { object: object, label: labelMesh, targetMap: targetMap }];
  setInteractionObjects(newInteractionObjects);
}

// Create tank interaction object using actual tank.glb model
export function createTankInteractionObject(targetMap, x, y, z) {
  const loader = new GLTFLoader();
  
  loader.load('./tank.glb', function(gltf) {
    const tankObject = gltf.scene;
    
    // Position and scale the tank
    tankObject.position.set(x, y, z);
    tankObject.scale.set(0.3, 0.3, 0.3); // Slightly smaller for interaction
    
    // Fix materials
    tankObject.traverse(function(child) {
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
    
    // Create label using config
    const labelMesh = createLabel('TANK', x, y, z);
    
    tankObject.userData = { type: 'interaction', targetMap: targetMap, label: 'TANK' };
    
    scene.add(tankObject);
    scene.add(labelMesh);
    
    const newInteractionObjects = [...interactionObjects, { object: tankObject, label: labelMesh, targetMap: targetMap }];
    setInteractionObjects(newInteractionObjects);
    
  }, undefined, function(error) {
    // Fallback to regular interaction object
    createInteractionObject(targetMap, 'TANK', x, y, z, 0x4A4A4A);
  });
}


// Clear interaction objects
export function clearInteractionObjects() {
  interactionObjects.forEach(item => {
    scene.remove(item.object);
    scene.remove(item.label);
    // Dispose of geometry and materials to prevent memory leaks
    if (item.object.geometry) item.object.geometry.dispose();
    if (item.object.material) {
      if (Array.isArray(item.object.material)) {
        item.object.material.forEach(material => material.dispose());
      } else {
        item.object.material.dispose();
      }
    }
    if (item.label.geometry) item.label.geometry.dispose();
    if (item.label.material) item.label.material.dispose();
  });
  setInteractionObjects([]);
  console.log('Cleared all interaction objects');
}

// Add interaction objects based on map
export function addInteractionObjects(mapType) {
  const interactions = INTERACTION_CONFIGS[mapType];
  if (!interactions) return;
  
  interactions.forEach(interaction => {
    const { targetMap, label, position, color, type } = interaction;
    const { x, y, z } = position;
    
    if (type === 'tank') {
      createTankInteractionObject(targetMap, x, y, z);
    } else {
      createInteractionObject(targetMap, label, x, y, z, color);
    }
  });
}

// Check for interactions
export function checkInteractions() {
  const playerPos = tankMode ? tankPosition : playerPosition;
  
  // Check map transitions
  interactionObjects.forEach(item => {
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 2.0) {
      loadMap(item.targetMap);
    }
  });
  
  // Check item interactions (exclude targets from collection)
  for (let i = itemObjects.length - 1; i >= 0; i--) {
    const item = itemObjects[i];
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 3.0 && item.itemType !== 'target' && item.itemType !== 'zombie') {
      scene.remove(item.object);
      
      // Clean up animation mixer if it exists
      if (item.mixer) {
        const mixerIndex = animationMixers.indexOf(item.mixer);
        if (mixerIndex > -1) {
          animationMixers.splice(mixerIndex, 1);
        }
        item.mixer.stopAllAction();
        item.mixer = null;
      }
      
      const newItemObjects = itemObjects.filter((_, index) => index !== i);
      setItemObjects(newItemObjects);
      
      if (item.itemType === 'gun') {
        setHasGun(true);
        setCurrentWeapon('gun');
        playReloadSound();
        updateItemsList();
      } else if (item.itemType === 'knife') {
        setHasKnife(true);
        if (!hasGun) { // If no gun, set knife as current weapon
          setCurrentWeapon('knife');
        }
        playKnifeSound();
        updateItemsList();
      }
    }
  }
}