// Map loading and management system
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { 
  scene, currentModel, playerPosition, 
  setCurrentModel, setCurrentMap, setLastGroundHeight,
  setCollisionObjects 
} from './state.js';
import { mapConfigs } from './config.js';
import { switchBackgroundMusic } from './audio.js';
import { clearInteractionObjects, addInteractionObjects } from './interactions.js';
import { clearItemObjects, addItemsToMap } from './items.js';
import { updateCameraPosition, getGroundHeight } from './movement.js';

let ambientLight, directionalLight;

// Load a map
export function loadMap(mapType) {
  const loader = new GLTFLoader();
  const config = mapConfigs[mapType];
  
  showLoadingScreen(`Loading ${config.name}...`);
  
  if (currentModel) {
    scene.remove(currentModel);
    setCurrentModel(null);
  }
  
  clearInteractionObjects();
  clearItemObjects();
  
  loader.load(config.path, function(gltf) {
    const model = gltf.scene;
    
    const scale = config.scale;
    model.scale.set(scale, scale, scale);
    model.position.set(0, 0, 0);
    
    // Enable shadows and collect collision objects
    const newCollisionObjects = [];
    model.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Fix material uniforms issues
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              const baseColor = material.color || 0x888888;
              const darkenedColor = mapType === 'silenthill' ? 
                new THREE.Color(baseColor).multiplyScalar(0.1) : baseColor;
              
              if (material.uniforms || material.type === 'ShaderMaterial') {
                return new THREE.MeshLambertMaterial({ 
                  color: darkenedColor,
                  map: material.map || null
                });
              }
              
              if (mapType === 'silenthill') {
                material.color = darkenedColor;
              }
              return material;
            });
          } else if (child.material.uniforms || child.material.type === 'ShaderMaterial') {
            const baseColor = child.material.color || 0x888888;
            const darkenedColor = mapType === 'silenthill' ? 
              new THREE.Color(baseColor).multiplyScalar(0.1) : baseColor;
            
            child.material = new THREE.MeshLambertMaterial({ 
              color: darkenedColor,
              map: child.material.map || null
            });
          } else if (mapType === 'silenthill' && child.material.color) {
            child.material.color = new THREE.Color(child.material.color).multiplyScalar(0.1);
          }
        }
        
        newCollisionObjects.push(child);
      }
    });
    
    setCollisionObjects(newCollisionObjects);
    
    scene.add(model);
    setCurrentModel(model);
    setCurrentMap(mapType);
    
    // Update player spawn position
    const spawnX = config.spawnPosition.x;
    const spawnZ = config.spawnPosition.z;
    
    playerPosition.set(spawnX, config.groundLevel, spawnZ);
    setLastGroundHeight(null);
    const spawnGroundHeight = getGroundHeight(spawnX, spawnZ);
    playerPosition.y = spawnGroundHeight;
    updateCameraPosition();
    
    switchBackgroundMusic(config.bgMusic);
    addInteractionObjects(mapType);
    addItemsToMap(mapType);
    addLighting();
    updateEnvironmentEffects(mapType);
    
    hideLoadingScreen();
    
  }, 
  function(progress) {
    const percentComplete = (progress.loaded / progress.total) * 100;
    updateLoadingProgress(`Loading ${config.name}... ${Math.round(percentComplete)}%`);
  }, 
  function(error) {
    console.error('Map loading error:', error);
    hideLoadingScreen();
    createPlaceholderGround();
  });
}

function addLighting() {
  let ambientIntensity = 1.5;
  let directionalIntensity = 1.8;
  
  if (window.currentMap === 'silenthill') {
    ambientIntensity = 0.1;
    directionalIntensity = 0.2;
  }
  
  if (ambientLight) {
    scene.remove(ambientLight);
  }
  if (directionalLight) {
    scene.remove(directionalLight);
  }
  
  ambientLight = new THREE.AmbientLight(0x606060, ambientIntensity);
  scene.add(ambientLight);
  
  directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
  directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);
}

function updateEnvironmentEffects(mapType) {
  if (mapType === 'silenthill') {
    scene.background = new THREE.Color(0x1a1a2e);
    
    if (currentModel) {
      currentModel.traverse(function(child) {
        if (child.isMesh) {
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                material.emissive = new THREE.Color(0x001133);
                material.emissiveIntensity = 0.5;
              });
            } else {
              child.material.emissive = new THREE.Color(0x001133);
              child.material.emissiveIntensity = 0.5;
            }
          }
        }
      });
    }
  } else {
    scene.background = new THREE.Color(0x87CEEB);
    
    if (currentModel) {
      currentModel.traverse(function(child) {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              material.emissive = new THREE.Color(0x000000);
              material.emissiveIntensity = 0;
            });
          } else {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }
  }
}

function createPlaceholderGround() {
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  
  for (let i = 0; i < 10; i++) {
    const buildingGeometry = new THREE.BoxGeometry(
      Math.random() * 5 + 2,
      Math.random() * 20 + 5,
      Math.random() * 5 + 2
    );
    const buildingMaterial = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(Math.random() * 0.1, 0.5, 0.7)
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(
      (Math.random() - 0.5) * 80,
      building.geometry.parameters.height / 2,
      (Math.random() - 0.5) * 80
    );
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
  }
  
  setCurrentModel(ground);
  scene.add(ground);
}

// Loading screen functions
function showLoadingScreen(text = 'Loading...') {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingText = document.getElementById('loadingText');
  if (loadingScreen && loadingText) {
    loadingText.textContent = text;
    loadingScreen.style.display = 'flex';
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

function updateLoadingProgress(text) {
  const loadingText = document.getElementById('loadingText');
  if (loadingText) {
    loadingText.textContent = text;
  }
}