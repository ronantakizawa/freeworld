// City Explorer with Three.js and MicroBit
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, currentModel;
let port, reader;
let isConnected = false;

// Audio variables
let footstepAudio;
let bgmAudio;
let currentBgMusic = null; // Track current background music
let audioContext;
let audioInitialized = false;




// Movement variables
let playerPosition = new THREE.Vector3(0, 0.5, 0); // Even lower starting position
let playerRotation = 0; // Y-axis rotation for turning
let stepSize = 2.0; // Distance to move per button press - larger steps for gallery
let turnSpeed = 0.03; // Continuous turning speed
let isMovingForward = false;
let isTurning = false;



// Camera bobbing variables
let bobOffset = 0;
let bobSpeed = 0.1;
let bobAmount = 0.1; // Reduced from 0.3 to 0.1 for less intense motion

// Map configurations
const mapConfigs = {
  city: {
    path: './city.glb',
    scale: 1.0,
    groundLevel: 1.0,
    name: 'City',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './bgm.mp3'
  },
  subway: {
    path: './subway.glb',
    scale: 1.0,
    groundLevel: 1.0,
    name: 'Subway',
    spawnPosition: { x: 10, y: 2.0, z: -10 },
    bgMusic: './subway.mp3'
  },
  silenthill: {
    path: './city.glb', // Use city model but darker
    scale: 1.0,
    groundLevel: 2.0,
    name: 'Silent Hill',
    spawnPosition: { x: 0, y: 2.0, z: 0 },
    bgMusic: './silenthill.mp3'
  }
};

// Initialize original spawn position
function initializeOriginalSpawn() {
  if (!originalCitySpawn) {
    originalCitySpawn = {
      x: mapConfigs.city.spawnPosition.x,
      y: mapConfigs.city.spawnPosition.y,
      z: mapConfigs.city.spawnPosition.z
    };
  }
}

// Current map state
let currentMap = 'city';
let interactionObjects = [];
let originalCitySpawn = null; // Store original city spawn position
let isReturningToCity = false; // Track if returning from subway

// Item system
let itemObjects = []; // Store collectible items
let hasGun = false; // Track if player has picked up the gun
let fpsOverlay = null; // Store FPS overlay object
let fpsOverlayActive = false; // Track if FPS overlay is showing
let fpsOverlayMixer = null; // Animation mixer for FPS overlay
let fpsOverlayAnimations = []; // Store FPS overlay animations
let isRecoiling = false; // Track if recoil animation is active
let isReloading = false; // Track if reload animation is active
let recoilOffset = 0; // Store current recoil offset

// Animation system
let animationMixers = []; // Store animation mixers
let clock = new THREE.Clock(); // Clock for animation timing


// Collision detection
let raycaster = new THREE.Raycaster();
let collisionObjects = []; // Objects to check collision against
let groundRaycaster = new THREE.Raycaster(); // Separate raycaster for ground detection

// Height smoothing
let lastGroundHeight = null;
const maxHeightChange = 2; // Maximum height change allowed per step
const heightSmoothingFactor = 0.3; // How much to smooth height changes


// Initialize the 3D scene
function init() {
  // Create loading screen elements
  createLoadingScreen();
  
  // Show initial loading
  showLoadingScreen('Initializing City Explorer...');
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue background
  
  // Create camera - first person view at lower ground level
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(playerPosition);
  camera.position.y = mapConfigs[currentMap].groundLevel;
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);
  
  // Add lighting
  addLighting();
  
  // Initialize original spawn tracking
  initializeOriginalSpawn();
  
  // Load initial map (city)
  loadMap('city');
  
  
  // Initialize audio
  initAudio();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize, false);
  
  // Set up UI event listeners
  document.getElementById('startBtn').addEventListener('click', connectMicrobit);
  
  // Add spacebar event listener for FPS overlay
  document.addEventListener('keydown', handleKeyPress);
  
  
  // Initialize raycasters for collision and ground detection
  raycaster = new THREE.Raycaster();
  groundRaycaster = new THREE.Raycaster();
  
  // Start render loop
  animate();
}

