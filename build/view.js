// view.js
// Manages the Three.js scene, rendering, and interactions

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Dimension of the sphere matrix
const dimension = 8;
// We'll store references to the scene objects here if needed
let scene, camera, renderer, controls;
let spheres = [];

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
  for (let x = 0; x < dimension; x++) {
    for (let y = 0; y < dimension; y++) {
      for (let z = 0; z < dimension; z++) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const sphere = new THREE.Mesh(geometry, material);

        sphere.position.set(x, y, z);
        scene.add(sphere);
        spheres.push(sphere);
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
      hitSphere.material.color.set(colorPicker.value || '#ffffff');
      hitSphere.scale.set(2, 2, 2);
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
