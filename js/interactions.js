// Interaction system for maps and items
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, camera, playerPosition, interactionObjects, itemObjects, 
  currentMap, animationMixers, hasGun, hasKnife, tankMode, tankPosition,
  setHasGun, setHasKnife, setCurrentWeapon, setInteractionObjects, setItemObjects
} from './state.js';
import { loadMap } from './maps.js';
import { playReloadSound, playKnifeSound } from './audio.js';

let isReturningToCity = false;

// Update the items list in the UI
function updateItemsList() {
  const itemsListElement = document.getElementById('itemsList');
  if (!itemsListElement) return;
  
  const items = [];
  if (hasGun) items.push('Gun');
  if (hasKnife) items.push('Knife');
  
  itemsListElement.textContent = items.length > 0 ? items.join(', ') : 'None';
}

// Create an interactive object
export function createInteractionObject(targetMap, label, x, y, z, color) {
  const geometry = new THREE.BoxGeometry(1, 1.5, 1);
  const material = new THREE.MeshLambertMaterial({ color: color });
  const object = new THREE.Mesh(geometry, material);
  
  object.position.set(x, y + 0.75, z);
  object.castShadow = true;
  object.receiveShadow = true;
  
  // Add text label
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  context.fillStyle = 'rgba(0, 0, 0, 0.8)';
  context.fillRect(0, 0, 256, 128);
  context.fillStyle = 'white';
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.fillText(label, 128, 70);
  
  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const labelGeometry = new THREE.PlaneGeometry(2, 1);
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
  labelMesh.position.set(x, y + 2, z);
  labelMesh.lookAt(camera.position);
  
  object.userData = { type: 'interaction', targetMap: targetMap, label: label };
  
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
    
    // Add text label above tank
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, 256, 128);
    context.fillStyle = 'white';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.fillText('TANK', 128, 70);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const labelGeometry = new THREE.PlaneGeometry(2, 1);
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.set(x, y + 2, z);
    labelMesh.lookAt(camera.position);
    
    tankObject.userData = { type: 'interaction', targetMap: targetMap, label: 'TANK' };
    
    scene.add(tankObject);
    scene.add(labelMesh);
    
    const newInteractionObjects = [...interactionObjects, { object: tankObject, label: labelMesh, targetMap: targetMap }];
    setInteractionObjects(newInteractionObjects);
    
    console.log('Tank interaction object loaded');
    
  }, undefined, function(error) {
    console.warn('Tank interaction object failed to load:', error);
    // Fallback to regular interaction object
    createInteractionObject(targetMap, 'TANK', x, y, z, 0x4A4A4A);
  });
}


// Clear interaction objects
export function clearInteractionObjects() {
  interactionObjects.forEach(item => {
    scene.remove(item.object);
    scene.remove(item.label);
  });
  setInteractionObjects([]);
}

// Add interaction objects based on map
export function addInteractionObjects(mapType) {
  if (mapType === 'city') {
    createInteractionObject('subway', 'SUBWAY', 0, 0, 10, 0x00ff00);
    createInteractionObject('silenthill', 'SILENT HILL', 10, 0, 0, 0x330033);
    createTankInteractionObject('tank', -10, 0, 0); // Tank interaction in city
  } else if (mapType === 'subway') {
    createInteractionObject('city', 'CITY', -12, 0, -12, 0xff0000);
  } else if (mapType === 'silenthill') {
    createInteractionObject('city', 'CITY', 0, 0, 5, 0xff0000);
  } else if (mapType === 'tank') {
    // Remove city exit icon from tank mode - use Z key instead
  }
}

// Check for interactions
export function checkInteractions() {
  const playerPos = tankMode ? tankPosition : playerPosition;
  
  // Check map transitions
  interactionObjects.forEach(item => {
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 2.0) {
      if (currentMap === 'subway' && item.targetMap === 'city') {
        isReturningToCity = true;
      }
      
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
      
      if (item.itemType === 'glock') {
        setHasGun(true);
        setCurrentWeapon('glock');
        playReloadSound();
        console.log('Glock picked up!');
        updateItemsList();
      } else if (item.itemType === 'knife') {
        setHasKnife(true);
        if (!hasGun) { // If no gun, set knife as current weapon
          setCurrentWeapon('knife');
        }
        playKnifeSound();
        console.log('Knife picked up!');
        updateItemsList();
      }
    }
  }
}