let ambientLight, directionalLight;

function addLighting() {
  // Adjust lighting based on current map
  let ambientIntensity = 1.5;
  let directionalIntensity = 1.8;
  
  // Darker lighting for silent hill
  if (currentMap === 'silenthill') {
    ambientIntensity = 0.1; // Much darker ambient light for silent hill
    directionalIntensity = 0.2; // Much darker directional light for silent hill
  }
  
  // Remove existing lights if present
  if (ambientLight) {
    scene.remove(ambientLight);
  }
  if (directionalLight) {
    scene.remove(directionalLight);
  }
  
  // Ambient light for visibility
  ambientLight = new THREE.AmbientLight(0x606060, ambientIntensity);
  scene.add(ambientLight);
  
  // Directional light simulating sunlight
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

// Update environment effects for different maps
function updateEnvironmentEffects(mapType) {
  if (mapType === 'silenthill') {
    // Dark, ominous sky for Silent Hill
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Add dark blue glow to buildings
    if (currentModel) {
      currentModel.traverse(function(child) {
        if (child.isMesh) {
          // Add emissive dark blue glow to building materials
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
    // Default sky blue background for other maps
    scene.background = new THREE.Color(0x87CEEB);
    
    // Remove glow effects from buildings
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

function loadMap(mapType) {
  const loader = new GLTFLoader();
  const config = mapConfigs[mapType];
  
  // Show loading screen
  showLoadingScreen(`Loading ${config.name}...`);
  
  // Remove existing model if present
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  
  // Clear existing interaction objects and items
  clearInteractionObjects();
  clearItemObjects();
  
  loader.load(config.path, function(gltf) {
    currentModel = gltf.scene;
    
    // Scale and position the model
    const scale = config.scale;
    currentModel.scale.set(scale, scale, scale);
    currentModel.position.set(0, 0, 0);
    
    // Enable shadows and collect collision objects
    collisionObjects = []; // Clear previous collision objects
    currentModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Fix material uniforms issues by replacing problematic materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              if (material.uniforms || material.type === 'ShaderMaterial') {
                // Replace shader materials with standard materials to avoid uniforms issues
                return new THREE.MeshLambertMaterial({ 
                  color: material.color || 0x888888,
                  map: material.map || null
                });
              }
              return material;
            });
          } else if (child.material.uniforms || child.material.type === 'ShaderMaterial') {
            // Replace shader materials with standard materials to avoid uniforms issues
            child.material = new THREE.MeshLambertMaterial({ 
              color: child.material.color || 0x888888,
              map: child.material.map || null
            });
          }
        }
        
        // Add solid objects to collision detection
        if (child.name.toLowerCase().includes('building') || 
            child.name.toLowerCase().includes('wall') ||
            child.name.toLowerCase().includes('house') ||
            child.name.toLowerCase().includes('floor') ||
            child.name.toLowerCase().includes('ground') ||
            (child.material && child.material.name && child.material.name.toLowerCase().includes('building'))) {
          collisionObjects.push(child);
        } else {
          // For city/subway/silenthill/house, add all meshes as potential collision objects
          collisionObjects.push(child);
        }
      }
    });
    
    scene.add(currentModel);
    currentMap = mapType;
    
    // Determine spawn position based on map and context
    let spawnX, spawnZ;
    
    if (mapType === 'city' && isReturningToCity && originalCitySpawn) {
      // Returning to city from subway - use original spawn position
      spawnX = originalCitySpawn.x;
      spawnZ = originalCitySpawn.z;
      isReturningToCity = false; // Reset flag
    } else {
      // Normal spawn (first time or entering subway)
      spawnX = config.spawnPosition.x;
      spawnZ = config.spawnPosition.z;
    }
    
    // Update player spawn position with proper ground height detection
    playerPosition.set(spawnX, config.groundLevel, spawnZ);
    // Reset height tracking for new map
    lastGroundHeight = null;
    // Get actual ground height at spawn position
    const spawnGroundHeight = getGroundHeight(spawnX, spawnZ);
    playerPosition.y = spawnGroundHeight;
    updateCameraPosition();
    
    // Switch background music
    switchBackgroundMusic(config.bgMusic);
    
    // Add appropriate interaction objects
    addInteractionObjects(mapType);
    
    // Add items to the map
    addItemsToMap(mapType);
    
    // Update lighting for the new map
    addLighting();
    
    // Update sky color and building effects for the new map
    updateEnvironmentEffects(mapType);
    
    // Hide loading screen
    hideLoadingScreen();
    
  }, 
  function(progress) {
    // Update loading progress
    const percentComplete = (progress.loaded / progress.total) * 100;
    updateLoadingProgress(`Loading ${config.name}... ${Math.round(percentComplete)}%`);
  }, 
  function(error) {
    console.error('Model loading error:', error);
    hideLoadingScreen();
    // Create a simple placeholder ground if model fails to load
    createPlaceholderGround();
  });
}


