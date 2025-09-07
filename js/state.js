// Global state management
import * as THREE from 'three';
import { INITIAL_PLAYER_STATE } from './config.js';

// Core Three.js objects
export let scene, camera, renderer, currentModel;

// Serial communication
export let port, reader;
export let isConnected = false;

// Audio system
export let footstepAudio;
export let bgmAudio;
export let currentBgMusic = null;
export let audioContext;
export let audioInitialized = false;

// Player movement state
export let playerPosition = INITIAL_PLAYER_STATE.position.clone();
export let playerRotation = INITIAL_PLAYER_STATE.rotation;
export let isMovingForward = false;
export let isTurning = false;

// Camera bobbing
export let bobOffset = 0;

// Map state
export let currentMap = 'city';
export let interactionObjects = [];
export let originalCitySpawn = null;
export let isReturningToCity = false;

// Item system
export let itemObjects = [];
export let hasGun = false;
export let hasKnife = false;
export let currentWeapon = 'none'; 
export let availableWeapons = [];
export let fpsOverlay = null;
export let fpsOverlayActive = false;
export let fpsOverlayMixer = null;
export let fpsOverlayAnimations = [];
export let isRecoiling = false;
export let isReloading = false;
export let recoilOffset = 0;

// Animation system
export let animationMixers = [];
export let clock = new THREE.Clock();

// Tank system
export let tankMode = false;
export let tankModel = null;
export let tankMixer = null;
export let tankPosition = new THREE.Vector3(0, 0, 0);
export let tankRotation = 0;
export let tankMoving = false;
export let preserveRotationOnMapLoad = false;
export let tankModeEnterTime = 0;


// Collision detection
export let raycaster = new THREE.Raycaster();
export let collisionObjects = [];
export let groundRaycaster = new THREE.Raycaster();
export let lastGroundHeight = null;

// Setters for state updates
export function setScene(newScene) { scene = newScene; }
export function setCamera(newCamera) { camera = newCamera; }
export function setRenderer(newRenderer) { renderer = newRenderer; }
export function setCurrentModel(newModel) { currentModel = newModel; }
export function setIsConnected(connected) { isConnected = connected; }
export function setAudioInitialized(initialized) { audioInitialized = initialized; }
export function setCurrentMap(map) { currentMap = map; }
export function setHasGun(hasGunValue) { hasGun = hasGunValue; }
export function setFpsOverlay(overlay) { fpsOverlay = overlay; }
export function setFpsOverlayActive(active) { fpsOverlayActive = active; }
export function setFpsOverlayMixer(mixer) { fpsOverlayMixer = mixer; }
export function setIsRecoiling(recoiling) { isRecoiling = recoiling; }
export function setIsReloading(reloading) { isReloading = reloading; }
export function setRecoilOffset(offset) { recoilOffset = offset; }
export function setLastGroundHeight(height) { lastGroundHeight = height; }
export function setPort(newPort) { port = newPort; }
export function setReader(newReader) { reader = newReader; }
export function setIsTurning(turning) { isTurning = turning; }
export function setPlayerRotation(rotation) { playerRotation = rotation; }
export function setCollisionObjects(objects) { collisionObjects = objects; }
export function setItemObjects(objects) { itemObjects = objects; }
export function setInteractionObjects(objects) { interactionObjects = objects; }
export function setHasKnife(hasKnifeValue) { hasKnife = hasKnifeValue; }
export function setCurrentWeapon(weapon) { currentWeapon = weapon; }
export function setAvailableWeapons(weapons) { availableWeapons = weapons; }

// Update available weapons based on current hasGun and hasKnife state
export function updateAvailableWeapons(includeNone = false) {
  const weapons = [];
  if (hasGun) weapons.push('gun');
  if (hasKnife) weapons.push('knife');
  if (includeNone) weapons.push('none');
  setAvailableWeapons(weapons);
  return weapons;
}

export function setTankMode(mode) { 
  tankMode = mode; 
  if (mode) {
    tankModeEnterTime = Date.now();
  }
}
export function setTankModel(model) { tankModel = model; }
export function setTankMixer(mixer) { tankMixer = mixer; }
export function setTankRotation(rotation) { tankRotation = rotation; }
export function setTankMoving(moving) { tankMoving = moving; }
export function setPreserveRotationOnMapLoad(preserve) { preserveRotationOnMapLoad = preserve; }