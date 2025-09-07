// FPS overlay and weapon system
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, camera, fpsOverlay, fpsOverlayMixer, fpsOverlayAnimations, fpsOverlayActive,
  isRecoiling, isReloading, recoilOffset, currentMap, currentWeapon,
  setFpsOverlay, setFpsOverlayActive, setFpsOverlayMixer, 
  setIsRecoiling, setIsReloading, setRecoilOffset
} from './state.js';
import { playReloadSound, playShotSound, playKnifeSound } from './audio.js';
import { checkTargetHit, checkKnifeSlash } from './items.js';

// Shot counter for automatic reload
let shotCounter = 0;

// Toggle FPS overlay
export function toggleFPSOverlay() {
  if (fpsOverlayActive) {
    // Hide FPS overlay
    if (fpsOverlay) {
      scene.remove(fpsOverlay);
      setFpsOverlay(null);
    }
    // Clean up mixer and animations
    if (fpsOverlayMixer) {
      fpsOverlayMixer.stopAllAction();
      setFpsOverlayMixer(null);
    }
    window.fpsOverlayAnimations = [];
    setIsRecoiling(false);
    setIsReloading(false);
    setFpsOverlayActive(false);
    // Reset shot counter when hiding overlay
    shotCounter = 0;
    shotCounter = 0;
  } else {
    // Show FPS overlay and reset shot counter
    shotCounter = 0;
    loadFPSOverlay();
    setFpsOverlayActive(true);
  }
}

// Load and display FPS overlay
function loadFPSOverlay() {
  const loader = new GLTFLoader();
  
  // Select model based on current weapon
  let modelPath;
  if (currentWeapon === 'knife') {
    modelPath = './knife_animated.glb';
  } else {
    modelPath = './fps.glb'; // Default to gun
  }
  
  loader.load(modelPath, function(gltf) {
    const overlay = gltf.scene;
    
    // Position the FPS overlay to overlap the screen view
    overlay.position.set(0, 2, -0.3);
    overlay.scale.set(0.01, 0.001, -0.01);
  
    
    // Set up animations if they exist
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(overlay);
      setFpsOverlayMixer(mixer);
      window.fpsOverlayAnimations = gltf.animations;

      
      // For knife, set stationary pose at second 2
      if (currentWeapon === 'knife' && gltf.animations.length > 0) {
        const animation = gltf.animations[0];
        const action = mixer.clipAction(animation);
        const stationaryTime = Math.min(2, animation.duration);
        
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.time = stationaryTime;
        action.play();
        action.paused = true; // Pause at this frame
        
      }
    }
    
    // Fix material issues and make sure it renders on top
    overlay.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.renderOrder = 999;
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              const baseColor = material.color || 0x888888;
              const darkenedColor = currentMap === 'silenthill' ? 
                new THREE.Color(baseColor).multiplyScalar(0.3) : baseColor;
              
              const newMaterial = new THREE.MeshBasicMaterial({ 
                color: darkenedColor,
                map: material.map || null,
                transparent: material.transparent || false,
                opacity: material.opacity || 1.0
              });
              newMaterial.depthTest = false;
              return newMaterial;
            });
          } else {
            const baseColor = child.material.color || 0x888888;
            const darkenedColor = currentMap === 'silenthill' ? 
              new THREE.Color(baseColor).multiplyScalar(0.3) : baseColor;
            
            const newMaterial = new THREE.MeshBasicMaterial({ 
              color: darkenedColor,
              map: child.material.map || null,
              transparent: child.material.transparent || false,
              opacity: child.material.opacity || 1.0
            });
            newMaterial.depthTest = false;
            child.material = newMaterial;
          }
        }
      }
    });
    
    scene.add(overlay);
    setFpsOverlay(overlay);
    updateFPSOverlayPosition();
    
  }, undefined, function(error) {
    console.error('FPS overlay failed to load:', error);
  });
}