function createPlaceholderGround() {
  // Create a simple ground plane if model fails to load
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  
  // Add some simple buildings
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
  
  currentModel = ground;
  scene.add(ground);
}

// Create interaction objects
function addInteractionObjects(mapType) {
  if (mapType === 'city') {
    // Add subway entrance much further from spawn point
    createInteractionObject('subway', 'SUBWAY', 0, 0, 10, 0x00ff00);
    // Add silent hill entrance much further to the right
    createInteractionObject('silenthill', 'SILENT HILL', 10, 0, 0, 0x330033);
  } else if (mapType === 'subway') {
    // Add city exit a little back and to the left from spawn
    createInteractionObject('city', 'CITY', -12, 0, -12, 0xff0000);
  } else if (mapType === 'silenthill') {
    // Add city exit to return to city
    createInteractionObject('city', 'CITY', 0, 0, 5, 0xff0000);
  }
}

// Add items to specific maps
function addItemsToMap(mapType) {
  if (mapType === 'city') {
    // Add Glock item near Silent Hill portal (Silent Hill is at 10, 0, 0)
    loadItem('./glock.glb', 0, -1, -4, 4.0); // Much bigger scale and lower to ground
  }
  // Add more items for other maps as needed
}

// Create an interactive object
function createInteractionObject(targetMap, label, x, y, z, color) {
  // Create the object geometry (smaller size)
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
  const labelGeometry = new THREE.PlaneGeometry(2, 1); // Smaller sign
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
  labelMesh.position.set(x, y + 2, z); // Much lower - only 2 units above ground
  labelMesh.lookAt(camera.position);
  
  // Store interaction data
  object.userData = { type: 'interaction', targetMap: targetMap, label: label };
  
  scene.add(object);
  scene.add(labelMesh);
  
  interactionObjects.push({ object: object, label: labelMesh, targetMap: targetMap });
}

// Clear interaction objects
function clearInteractionObjects() {
  interactionObjects.forEach(item => {
    scene.remove(item.object);
    scene.remove(item.label);
  });
  interactionObjects = [];
}

// Clear item objects
function clearItemObjects() {
  itemObjects.forEach(item => {
    scene.remove(item.object);
  });
  itemObjects = [];
}

