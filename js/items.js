// Item system for collectibles
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, itemObjects, animationMixers, hasGun, setItemObjects } from './state.js';

// Clear item objects
export function clearItemObjects() {
  itemObjects.forEach(item => {
    scene.remove(item.object);
  });
  setItemObjects([]);
}

// Load and place an item in the scene
export function loadItem(itemPath, x, y, z, scale = 1.0) {
  const loader = new GLTFLoader();
  
  loader.load(itemPath, function(gltf) {
    const itemModel = gltf.scene;
    
    itemModel.scale.set(scale, scale, scale);
    itemModel.position.set(x, y, z);
    
    // Check for animations in the GLB file
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(itemModel);
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      
      animationMixers.push(mixer);
      console.log(`Loaded ${gltf.animations.length} animations for item`);
    }
    
    // Fix material issues
    itemModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              if (material.uniforms || material.type === 'ShaderMaterial') {
                return new THREE.MeshLambertMaterial({ 
                  color: material.color || 0x888888,
                  map: material.map || null
                });
              }
              return material;
            });
          } else if (child.material.uniforms || child.material.type === 'ShaderMaterial') {
            child.material = new THREE.MeshLambertMaterial({ 
              color: child.material.color || 0x888888,
              map: child.material.map || null
            });
          }
        }
      }
    });
    
    itemModel.userData = { type: 'item', itemType: 'glock' };
    
    scene.add(itemModel);
    const newItemObjects = [...itemObjects, { object: itemModel, itemType: 'glock', mixer: mixer }];
    setItemObjects(newItemObjects);
    
  }, undefined, function(error) {
    console.warn('Item failed to load:', error);
  });
}

// Add items to specific maps
export function addItemsToMap(mapType) {
  if (mapType === 'city' && !hasGun) {
    loadItem('./glock.glb', 0, -1, -4, 4.0);
  }
}

// Rotate items continuously (only if no GLB animation)
export function rotateItems() {
  itemObjects.forEach(item => {
    if (item.itemType === 'glock' && !item.mixer) {
      item.object.rotation.y += 0.02;
    }
  });
}