// Update FPS overlay position to stay in front of camera
export function updateFPSOverlayPosition() {
  if (fpsOverlay && fpsOverlayActive) {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    
    const down = new THREE.Vector3(0, -1, 0);
    down.applyQuaternion(camera.quaternion);
    
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(camera.quaternion);
    
    fpsOverlay.position.copy(camera.position);
    fpsOverlay.position.add(forward.multiplyScalar(0.3));
    fpsOverlay.position.add(down.multiplyScalar(0.2));
    fpsOverlay.position.add(up.multiplyScalar(recoilOffset));
    
    fpsOverlay.rotation.copy(camera.rotation);
  }
}

// Play last second of animation (Z key)
export function shootRecoil() {
  if (isReloading) {
    return;
  }
  
  if (currentWeapon === 'gun') {
    playShotSound();
    // Check for target hits when shooting with gun
    checkTargetHit();
    
    // Increment shot counter and check for automatic reload
    shotCounter++;
    if (shotCounter >= 3) {
      shotCounter = 0; // Reset counter
      // Trigger reload after the current shot animation completes
      setTimeout(() => {
        if (currentWeapon === 'gun' && fpsOverlayActive && fpsOverlay && !isReloading) {
          // Force stop current recoil animation first
          setIsRecoiling(false);
          playReloadAnimation();
        }
      }, 1200); // Longer delay to ensure shot animation fully completes
    }
  } else if (currentWeapon === 'knife') {
    playKnifeSound();
    // Check for knife slash on nearby targets
    checkKnifeSlash();
  }
  
  if (fpsOverlay && fpsOverlayMixer && window.fpsOverlayAnimations.length > 0 && !isRecoiling) {
    setIsRecoiling(true);
    
    fpsOverlayMixer.stopAllAction();
    
    const animation = window.fpsOverlayAnimations[0];
    const action = fpsOverlayMixer.clipAction(animation);
    
    const animationDuration = animation.duration;
    
    let startTime, duration;
    if (currentWeapon === 'knife') {
      // Play seconds 2-2.25 for knife
      startTime = Math.min(2, animationDuration);
      duration = Math.min(0.25, animationDuration - startTime); // 0.25 second duration
    } else {
      // Play last second for gun
      startTime = Math.max(0, animationDuration - 1);
      duration = 1;
    }
    
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.reset();
    
    action.time = startTime;
    action.setEffectiveTimeScale(1);
    action.play();
    
    setTimeout(() => {
      action.stop();
      
      // For knife, return to stationary pose at 2 seconds
      if (currentWeapon === 'knife') {
        const stationaryTime = Math.min(2, animationDuration);
        action.time = stationaryTime;
        action.play();
        action.paused = true; // Pause at stationary frame
      }
      
      setIsRecoiling(false);
    }, duration * 1000);
    
  } else {
    // Fallback to simple recoil if no animation
    const recoilAmount = 0.05;
    const duration = 200;
    const startTime = Date.now();
    
    function animateRecoil() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.5) {
        const recoilProgress = progress * 2;
        setRecoilOffset(recoilAmount * recoilProgress);
      } else {
        const returnProgress = (progress - 0.5) * 2;
        setRecoilOffset(recoilAmount - (recoilAmount * returnProgress));
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateRecoil);
      } else {
        setRecoilOffset(0);
        setIsRecoiling(false);
      }
    }
    
    if (!isRecoiling) {
      setIsRecoiling(true);
      animateRecoil();
    }
  }
}

// Play first 2 seconds of animation (X key)
export function playReloadAnimation() {
  playReloadSound();
  
  if (fpsOverlay && fpsOverlayMixer && window.fpsOverlayAnimations.length > 0 && !isReloading) {
    // Ensure we're not in recoiling state and stop all current animations
    setIsRecoiling(false);
    setIsReloading(true);
    fpsOverlayMixer.stopAllAction();
    
    const animation = window.fpsOverlayAnimations[0];
    const action = fpsOverlayMixer.clipAction(animation);
    
    const animationDuration = animation.duration;
    const playDuration = Math.min(2, animationDuration);
    
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.reset();
    action.play();
    
    setTimeout(() => {
      action.stop();
      setIsRecoiling(false);
      setIsReloading(false);
    }, playDuration * 1000);
  }
}