// Load and place an item in the scene
function loadItem(itemPath, x, y, z, scale = 1.0) {
  const loader = new GLTFLoader();
  
  loader.load(itemPath, function(gltf) {
    const itemModel = gltf.scene;
    
    // Scale and position the item
    itemModel.scale.set(scale, scale, scale);
    itemModel.position.set(x, y, z);
    
    // Check for animations in the GLB file
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      // Create animation mixer
      mixer = new THREE.AnimationMixer(itemModel);
      
      // Play all animations in the file
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      
      // Store mixer for updating
      animationMixers.push(mixer);
      console.log(`Loaded ${gltf.animations.length} animations for item`);
    }
    
    // Fix material issues like we do for maps
    itemModel.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Fix material uniforms issues
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
    
    // Store item data
    itemModel.userData = { type: 'item', itemType: 'glock' };
    
    scene.add(itemModel);
    itemObjects.push({ object: itemModel, itemType: 'glock', mixer: mixer });
    
  }, undefined, function(error) {
    // Item failed to load, continue without it
  });
}


// Check for interactions
function checkInteractions() {
  const playerPos = playerPosition;
  
  // Check map transitions
  interactionObjects.forEach(item => {
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 2.0) { // Within 2 units 
      // Set flag if returning to city from subway
      if (currentMap === 'subway' && item.targetMap === 'city') {
        isReturningToCity = true;
      }
      
      // Switch map
      loadMap(item.targetMap);
    }
  });
  
  // Check item interactions
  for (let i = itemObjects.length - 1; i >= 0; i--) {
    const item = itemObjects[i];
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 3.0) { // Increased distance to 3 units to pick up item
      // Remove item from scene
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
      
      // Remove from itemObjects array
      itemObjects.splice(i, 1);
      
      // Set gun pickup state
      hasGun = true;
      
      // Play reload sound
      playReloadSound();
      
      console.log('Glock picked up!');
    }
  }
}

// Loading screen functions
function createLoadingScreen() {
  // Create loading overlay
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingScreen';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: black;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
    color: white;
  `;
  
  // Add loading text
  const loadingText = document.createElement('div');
  loadingText.id = 'loadingText';
  loadingText.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
  `;
  loadingText.textContent = 'Loading...';
  
  // Add loading spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;
  
  // Add CSS animation for spinner
  if (!document.getElementById('spinnerStyle')) {
    const style = document.createElement('style');
    style.id = 'spinnerStyle';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  loadingDiv.appendChild(loadingText);
  loadingDiv.appendChild(spinner);
  document.body.appendChild(loadingDiv);
}

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

// Check for collisions in a given direction
function checkCollision(direction) {
  // Set raycaster from player position in the movement direction
  raycaster.set(playerPosition, direction.normalize());
  
  // Check for intersections with collision objects
  const intersects = raycaster.intersectObjects(collisionObjects, true);
  
  // Return true if there's a collision within movement distance
  return intersects.length > 0 && intersects[0].distance < stepSize + 0.5; // Add small buffer
}

// Initialize audio system
function initAudio() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create audio element for footsteps
    footstepAudio = new Audio('./footstep.mp3');
    footstepAudio.volume = 0.5; // Set comfortable volume
    footstepAudio.preload = 'auto';
    
    
    
    
    // Don't create bgmAudio here - we'll create it dynamically per map
    
    // Enable user interaction to unlock audio
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    
  } catch (error) {
  }
}

// Unlock audio context (required for web audio)
function unlockAudio() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      audioInitialized = true;
      startBackgroundMusic();
    });
  } else {
    audioInitialized = true;
    startBackgroundMusic();
  }
}

// Start background music
function startBackgroundMusic() {
  // Start with the city music initially
  switchBackgroundMusic(mapConfigs[currentMap].bgMusic);
}

// Switch background music
function switchBackgroundMusic(musicPath) {
  if (!audioInitialized) return;
  
  try {
    // Stop and cleanup current music if playing
    if (currentBgMusic) {
      currentBgMusic.pause();
      currentBgMusic.currentTime = 0; // Reset to beginning
      currentBgMusic.src = ''; // Clear source
      currentBgMusic = null;
    }
    
    // Stop the old bgmAudio if it exists
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
    
    // If musicPath is null, don't play any music (for gallery)
    if (musicPath === null) {
      return;
    }
    
    // Create new audio for the requested music
    currentBgMusic = new Audio(musicPath);
    currentBgMusic.volume = 0.3;
    currentBgMusic.loop = true;
    currentBgMusic.preload = 'auto';
    
    // Play the new music
    currentBgMusic.play().catch(error => {
    });
    
  } catch (error) {
  }
}


