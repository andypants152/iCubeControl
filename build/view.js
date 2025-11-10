// view.js
// Manages the Three.js scene, rendering, and interactions

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const DIMENSION = 8;
const dimension = DIMENSION;

const PRIMARY_COLORS = ['#ff0000', '#00ff00', '#0000ff']; // RGB
const SECONDARY_COLORS = ['#ff00ff', '#ffff00', '#00ffff']; // CMY
const ALL_COLORS = [...PRIMARY_COLORS, ...SECONDARY_COLORS];
const DEAD_COLOR = '#000000';

let scene, camera, renderer, controls;
let spheres = [];
let voxels = createVoxelGrid();
let lifeState = createLifeStateGrid();

/**
 * Initialize Three.js scene
 */
export function initThreeJS(containerId = 'threejs-container') {
  const container = document.getElementById(containerId);

  // Create scene
  scene = new THREE.Scene();

  // Create camera
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

  // Position camera so it sees the entire dimension x dimension x dimension block
  const center = dimension / 2;
  camera.position.set(dimension * 1.5, dimension * 1.5, dimension * 1.5);
  camera.lookAt(new THREE.Vector3(center, center, center));

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  // Transparent background (0 alpha)
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;

  // Create dimension^3 spheres at integer coords
  spheres = [];
  voxels = createVoxelGrid();
  lifeState = createLifeStateGrid();
  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const sphere = new THREE.Mesh(geometry, material);

        sphere.position.set(x, y, z);
        sphere.userData = { x, y, z };
        scene.add(sphere);
        spheres.push(sphere);
        voxels[x][y][z] = sphere;
      }
    }
  }

  // Color spheres on left-click
  const colorPicker = document.querySelector('.palette');
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // left-click only

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(spheres);

    if (intersects.length > 0) {
      const hitSphere = intersects[0].object;
      const { x, y, z } = hitSphere.userData || {};
      const pickedColor = colorPicker?.value || '#ffffff';
      if (Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z)) {
        paintVoxel(x, y, z, pickedColor);
      } else {
        applyColorToSphere(hitSphere, pickedColor);
      }
    }
  });
}

/**
 * Animate loop
 */
export function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

export function paintVoxel(x, y, z, color) {
  const voxel = getVoxel(clampIndex(x), clampIndex(y), clampIndex(z));
  if (!voxel) return;
  applyColorToSphere(voxel, color);
}

export function paintLine(axis, sliceIndex, orientation = 'row', index = 0, color) {
  const normalizedAxis = normalizeAxis(axis);
  const slice = clampIndex(sliceIndex);
  const normalizedOrientation = orientation === 'column' ? 'column' : 'row';
  const lineIndex = clampIndex(index);

  for (let i = 0; i < dimension; i++) {
    const { x, y, z } = normalizedOrientation === 'row'
      ? gridToVoxel(normalizedAxis, slice, lineIndex, i)
      : gridToVoxel(normalizedAxis, slice, i, lineIndex);
    paintVoxel(x, y, z, color);
  }
}

export function paintSlice(axis, sliceIndex, color) {
  const normalizedAxis = normalizeAxis(axis);
  const slice = clampIndex(sliceIndex);

  for (let row = 0; row < dimension; row++) {
    for (let col = 0; col < dimension; col++) {
      const { x, y, z } = gridToVoxel(normalizedAxis, slice, row, col);
      paintVoxel(x, y, z, color);
    }
  }
}

export function paintCell(axis, sliceIndex, row, col, color) {
  const normalizedAxis = normalizeAxis(axis);
  const slice = clampIndex(sliceIndex);
  const rowIndex = clampIndex(row);
  const colIndex = clampIndex(col);
  const { x, y, z } = gridToVoxel(normalizedAxis, slice, rowIndex, colIndex);
  paintVoxel(x, y, z, color);
}

export function getSliceColors(axis, sliceIndex) {
  const normalizedAxis = normalizeAxis(axis);
  const slice = clampIndex(sliceIndex);
  const colors = [];

  for (let row = 0; row < dimension; row++) {
    const rowColors = [];
    for (let col = 0; col < dimension; col++) {
      const { x, y, z } = gridToVoxel(normalizedAxis, slice, row, col);
      rowColors.push(getVoxelColor(x, y, z));
    }
    colors.push(rowColors);
  }

  return colors;
}

export function clearLifeState() {
  lifeState = createLifeStateGrid();
  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        paintVoxel(x, y, z, DEAD_COLOR);
      }
    }
  }
}

