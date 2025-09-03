// Interaction system for maps and items
import * as THREE from 'three';
import { 
  scene, camera, playerPosition, interactionObjects, itemObjects, 
  currentMap, animationMixers, hasGun,
  setHasGun, setHasKnife, setCurrentWeapon, setInteractionObjects, setItemObjects
} from './state.js';
import { loadMap } from './maps.js';
import { playReloadSound, playKnifeSound } from './audio.js';

let isReturningToCity = false;

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
  } else if (mapType === 'subway') {
    createInteractionObject('city', 'CITY', -12, 0, -12, 0xff0000);
  } else if (mapType === 'silenthill') {
    createInteractionObject('city', 'CITY', 0, 0, 5, 0xff0000);
  }
}

// Check for interactions
export function checkInteractions() {
  const playerPos = playerPosition;
  
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
  
  // Check item interactions
  for (let i = itemObjects.length - 1; i >= 0; i--) {
    const item = itemObjects[i];
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 3.0) {
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
      } else if (item.itemType === 'knife') {
        setHasKnife(true);
        if (!hasGun) { // If no gun, set knife as current weapon
          setCurrentWeapon('knife');
        }
        playKnifeSound();
        console.log('Knife picked up!');
      }
    }
  }
}