// Play footstep sound
function playFootstep() {
  if (footstepAudio && audioInitialized) {
    try {
      // Clone the audio for immediate playback without resetting
      const audioClone = footstepAudio.cloneNode();
      audioClone.volume = footstepAudio.volume;
      audioClone.play().catch(error => {
        });
    } catch (error) {
    }
  }
}

// Play reload sound
function playReloadSound() {
  if (audioInitialized) {
    try {
      const reloadAudio = new Audio('./reload.mp3');
      reloadAudio.volume = 0.7;
      reloadAudio.play().catch(error => {
      });
    } catch (error) {
    }
  }
}

// Play shot sound
function playShotSound() {
  if (audioInitialized) {
    try {
      const shotAudio = new Audio('./shot.mp3');
      shotAudio.volume = 0.8;
      shotAudio.play().catch(error => {
      });
    } catch (error) {
    }
  }
}

// Handle key press events
function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault(); // Prevent page scrolling
    
    if (hasGun) {
      toggleFPSOverlay();
    }
  } else if (event.code === 'KeyZ') {
    event.preventDefault();
    
    if (hasGun && fpsOverlayActive && fpsOverlay) {
      shootRecoil(); // Simple recoil animation
    }
  } else if (event.code === 'KeyX') {
    event.preventDefault();
    
    if (hasGun && fpsOverlayActive && fpsOverlay) {
      playReloadAnimation(); // GLB animation
    }
  }
}

// Play last second of animation (Z key)
function shootRecoil() {
  // Don't allow Z animation if X animation is playing
  if (isReloading) {
    return;
  }
  
  // Play shot sound
  playShotSound();
  
  // Play last second of GLB animation if available
  if (fpsOverlay && fpsOverlayMixer && fpsOverlayAnimations.length > 0 && !isRecoiling) {
    isRecoiling = true;
    
    // Stop any currently playing actions
    fpsOverlayMixer.stopAllAction();
    
    // Get the animation
    const animation = fpsOverlayAnimations[0];
    const action = fpsOverlayMixer.clipAction(animation);
    
    // Calculate last second timing
    const animationDuration = animation.duration;
    const lastSecondStart = Math.max(0, animationDuration - 1); // Start 1 second before end
    
    // Set up action to play only the last second
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.reset();
    
    // Set time range for last second
    action.time = lastSecondStart; // Start at beginning of last second
    action.setEffectiveTimeScale(1); // Normal speed
    action.play();
    
    // Stop after 1 second
    setTimeout(() => {
      action.stop();
      isRecoiling = false;
    }, 1000);
    
    console.log(`Playing last second of animation: ${animation.name} (${lastSecondStart}s - ${animationDuration}s)`);
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
        recoilOffset = recoilAmount * recoilProgress;
      } else {
        const returnProgress = (progress - 0.5) * 2;
        recoilOffset = recoilAmount - (recoilAmount * returnProgress);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateRecoil);
      } else {
        recoilOffset = 0;
        isRecoiling = false;
      }
    }
    
    if (!isRecoiling) {
      isRecoiling = true;
      animateRecoil();
    }
  }
}

