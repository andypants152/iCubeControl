////////////////////////////////////////////////
// main.js
////////////////////////////////////////////////

import './styles.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');

// Shoelace themes
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/shoelace.js';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Grabbing the color picker (assuming .palette is the class in your HTML)
const colorPicker = document.querySelector('.palette');

// For Serial usage
let port = null;
let reader = null;

////////////////////////////////////////////////
// Web Serial Functions (unchanged)
////////////////////////////////////////////////

async function connectSerial() {
  if (!("serial" in navigator)) {
    console.error("Web Serial API not supported in this browser.");
    return false;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    console.log("Port opened!");

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    startReading();
    return true;
  } catch (error) {
    console.error("Error opening the serial port:", error);
    return false;
  }
}

async function startReading() {
  try {
    while (port && port.readable) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Stream closed");
        break;
      }
      if (value) {
        processSerialData(value);
      }
    }
  } catch (error) {
    console.error("Error reading from serial port:", error);
  } finally {
    if (reader) {
      reader.releaseLock();
      reader = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
    document.getElementById("connect-btn").textContent = "Connect";
  }
}

async function disconnectSerial() {
  if (port) {
    try {
      if (reader) {
        await reader.cancel();
      }
      console.log("Port closed.");
      return true;
    } catch (error) {
      console.error("Error closing the serial port:", error);
      return false;
    }
  }
  return false;
}

let serialBuffer = "";

function processSerialData(data) {
  serialBuffer += data;
  const lines = serialBuffer.split("\n");
  serialBuffer = lines.pop();

  lines.forEach(line => {
    line = line.trim();
    if (line !== "") {
      const fields = line.split("\t");
      fields.forEach(field => {
        const parts = field.split(":");
        if (parts.length === 2) {
          const key = parts[0].trim();
          let value = parts[1].trim();

          if (value === "0" || value === "1") {
            value = (value === "1") ? "true" : "false";
          }

          const element = document.getElementById(key);
          if (element) {
            element.textContent = value;
          } else {
            console.log(`No element found for key: ${key}`);
          }
        }
      });
    }
  });
}

async function toggleConnection() {
  const button = document.getElementById("connect-btn");
  if (!port) {
    const success = await connectSerial();
    if (success) {
      button.textContent = "Disconnect";
    } else {
      console.log("Failed to connect.");
    }
  } else {
    const success = await disconnectSerial();
    if (success) {
      button.textContent = "Connect";
    } else {
      console.log("Failed to disconnect.");
    }
  }
}

function sendCubeData() {
  console.log("Sending data...");
  // Implement data sending logic
}

function readCubeData() {
  console.log("Reading data...");
  // Implement data reading logic
}

////////////////////////////////////////////////
// Three.js Initialization
////////////////////////////////////////////////

let camera, scene, renderer, controls;

function initThreeJS() {
  const container = document.getElementById('threejs-container');

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(25, 25, 25);

  // Create renderer with alpha: true for transparency
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  // Make the background fully transparent
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;

  // Create 8×8×8 small spheres
  const spheres = [];
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        // Black spheres
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const sphere = new THREE.Mesh(geometry, material);

        sphere.position.set(x - 3.5, y - 3.5, z - 3.5);
        scene.add(sphere);
        spheres.push(sphere);
      }
    }
  }

  // Raycasting to color spheres on left-click
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // left click only

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
      hitSphere.material.color.set(colorPicker.value);
      // Optionally enlarge
      hitSphere.scale.set(2, 2, 2);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

////////////////////////////////////////////////
// DOMContentLoaded
////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", () => {
  // Button listeners
  const connectButton = document.getElementById("connect-btn");
  const sendButton = document.getElementById("send-btn");
  const receiveButton = document.getElementById("receive-btn");

  if (connectButton) connectButton.addEventListener("click", toggleConnection);
  if (sendButton) sendButton.addEventListener("click", sendCubeData);
  if (receiveButton) receiveButton.addEventListener("click", readCubeData);

  // Init 3D scene
  initThreeJS();
  animate();
});
