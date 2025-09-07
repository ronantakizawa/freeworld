// Item system for collectibles
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, itemObjects, animationMixers, hasGun, hasKnife, setItemObjects, camera, playerPosition, currentMap } from './state.js';
import { startZombieAudio, stopZombieAudio, playDamageSound, playHeartbeatSound } from './audio.js';
import { showDamageEffect, showDeathEffect, updateProgressiveDamage } from './main.js';

// Arrays to track marks for cleanup
let slashMarks = [];
let bulletHoles = [];

// Clear item objects and all marks
export function clearItemObjects() {
  itemObjects.forEach(item => {
    scene.remove(item.object);
  });
  setItemObjects([]);
  
  // Clear all slash marks
  slashMarks.forEach(mark => {
    scene.remove(mark);
  });
  slashMarks = [];
  
  // Clear all bullet holes
  bulletHoles.forEach(hole => {
    scene.remove(hole);
  });
  bulletHoles = [];
  
}

// Load and place an item in the scene
export function loadItem(itemPath, x, y, z, scale = 1.0, itemType = 'gun') {
  // Loading item silently
  const loader = new GLTFLoader();
  
  loader.load(itemPath, function(gltf) {
    const itemModel = gltf.scene;
    
    itemModel.scale.set(scale, scale, scale);
    itemModel.position.set(x, y, z);
    
    // Rotate targets 90 degrees counter-clockwise (around Y axis)
    if (itemType === 'target') {
      itemModel.rotation.y = Math.PI / 2; // 90 degrees counter-clockwise
    }
    
    // Rotate zombies 90 degrees clockwise (around Y axis)
    if (itemType === 'zombie') {
      itemModel.rotation.y = -Math.PI / 2; // 90 degrees clockwise
    }
    
    // Check for animations in the GLB file
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(itemModel);
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        
        // For zombies, add event listener to move forward after animation
        if (itemType === 'zombie') {
          action.setLoop(THREE.LoopRepeat);
          
          // Add event listener for animation loop completion
          mixer.addEventListener('loop', (event) => {
            if (event.action === action) {
              // Move zombie forward by 0.1 in their facing direction
              // Since zombies are rotated 90° clockwise (-π/2), their forward is -X direction
              itemModel.position.x -= 0.1;
            }
          });
        }
        
        action.play();
      });
      
      animationMixers.push(mixer);
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
                const newMaterial = new THREE.MeshLambertMaterial({ 
                  color: material.color || 0x888888,
                  transparent: material.transparent || false,
                  opacity: material.opacity || 1.0
                });
                
                // Only use texture map if it's not a blob URL (which causes loading errors)
                if (material.map && !material.map.image?.src?.startsWith('blob:')) {
                  newMaterial.map = material.map;
                }
                
                return newMaterial;
              }
              
              // Make targets more visible in dark environments
              if (itemType === 'target') {
                material.emissive = new THREE.Color(0x333333); // Self-illuminating
                material.emissiveIntensity = 0.15;
              }
              
              // Make zombies darker/less bright
              if (itemType === 'zombie') {
                if (material.color) {
                  material.color.multiplyScalar(0.5); // Make much darker
                }
                material.emissive = new THREE.Color(0x000000); // No self-illumination
                material.emissiveIntensity = 0;
              }
              
              return material;
            });
          } else if (child.material.uniforms || child.material.type === 'ShaderMaterial') {
            const newMaterial = new THREE.MeshLambertMaterial({ 
              color: child.material.color || 0x888888,
              transparent: child.material.transparent || false,
              opacity: child.material.opacity || 1.0
            });
            
            // Only use texture map if it's not a blob URL (which causes loading errors)
            if (child.material.map && !child.material.map.image?.src?.startsWith('blob:')) {
              newMaterial.map = child.material.map;
            }
            
            child.material = newMaterial;
          }
          
          // Make targets more visible in dark environments
          if (itemType === 'target' && !Array.isArray(child.material)) {
            child.material.emissive = new THREE.Color(0x333333); // Self-illuminating
            child.material.emissiveIntensity = 0.15;
          }
          
          // Make zombies darker/less bright
          if (itemType === 'zombie' && !Array.isArray(child.material)) {
            if (child.material.color) {
              child.material.color.multiplyScalar(0.3); // Make much darker
            }
            child.material.emissive = new THREE.Color(0x000000); // No self-illumination
            child.material.emissiveIntensity = 0;
          }
        }
      }
    });
    
    itemModel.userData = { type: 'item', itemType: itemType };
    
    scene.add(itemModel);
    const newItemObjects = [...itemObjects, { object: itemModel, itemType: itemType, mixer: mixer }];
    setItemObjects(newItemObjects);
    
  }, undefined, function(error) {
    console.error(`Failed to load ${itemType} from ${itemPath}:`, error);
  });
}