// Play first 2 seconds of animation (X key)
function playReloadAnimation() {
  // Play reload sound
  playReloadSound();
  
  // Play first 2 seconds of GLB animation if available
  if (fpsOverlay && fpsOverlayMixer && fpsOverlayAnimations.length > 0 && !isRecoiling && !isReloading) {
    isRecoiling = true;
    isReloading = true; // Set reload flag to block Z key
    
    // Stop any currently playing actions
    fpsOverlayMixer.stopAllAction();
    
    // Get the animation
    const animation = fpsOverlayAnimations[0];
    const action = fpsOverlayMixer.clipAction(animation);
    
    // Calculate first 2 seconds (or full animation if shorter)
    const animationDuration = animation.duration;
    const playDuration = Math.min(2, animationDuration); // Play up to 2 seconds
    
    // Set up action to play only the first 2 seconds
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.reset(); // Start from beginning
    action.play();
    
    // Stop after 2 seconds (or animation duration if shorter)
    setTimeout(() => {
      action.stop();
      isRecoiling = false;
      isReloading = false; // Reset reload flag
    }, playDuration * 1000);
    
    console.log(`Playing first ${playDuration} seconds of animation: ${animation.name} (0s - ${playDuration}s)`);
  }
}

// Toggle FPS overlay
function toggleFPSOverlay() {
  if (fpsOverlayActive) {
    // Hide FPS overlay
    if (fpsOverlay) {
      scene.remove(fpsOverlay);
      fpsOverlay = null;
    }
    // Clean up mixer and animations
    if (fpsOverlayMixer) {
      fpsOverlayMixer.stopAllAction();
      fpsOverlayMixer = null;
    }
    fpsOverlayAnimations = [];
    isRecoiling = false;
    isReloading = false;
    fpsOverlayActive = false;
  } else {
    // Show FPS overlay
    loadFPSOverlay();
    fpsOverlayActive = true;
  }
}

// Load and display FPS overlay
function loadFPSOverlay() {
  const loader = new GLTFLoader();
  
  loader.load('./fps.glb', function(gltf) {
    fpsOverlay = gltf.scene;
    
    // Position the FPS overlay to overlap the screen view
    fpsOverlay.position.set(0, 2, -0.3); // Lower and closer to camera
    fpsOverlay.scale.set(0.01, 0.001, -0.01); // Much smaller scale
    
    // Set up animations if they exist
    if (gltf.animations && gltf.animations.length > 0) {
      fpsOverlayMixer = new THREE.AnimationMixer(fpsOverlay);
      fpsOverlayAnimations = gltf.animations; // Store animations for later use
      console.log(`FPS overlay has ${gltf.animations.length} animations available`);
      
      // Don't play animations automatically - we'll trigger them on Z press
      gltf.animations.forEach((clip, index) => {
        console.log(`Animation ${index}: ${clip.name}, Duration: ${clip.duration}s`);
      });
    }
    
    // Fix material issues and make sure it renders on top
    fpsOverlay.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.renderOrder = 999; // Render on top of everything
        
        // Fix material uniforms issues
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(material => {
              const newMaterial = new THREE.MeshBasicMaterial({ 
                color: material.color || 0x888888,
                map: material.map || null,
                transparent: material.transparent || false,
                opacity: material.opacity || 1.0
              });
              newMaterial.depthTest = false; // Always render on top
              return newMaterial;
            });
          } else {
            const newMaterial = new THREE.MeshBasicMaterial({ 
              color: child.material.color || 0x888888,
              map: child.material.map || null,
              transparent: child.material.transparent || false,
              opacity: child.material.opacity || 1.0
            });
            newMaterial.depthTest = false; // Always render on top
            child.material = newMaterial;
          }
        }
      }
    });
    
    // Add directly to scene instead of camera for better control
    scene.add(fpsOverlay);
    
    // Position it relative to camera position and rotation
    updateFPSOverlayPosition();
    
    console.log('FPS overlay loaded and added to scene');
    
  }, undefined, function(error) {
    console.error('FPS overlay failed to load:', error);
  });
}

