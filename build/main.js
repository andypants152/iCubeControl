// main.js
// Entry point that ties the serial and view logic together

import './styles.css';

// Shoelace (assuming you still want Shoelace loaded from npm)
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/shoelace.js';

// Import your serial and view modules
import {
  toggleConnection,
  sendCubeData,
  readCubeData
} from './serial.js';

import {
  initThreeJS,
  animate
} from './view.js';

// Once DOM is ready, wire up buttons and start 3D scene
document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect-btn');
  const sendButton = document.getElementById('send-btn');
  const receiveButton = document.getElementById('receive-btn');
  const dialog = document.querySelector('.dialog-overview');
  const openButton = document.getElementById('diag-btn');
  const closeButton = document.getElementById("close-btn");

  openButton.addEventListener('click', () => dialog.show());
  closeButton.addEventListener('click', () => dialog.hide());

  if (connectButton) {
    connectButton.addEventListener('click', toggleConnection);
  }
  if (sendButton) {
    sendButton.addEventListener('click', sendCubeData);
  }
  if (receiveButton) {
    receiveButton.addEventListener('click', readCubeData);
  }

  // Initialize Three.js
  initThreeJS('threejs-container');
  animate();
});