// Add items to specific maps
export function addItemsToMap(mapType) {
  if (mapType === 'city' && !hasGun) {
    loadItem('./gun.glb', 0, -1, -4, 4.0, 'gun');
  }
  if (mapType === 'city' && !hasKnife) {
    loadItem('./knife.glb', 5, 0, -6, 0.075, 'knife');
  }
  if (mapType === 'city') {
    // Position targets near tank (-10, 0, 0) in horizontal line
    loadItem('./target.glb', -6, 0.75, -2, 0.5, 'target');     // Right of tank
    loadItem('./target.glb', -6, 0.75, -3, 0.5, 'target');    // Between left and tank
    loadItem('./target.glb', -6, 0.75, -4, 0.5, 'target');     // Between tank and right
  }
  if (mapType === 'silenthill') {
    // Add targets to silent hill at same coordinates as city
    loadItem('./target.glb', -6, 0.75, -2, 0.5, 'target');     // Right of tank
    loadItem('./target.glb', -6, 0.75, -3, 0.5, 'target');    // Between left and tank
    loadItem('./target.glb', -6, 0.75, -4, 0.5, 'target');     // Between tank and right
    
    // Add 3 zombies lined up 4 points behind targets on x-axis (targets are at x=-6, so zombies at x=-10)
    loadItem('./zombie.glb', -10, 0.2, -2, 0.5, 'zombie');   // Zombie 1 (behind first target)
    loadItem('./zombie.glb', -12, 0.2, -3, 0.5, 'zombie');   // Zombie 2 (behind second target)
    loadItem('./zombie.glb', -14, 0.2, -4, 0.5, 'zombie');   // Zombie 3 (behind third target)
  }
}

// Rotate items continuously (only if no GLB animation, exclude targets)
export function rotateItems() {
  itemObjects.forEach(item => {
    if ((item.itemType === 'gun' || item.itemType === 'knife') && !item.mixer) {
      item.object.rotation.y += 0.02;
    }
    // Targets should never rotate - keep their 90 degree counter-clockwise position
  });
}

// Check for target hits when shooting
export function checkTargetHit() {
  // Check target hits silently
  
  if (!hasGun) {
    console.log('No gun, target hit blocked');
    return;
  }
  
  // Allow bullet holes in all maps including silent hill
  
  // Create a raycaster from camera position in the direction camera is facing
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Get all target objects
  const targets = itemObjects.filter(item => item.itemType === 'target');
  const targetMeshes = [];
  
  targets.forEach(target => {
    target.object.traverse(child => {
      if (child.isMesh) {
        targetMeshes.push(child);
      }
    });
  });
  
  if (targetMeshes.length > 0) {
    // Check for intersections with targets
    const intersects = raycaster.intersectObjects(targetMeshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      addBulletHole(hit.point);
    }
  }
  
  // Check for zombie hits - no distance restriction, just raycaster hits
  const zombies = itemObjects.filter(item => item.itemType === 'zombie');
  
  zombies.forEach((zombie) => {
    // Check if the raycaster intersects with this zombie
    const zombieMeshes = [];
    zombie.object.traverse(child => {
      if (child.isMesh) {
        zombieMeshes.push(child);
      }
    });
    
    if (zombieMeshes.length > 0) {
      const zombieIntersects = raycaster.intersectObjects(zombieMeshes);
      
      if (zombieIntersects.length > 0) {
        flipZombie(zombie);
        return; // Exit after flipping to avoid issues with array modification
      }
    }
  });
}

// Check for knife slash on targets and zombies
export function checkKnifeSlash() {
  if (!hasKnife) {
    return;
  }
  
  // Allow knife slashes in both city and silent hill maps
  if (currentMap !== 'city' && currentMap !== 'silenthill') {
    return;
  }
  
  // Check zombies first - within 2.0 units for flipping
  const zombies = itemObjects.filter(item => item.itemType === 'zombie');
  
  zombies.forEach((zombie) => {
    const distance = playerPosition.distanceTo(zombie.object.position);
    
    // If within 2.0 units of zombie, flip it
    if (distance <= 2.0) {
      flipZombie(zombie);
      return; // Exit after flipping to avoid issues with array modification
    }
  });
  
  // Get all target objects
  const targets = itemObjects.filter(item => item.itemType === 'target');
  
  targets.forEach((target) => {
    const distance = playerPosition.distanceTo(target.object.position);
    
    // If within 3.0 units of target, slash it
    if (distance <= 3.0) {
      addSlashMark(target.object);
    }
  });
}

// Add a bullet hole (black dot) to a target
function addBulletHole(hitPoint) {
  // Create a small black sphere for the bullet hole
  const holeGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bulletHole = new THREE.Mesh(holeGeometry, holeMaterial);
  
  // Position the bullet hole slightly in front of the target surface
  const direction = new THREE.Vector3();
  direction.subVectors(camera.position, hitPoint).normalize();
  bulletHole.position.copy(hitPoint);
  bulletHole.position.add(direction.multiplyScalar(-0.01)); // Offset slightly towards camera
  
  // Add the bullet hole to the scene
  scene.add(bulletHole);
  
}