export function randomizeLife(fillRatio = 0.3) {
  lifeState = createLifeStateGrid();
  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        const alive = Math.random() < fillRatio;
        if (alive) {
          const color = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
          const type = PRIMARY_COLORS.includes(color) ? 'primary' : 'secondary';
          lifeState[x][y][z] = { alive: true, age: 0, color, type };
          paintVoxel(x, y, z, color);
        } else {
          paintVoxel(x, y, z, DEAD_COLOR);
        }
      }
    }
  }
}

export function advanceLife() {
  const nextState = createLifeStateGrid();

  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        const { total, primary, secondary } = countAliveNeighbors(x, y, z);
        const current = lifeState[x][y][z];
        const survivesBase = current.alive && total >= 3 && total <= 6;
        const born = !current.alive && (total === 4 || total === 5);

        const hostileNeighbors = current.type === 'primary' ? secondary : primary;
        const hostileThreshold = current.alive ? 3 : 2;
        const hostilePressure = hostileNeighbors >= hostileThreshold;

        if (survivesBase && !hostilePressure) {
          const age = current.age + 1;
          nextState[x][y][z] = {
            alive: true,
            age,
            color: current.color,
            type: current.type
          };
          paintVoxel(x, y, z, tintByAge(current.color, age));
          continue;
        }

        if (born) {
          let type;
          if (primary > secondary) type = 'primary';
          else if (secondary > primary) type = 'secondary';
          else type = Math.random() < 0.5 ? 'primary' : 'secondary';
          const palette = type === 'primary' ? PRIMARY_COLORS : SECONDARY_COLORS;
          const color = palette[(total + x + y + z) % palette.length];
          nextState[x][y][z] = { alive: true, age: 0, color, type };
          paintVoxel(x, y, z, color);
        } else {
          nextState[x][y][z] = { alive: false, age: 0, color: DEAD_COLOR, type: null };
          if (current.alive) {
            paintVoxel(x, y, z, DEAD_COLOR);
          }
        }
      }
    }
  }

  lifeState = nextState;
}

function createVoxelGrid() {
  return Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () =>
      Array.from({ length: dimension }, () => null)
    )
  );
}

function createLifeStateGrid() {
  return Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () =>
      Array.from({ length: dimension }, () => ({ alive: false, age: 0, color: DEAD_COLOR, type: null }))
    )
  );
}

function getVoxel(x, y, z) {
  return voxels?.[x]?.[y]?.[z] || null;
}

function getVoxelColor(x, y, z) {
  const voxel = getVoxel(clampIndex(x), clampIndex(y), clampIndex(z));
  if (!voxel) return DEAD_COLOR;
  return `#${voxel.material.color.getHexString()}`;
}

function normalizeAxis(axis) {
  if (axis === 'x' || axis === 'y') {
    return axis;
  }
  return 'z';
}

function gridToVoxel(axis, sliceIndex, row, col) {
  const invertedRow = dimension - 1 - row;
  const invertedCol = dimension - 1 - col;

  if (axis === 'x') {
    return { x: sliceIndex, y: invertedRow, z: invertedCol };
  }
  if (axis === 'y') {
    return { x: invertedCol, y: sliceIndex, z: invertedRow };
  }
  return { x: col, y: invertedRow, z: sliceIndex };
}

function clampIndex(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(Math.max(Math.round(numeric), 0), dimension - 1);
}

function countAliveNeighbors(x, y, z) {
  let total = 0;
  let primary = 0;
  let secondary = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0) continue;
        if (nx >= dimension || ny >= dimension || nz >= dimension) continue;
        const neighbor = lifeState[nx][ny][nz];
        if (neighbor?.alive) {
          total++;
          if (neighbor.type === 'primary') primary++;
          else secondary++;
        }
      }
    }
  }
  return { total, primary, secondary };
}

function tintByAge(color, age) {
  const fadeFactor = Math.max(0.4, 1 - age * 0.08);
  const rgb = new THREE.Color(color);
  rgb.multiplyScalar(fadeFactor);
  return rgb.getStyle();
}

function applyColorToSphere(sphere, color) {
  if (!sphere) return;
  const normalizedColor = normalizeColor(color);
  sphere.material.color.set(normalizedColor);
  const scaleValue = isOffColor(normalizedColor) ? 1 : 2;
  sphere.scale.set(scaleValue, scaleValue, scaleValue);
}

function normalizeColor(color) {
  if (typeof color === 'string' && color.trim().length > 0) {
    return color;
  }
  return '#ffffff';
}

function isOffColor(color) {
  const normalized = color.trim().toLowerCase();
  return normalized === '#000000' || normalized === '#000' || normalized === 'black';
}