// Update FPS overlay position to stay in front of camera
function updateFPSOverlayPosition() {
  if (fpsOverlay && fpsOverlayActive) {
    // Get camera forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    
    // Get camera down direction for lowering the overlay
    const down = new THREE.Vector3(0, -1, 0);
    down.applyQuaternion(camera.quaternion);
    
    // Get camera up direction for recoil
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(camera.quaternion);
    
    // Position overlay in front of camera
    fpsOverlay.position.copy(camera.position);
    fpsOverlay.position.add(forward.multiplyScalar(0.3)); // Closer to camera
    fpsOverlay.position.add(down.multiplyScalar(0.2)); // Lower position
    fpsOverlay.position.add(up.multiplyScalar(recoilOffset)); // Add recoil offset
    
    // Match camera rotation
    fpsOverlay.rotation.copy(camera.rotation);
  }
}

// Make a discrete movement step
function makeStep(action) {
  if (action === 'forward') {
    const forward = new THREE.Vector3(
      -Math.sin(playerRotation),
      0,
      -Math.cos(playerRotation)
    );
    
    // Check for collision before moving
    if (checkCollision(forward)) {
      return; // Don't move if there's a collision
    }
    
    // Use regular step size for all maps
    let currentStepSize = stepSize;
    
    // Only move in X and Z directions, then calculate proper Y
    const newX = playerPosition.x + forward.x * currentStepSize;
    const newZ = playerPosition.z + forward.z * currentStepSize;
    
    // Update X and Z position first
    playerPosition.set(newX, playerPosition.y, newZ);
    
    // Then get the correct ground height for the new position
    const correctHeight = getGroundHeight(newX, newZ);
    playerPosition.y = correctHeight;
    
    // Trigger camera bobbing animation for walking
    triggerWalkBob();
    
    // Check for interactions after moving
    checkInteractions();
  }
  
  // Update camera immediately after each step
  updateCameraPosition();
}

// Trigger walking bob animation
function triggerWalkBob() {
  // Get current ground height for bobbing animation
  const currentGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
  const bobHeight = bobAmount * 0.5; // Reduced dip - only go half as deep
  const duration = 400; // Slightly longer duration for smoother motion
  const startTime = Date.now();
  
  function animateBob() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Create a gentler sine wave that doesn't go as low
    const bobValue = Math.abs(Math.sin(progress * Math.PI)) * bobHeight; // Use abs() to prevent going below start
    camera.position.y = currentGroundHeight + bobValue; // Always relative to current ground height
    
    if (progress < 1) {
      requestAnimationFrame(animateBob);
    } else {
      // Ensure camera returns to actual ground height
      const finalGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
      camera.position.y = finalGroundHeight;
      playerPosition.y = finalGroundHeight;
    }
  }
  
  animateBob();
}


// Update camera position and rotation
function updateCameraPosition() {
  // Normal ground movement
  // Get the actual ground height at the player's position
  const actualGroundHeight = getGroundHeight(playerPosition.x, playerPosition.z);
  playerPosition.y = actualGroundHeight;
  
  // Update camera position and rotation with terrain-following height
  camera.position.set(playerPosition.x, actualGroundHeight, playerPosition.z);
  camera.rotation.y = playerRotation;
  
  // Slight upward tilt for more natural viewing angle
  camera.rotation.x = 0;
}

// Handle continuous turning and any ongoing animations
function updatePlayerMovement() {
  // Handle continuous turning when Button A is held
  if (isTurning) {
    playerRotation += turnSpeed;
    
    // Normalize rotation
    if (playerRotation > Math.PI * 2) {
      playerRotation -= Math.PI * 2;
    } else if (playerRotation < 0) {
      playerRotation += Math.PI * 2;
    }
    
    // Update camera rotation during turning
    camera.rotation.y = playerRotation;
  }
}

