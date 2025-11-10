// main.js
// Entry point that ties the serial and view logic together

import './styles.css';

// Shoelace (assuming you still want Shoelace loaded from npm)
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
const shoelaceBaseUrl = new URL('./shoelace/', window.location.href);
setBasePath(shoelaceBaseUrl.toString());

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/shoelace.js';

// Import your serial and view modules
import {
  connectSerial,
  disconnectSerial,
  sendCubeData,
  readCubeData
} from './serial.js';

import {
  initThreeJS,
  animate,
  DIMENSION,
  paintSlice,
  paintCell,
  randomizeLife,
  advanceLife,
  clearLifeState,
  getSliceColors
} from './view.js';

// Once DOM is ready, wire up buttons and start 3D scene
document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect-btn');
  const disconnectButton = document.getElementById('disconnect-btn');
  const sendButton = document.getElementById('send-btn');
  const receiveButton = document.getElementById('receive-btn');
  const dialog = document.querySelector('.dialog-overview');
  const openButton = document.getElementById('diag-btn');
  const closeButton = document.getElementById("close-btn");

  openButton.addEventListener('click', () => dialog.show());
  closeButton.addEventListener('click', () => dialog.hide());

  // Disable the disconnect button at start since we're not connected
  disconnectButton.disabled = true;

  // When the user clicks "Connect":
  connectButton.addEventListener('click', async () => {
    const success = await connectSerial();
    if (success) {
      // Disable connect, enable disconnect
      connectButton.disabled = true;
      disconnectButton.disabled = false;
    }
  });

  // When the user clicks "Disconnect":
  disconnectButton.addEventListener('click', async () => {
    const success = await disconnectSerial();
    if (success) {
      // Re-enable connect, disable disconnect
      connectButton.disabled = false;
      disconnectButton.disabled = true;
    }
  });
  
  if (sendButton) {
    sendButton.addEventListener('click', sendCubeData);
  }
  if (receiveButton) {
    receiveButton.addEventListener('click', readCubeData);
  }

  setupSliceEditor();
  setupLifeControls();

  // Initialize Three.js
  initThreeJS('threejs-container');
  animate();
});

let sliceGridUpdater = null;

function setupSliceEditor() {
  const gridContainer = document.getElementById('slice-grid');
  const axisControl = document.getElementById('slice-axis');
  const sliceControl = document.getElementById('slice-layer');
  const modeSelect = document.getElementById('paint-mode');
  const fillButton = document.getElementById('fill-slice');
  const clearButton = document.getElementById('clear-slice');
  const palette = document.querySelector('.palette');

  if (!gridContainer || !axisControl || !sliceControl || !modeSelect || !palette) {
    return;
  }

  gridContainer.innerHTML = '';
  const cells = Array.from({ length: DIMENSION }, () => Array(DIMENSION).fill(null));
  let highlightedCells = [];

  for (let row = 0; row < DIMENSION; row++) {
    for (let col = 0; col < DIMENSION; col++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'slice-cell';
      cell.dataset.row = row.toString();
      cell.dataset.col = col.toString();
      cell.addEventListener('pointerdown', () => handleCellPaint(row, col));
      gridContainer.appendChild(cell);
      cells[row][col] = cell;
    }
  }

  fillButton?.addEventListener('click', () => {
    paintSlice(getAxis(), getSliceIndex(), getColor());
    clearHighlights();
    applySliceColors();
  });

  clearButton?.addEventListener('click', () => {
    paintSlice(getAxis(), getSliceIndex(), '#000000');
    clearHighlights();
    applySliceColors();
  });

  axisControl.addEventListener('sl-change', () => {
    clearHighlights();
    applySliceColors();
  });

  sliceControl.addEventListener('sl-change', () => {
    clearHighlights();
    applySliceColors();
  });

  function handleCellPaint(row, col) {
    paintCell(getAxis(), getSliceIndex(), row, col, getColor());
    setHighlight(row, col);
    applySliceColors();
  }

  function getAxis() {
    const selected = axisControl.value || 'z';
    if (selected === 'x') return 'y';
    if (selected === 'y') return 'x';
    return 'z';
  }

  function getSliceIndex() {
    return Number(sliceControl.value || 0);
  }

  function getColor() {
    return palette.value || '#ffffff';
  }

  function clearHighlights() {
    highlightedCells.forEach((cell) => cell.classList.remove('is-active'));
    highlightedCells = [];
  }

  function setHighlight(row, col) {
    clearHighlights();
    const clampedRow = Math.min(Math.max(row, 0), DIMENSION - 1);
    const clampedCol = Math.min(Math.max(col, 0), DIMENSION - 1);
    const cell = cells[clampedRow]?.[clampedCol];
    if (cell) {
      cell.classList.add('is-active');
      highlightedCells.push(cell);
    }
  }

  function applySliceColors() {
    const colors = getSliceColors(getAxis(), getSliceIndex());
    colors.forEach((rowColors, row) => {
      rowColors.forEach((hex, col) => {
        const cell = cells[row]?.[col];
        if (!cell) return;
        setCellColor(cell, hex);
      });
    });
  }

  function setCellColor(cell, hex) {
    const normalized = typeof hex === 'string' ? hex.toLowerCase() : '#000000';
    if (normalized === '#000000' || normalized === '#000') {
      cell.style.background = 'rgba(255, 255, 255, 0.05)';
      cell.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      return;
    }
    cell.style.background = hex;
    cell.style.borderColor = hex;
  }

  sliceGridUpdater = applySliceColors;
  applySliceColors();
}

const LIFE_INTERVAL_MS = 750;
let lifeTimer = null;

function setupLifeControls() {
  const toggleBtn = document.getElementById('life-toggle');
  const stepBtn = document.getElementById('life-step');
  const randomBtn = document.getElementById('life-random');
  const clearBtn = document.getElementById('life-clear');

  if (!toggleBtn || !stepBtn || !randomBtn || !clearBtn) {
    return;
  }

  toggleBtn.addEventListener('click', () => {
    if (lifeTimer) {
      stopLifeAnimation();
    } else {
      startLifeAnimation();
    }
  });

  stepBtn.addEventListener('click', () => {
    stopLifeAnimation();
    advanceLife();
    sliceGridUpdater?.();
  });

  randomBtn.addEventListener('click', () => {
    randomizeLife(0.32);
    sliceGridUpdater?.();
  });

  clearBtn.addEventListener('click', () => {
    stopLifeAnimation();
    clearLifeState();
    sliceGridUpdater?.();
  });
}

function startLifeAnimation() {
  if (lifeTimer) return;
  lifeTimer = window.setInterval(() => {
    advanceLife();
    sliceGridUpdater?.();
  }, LIFE_INTERVAL_MS);
  updateLifeToggleLabel(true);
}

function stopLifeAnimation() {
  if (!lifeTimer) return;
  window.clearInterval(lifeTimer);
  lifeTimer = null;
  updateLifeToggleLabel(false);
}

function updateLifeToggleLabel(isRunning) {
  const toggleBtn = document.getElementById('life-toggle');
  if (!toggleBtn) return;
  toggleBtn.textContent = isRunning ? 'Pause Life' : 'Start Life';
}
