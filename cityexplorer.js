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
let stepSize = 0.5; // Distance to move per button press - smaller steps for precise movement
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
    groundLevel: 0.5,
    name: 'City',
    spawnPosition: { x: 0, y: 0.5, z: 0 },
    bgMusic: './bgm.mp3'
  },
  subway: {
    path: './subway.glb',
    scale: 1.0,
    groundLevel: 0.5,
    name: 'Subway',
    spawnPosition: { x: -10, y: 0.5, z: -10 }, // Spawn in different corner
    bgMusic: './subway.mp3'
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
  
  // Initialize raycasters for collision and ground detection
  raycaster = new THREE.Raycaster();
  groundRaycaster = new THREE.Raycaster();
  
  // Start render loop
  animate();
}

let ambientLight, directionalLight;

function addLighting() {
  // Brighter ambient light for better visibility
  ambientLight = new THREE.AmbientLight(0x606060, 1.5); // Increased brightness
  scene.add(ambientLight);
  
  // Brighter directional light simulating sunlight
  directionalLight = new THREE.DirectionalLight(0xffffff, 1.8); // Increased brightness
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
  
  // Clear existing interaction objects
  clearInteractionObjects();
  
  
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
        
        // Add solid objects to collision detection
        // You can filter by name or material if needed
        if (child.name.toLowerCase().includes('building') || 
            child.name.toLowerCase().includes('wall') ||
            child.name.toLowerCase().includes('house') ||
            child.material.name.toLowerCase().includes('building')) {
          collisionObjects.push(child);
        } else {
          // For now, add all meshes as potential collision objects
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
    
    // Hide loading screen
    hideLoadingScreen();
    
  }, 
  function(progress) {
    // Update loading progress
    const percentComplete = (progress.loaded / progress.total) * 100;
    updateLoadingProgress(`Loading ${config.name}... ${Math.round(percentComplete)}%`);
  }, 
  function(error) {
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
    // Add subway entrance very close to spawn point
    createInteractionObject('subway', 'SUBWAY', 0, 0, 3, 0x00ff00);
  } else if (mapType === 'subway') {
    // Add city exit a little back and to the left from spawn
    createInteractionObject('city', 'CITY', -12, 0, -12, 0xff0000);
  }
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


// Check for interactions
function checkInteractions() {
  const playerPos = playerPosition;
  
  interactionObjects.forEach(item => {
    const objectPos = item.object.position;
    const distance = playerPos.distanceTo(objectPos);
    
    if (distance < 3) { // Within 3 units
      // Set flag if returning to city from subway
      if (currentMap === 'subway' && item.targetMap === 'city') {
        isReturningToCity = true;
      }
      
      // Switch map
      loadMap(item.targetMap);
    }
  });
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
    
    // Only move in X and Z directions, then calculate proper Y
    const newX = playerPosition.x + forward.x * stepSize;
    const newZ = playerPosition.z + forward.z * stepSize;
    
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

// Get ground height at current position with smoothing
function getGroundHeight(x, z) {
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

// Update camera position and rotation
function updateCameraPosition() {
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
    console.log('Received data:', dataString); // Debug log
    const trimmedData = dataString.trim();
    
    // Handle mixed format (button_a_state,button_b_event)
    if (trimmedData.includes(',')) {
      const parts = trimmedData.split(',');
      if (parts.length === 2) {
        const buttonAState = parseInt(parts[0]); // Continuous state
        const buttonBEvent = parseInt(parts[1]); // Press event
        
        if (!isNaN(buttonAState) && !isNaN(buttonBEvent)) {
          // Button A state - continuous turning
          isTurning = (buttonAState === 1);
          
          // Button B event - discrete forward step
          if (buttonBEvent === 1) {
            // Play footstep sound immediately
            playFootstep();
            makeStep('forward');
            console.log('Button B pressed - Forward step');
          }
          
          return;
        }
      }
    }
    
  } catch (error) {
    console.log('Parse error:', error);
  }
}



function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Update player movement
  updatePlayerMovement();
  
  renderer.render(scene, camera);
}

// Start the application
init();