// Get ground height at current position with smoothing
function getGroundHeight(x, z) {
  // For subway, use fixed ground level to prevent terrain following
  if (currentMap === 'subway') {
    return mapConfigs[currentMap].groundLevel;
  }
  
  // Cast a ray downward from high above to find the ground
  const rayOrigin = new THREE.Vector3(x, 100, z); // Start high above
  const rayDirection = new THREE.Vector3(0, -1, 0); // Point straight down
  
  groundRaycaster.set(rayOrigin, rayDirection);
  const intersects = groundRaycaster.intersectObjects(collisionObjects, true);
  
  let newHeight;
  
  if (intersects.length > 0) {
    // Get the height of the first (highest) intersection plus offset
    newHeight = intersects[0].point.y + 0.5;
  } else {
    // Fallback to default ground level if no ground found
    newHeight = mapConfigs[currentMap].groundLevel;
  }
  
  // Initialize last height if this is the first call
  if (lastGroundHeight === null) {
    lastGroundHeight = newHeight;
    return newHeight;
  }
  
  // Validate height change - prevent extreme jumps
  const heightDifference = Math.abs(newHeight - lastGroundHeight);
  
  if (heightDifference > maxHeightChange) {
    // If the change is too extreme, use the previous height or limit the change
    if (newHeight > lastGroundHeight) {
      // Going up - limit to max change
      newHeight = lastGroundHeight + maxHeightChange;
    } else {
      // Going down - limit to max change
      newHeight = lastGroundHeight - maxHeightChange;
    }
  }
  
  // Apply smoothing to the height change
  const smoothedHeight = lastGroundHeight + (newHeight - lastGroundHeight) * heightSmoothingFactor;
  
  // Update last height for next call
  lastGroundHeight = smoothedHeight;
  
  return smoothedHeight;
}






async function connectMicrobit() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ 
      baudRate: 115200,
      bufferSize: 64
    });
    
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();
    
    isConnected = true;
    document.getElementById('startBtn').textContent = 'Disconnect';
    document.getElementById('startBtn').onclick = disconnectMicrobit;
    
    readSerialData();
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

function disconnectMicrobit() {
  if (reader) {
    reader.releaseLock();
  }
  if (port) {
    port.close();
  }
  isConnected = false;
  document.getElementById('startBtn').textContent = 'Connect MicroBit';
  document.getElementById('startBtn').onclick = connectMicrobit;
}

async function readSerialData() {
  try {
    while (isConnected) {
      const { value, done } = await reader.read();
      if (done) break;
      
      // Process microbit data (buttons and angle)
      const lines = value.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          parseMicrobitData(trimmedLine);
        }
      }
    }
  } catch (error) {
    console.error('Reading error:', error);
    isConnected = false;
  }
}

function parseMicrobitData(dataString) {
  try {
    const trimmedData = dataString.trim();
    
    // Handle mixed format (button_a_state,button_b_event)
    if (trimmedData.includes(',')) {
      const parts = trimmedData.split(',');
      if (parts.length === 2) {
        const buttonAState = parseInt(parts[0]); // Continuous state
        const buttonBEvent = parseInt(parts[1]); // Press event
        
        if (!isNaN(buttonAState) && !isNaN(buttonBEvent)) {
          // Normal ground movement
          // Button A state - continuous turning
          isTurning = (buttonAState === 1);
          
          // Button B event - discrete forward step
          if (buttonBEvent === 1) {
            // Play footstep sound immediately
            playFootstep();
            makeStep('forward');
          }
          
          return;
        }
      }
    }
    
  } catch (error) {
  }
}










// Rotate items continuously (only if no GLB animation)
function rotateItems() {
  itemObjects.forEach(item => {
    if (item.itemType === 'glock' && !item.mixer) {
      // Only rotate if no GLB animation is playing
      // Rotate around Y-axis at a constant speed
      item.object.rotation.y += 0.02; // Adjust speed as needed
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Update animations
  const delta = clock.getDelta();
  animationMixers.forEach(mixer => mixer.update(delta));
  
  // Update FPS overlay animations
  if (fpsOverlayMixer) {
    fpsOverlayMixer.update(delta);
  }
  
  // Update player movement
  updatePlayerMovement();
  
  // Update FPS overlay position if active
  updateFPSOverlayPosition();
  
  // Rotate Glock items (only if no GLB animation)
  rotateItems();
  
  renderer.render(scene, camera);
}

// Start the application
init();