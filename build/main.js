// main.js

import './styles.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/shoelace.js';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const colorPicker = document.querySelector('.palette');
let camera, scene, renderer;
let controls;

let port = null;
let reader = null;

// Function to request and open the serial port.
async function connectSerial() {
  if (!("serial" in navigator)) {
    console.error("Web Serial API not supported in this browser.");
    return false;
  }

  try {
    // Request the serial port from the user.
    port = await navigator.serial.requestPort();

    // Open the port with the specified baud rate.
    await port.open({ baudRate: 115200 });
    console.log("Port opened!");

    // Create a TextDecoderStream to convert incoming bytes into text.
    const textDecoder = new TextDecoderStream();
    // Pipe the port's readable stream into the decoder.
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    // Return true immediately after opening the port
    startReading();
    return true;
  } catch (error) {
    console.error("Error opening the serial port:", error);
    return false;
  }
}

// Function to continuously read data from the serial port
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
    // Clean up on disconnect
    if (reader) {
      reader.releaseLock();
      reader = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
    // Update button state when disconnected
    document.getElementById("connect-btn").textContent = "Connect";
  }
}

// Function to properly disconnect the serial port
async function disconnectSerial() {
  if (port) {
    try {
      if (reader) {
        // Cancel the reader to allow the reading loop to exit
        await reader.cancel();
      }
      // Optionally, you could also close the port here,
      // but the finally block in startReading() will handle it.
      console.log("Port closed.");
      return true;
    } catch (error) {
      console.error("Error closing the serial port:", error);
      return false;
    }
  }
  return false;
}

// Global buffer to accumulate incoming data
let serialBuffer = "";

// Function to process serial data from the Web Serial API.
function processSerialData(data) {
  // Append the new data to our buffer.
  serialBuffer += data;

  // Split the buffer by newline characters.
  const lines = serialBuffer.split("\n");

  // The last element may be an incomplete line, so save it back to the buffer.
  serialBuffer = lines.pop();

  // Process each complete line.
  lines.forEach(line => {
    line = line.trim();
    if (line !== "") {
      // Split the line into fields based on whitespace.
      const fields = line.split("\t");
      fields.forEach(field => {
        // Each field should be in the form "KeyX:" or "SWY:" followed by the value.
        const parts = field.split(":");
        if (parts.length === 2) {
          const key = parts[0].trim();
          let value = parts[1].trim();

          // Convert "0" and "1" to boolean text if desired.
          if (value === "0" || value === "1") {
            value = (value === "1") ? "true" : "false";
          }

          // Update the corresponding DOM element if it exists.
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

// Function to toggle connection state
async function toggleConnection() {
  const button = document.getElementById("connect-btn");

  if (!port) {
    // Try to connect
    const success = await connectSerial();
    if (success) {
      button.textContent = "Disconnect";
    } else {
      console.log("Failed to connect.");
    }
  } else {
    // Try to disconnect
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
  console.log("Reading cube data...");
  // Implement data reading logic
}

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
  camera.position.set(10, 10, 10); // So we can see the grid

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  // By default:
  //  - LEFT mouse rotates
  //  - MIDDLE mouse zooms
  //  - RIGHT mouse pans

  // Create 8×8×8 small cubes
  const boxes = [];
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cube = new THREE.Mesh(geometry, material);

        // Position them around the origin in a cubic formation
        cube.position.set(
          x - 3.5,
          y - 3.5,
          z - 3.5
        );
        scene.add(cube);
        boxes.push(cube);
      }
    }
  }

  // left-click to color a cube
  // We'll do pointerdown so we can check e.button
  renderer.domElement.addEventListener('pointerdown', (e) => {
    // Only handle left click
    if (e.button !== 0) return; 

    // Convert click coords to normalized device coords
    const mouse = new THREE.Vector2(
      (e.clientX / renderer.domElement.clientWidth) * 2 - 1,
      -(e.clientY / renderer.domElement.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boxes);

    if (intersects.length > 0) {
      // Use the first object we hit
      const hitCube = intersects[0].object;
      // Use the Shoelace color picker's value as the color
      hitCube.material.color.set(colorPicker.value);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // let OrbitControls apply damping, rotation, etc.
  renderer.render(scene, camera);
}

//once everything is loaded
document.addEventListener("DOMContentLoaded", () => {

  const connectButton = document.getElementById("connect-btn");
  const disconnectButton = document.getElementById("disconnect-btn");
  const sendButton = document.getElementById('send-btn');
  const receiveButton = document.getElementById('receive-btn');

  if (connectButton) {
    connectButton.addEventListener("click", toggleConnection);
  }
  if (sendButton) {
    sendButton.addEventListener("click", sendCubeData);
  }
  if (receiveButton) {
    receiveButton.addEventListener("click", readCubeData);
  }

  initThreeJS();
  animate();
});  