// Add a slash mark (black line) to a target
function addSlashMark(targetObject) {
  console.log('🔪 addSlashMark called for target at:', targetObject.position);
  console.log('🔪 Adding slash mark in map:', currentMap);
  
  // Create a very thin black diagonal slash line on the target
  const lineGeometry = new THREE.CylinderGeometry(0.0025, 0.0025, 0.6, 8); // Half the thickness
  const lineMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000, // BLACK
    transparent: false,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const slashLine = new THREE.Mesh(lineGeometry, lineMaterial);
  
  // Position the slash line directly on the target surface first
  slashLine.position.copy(targetObject.position);
  slashLine.position.add(new THREE.Vector3(0, 0, 0.1)); // Slightly in front of target
  
  // Add random offset to vary slash positions on the target (including Y and Z)
  const randomOffset = new THREE.Vector3(
    (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 0.1
  );
  slashLine.position.add(randomOffset);
  
  // Match target rotation first
  slashLine.rotation.copy(targetObject.rotation);
  
  // Then add diagonal slash rotation - make it truly diagonal by rotating around multiple axes
  slashLine.rotation.x += (Math.random() - 0.5) * 0.5; // Random tilt -15° to +15°
  slashLine.rotation.y += (Math.random() - 0.5) * 0.3; // Random Y rotation
  slashLine.rotation.z += Math.PI / 4 + (Math.random() - 0.5) * 0.3; // 45° diagonal ± variation
  
  // Make it render on top 
  slashLine.renderOrder = 999;
  
  // Add the slash line to the scene
  scene.add(slashLine);
  
  console.log('Black slash mark added to target at:', slashLine.position);
}

// Flip a zombie 90 degrees and stop its animation
function flipZombie(zombie) {
  // Stop animation if it exists
  if (zombie.mixer) {
    zombie.mixer.stopAllAction();
    // Remove from animationMixers array to prevent updates
    const mixerIndex = animationMixers.indexOf(zombie.mixer);
    if (mixerIndex > -1) {
      animationMixers.splice(mixerIndex, 1);
    }
    zombie.mixer = null;
  }
  
  // Reset initial zombie rotation (-π/2) and flip to ground facing up
  zombie.object.rotation.y = 0; // Undo initial -π/2 rotation
  zombie.object.rotation.x = - (Math.PI / 2); // Fall backward to ground facing up
  
  // Mark zombie as flipped to exclude from audio proximity
  zombie.object.userData.flipped = true;
}

// Track damage cooldown to prevent spam
let lastDamageTime = 0;
const damageCooldown = 2000; // 2 seconds between damage instances

// Track damage counter for death system
let damageCount = 0;
const maxDamageCount = 5;

// Check proximity to zombies and manage audio
export function checkZombieProximity() {
  if (currentMap !== 'silenthill') {
    // Stop zombie audio if not in silent hill
    stopZombieAudio();
    return;
  }
  
  // Get all zombie objects
  const zombies = itemObjects.filter(item => item.itemType === 'zombie');
  
  if (zombies.length === 0) {
    stopZombieAudio();
    return;
  }
  
  // Check if player is within 5.0 units of any non-flipped zombie for audio
  // Check if player is within 1.0 units of any non-flipped zombie for damage
  let nearZombie = false;
  let takeDamage = false;
  const currentTime = Date.now();
  
  zombies.forEach(zombie => {
    // Skip flipped zombies
    if (zombie.object.userData.flipped) {
      return;
    }
    
    const distance = playerPosition.distanceTo(zombie.object.position);
    
    // Audio proximity check (5.0 units)
    if (distance <= 5.0) {
      nearZombie = true;
    }
    
    // Damage proximity check (1.0 units) with cooldown
    if (distance <= 1.0 && (currentTime - lastDamageTime) > damageCooldown) {
      takeDamage = true;
    }
  });
  
  // Handle damage
  if (takeDamage) {
    lastDamageTime = currentTime;
    damageCount++;
    
    playDamageSound();
    showDamageEffect();
    updateProgressiveDamage(damageCount); // Update progressive red overlay
    
    // Check if player has taken max damage
    if (damageCount >= maxDamageCount) {
      
      // Play heartbeat sound twice with delay
      playHeartbeatSound();
      setTimeout(() => {
        playHeartbeatSound();
      }, 1500); // Play second heartbeat after 1.5 seconds
      
      // Start death fade effect
      showDeathEffect();
    }
  }
  
  // Start or stop zombie audio based on proximity
  if (nearZombie) {
    startZombieAudio();
  } else {
    stopZombieAudio();
  }
}