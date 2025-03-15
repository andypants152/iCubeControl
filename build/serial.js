// serial.js
// Handles all your Web Serial logic

let port = null;
let reader = null;
let serialBuffer = "";

/**
 * Open a serial port using the Web Serial API
 */
export async function connectSerial() {
  if (!("serial" in navigator)) {
    console.error("Web Serial API not supported in this browser.");
    return false;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    console.log("Port opened!");

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    startReading();
    return true;
  } catch (error) {
    console.error("Error opening the serial port:", error);
    return false;
  }
}

/**
 * Continuously read data from the serial port
 */
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
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) connectBtn.textContent = "Connect";
  }
}

/**
 * Properly disconnect the serial port
 */
export async function disconnectSerial() {
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

/**
 * Process incoming serial data from the Web Serial API
 */
function processSerialData(data) {
  serialBuffer += data;
  const lines = serialBuffer.split("\n");
  serialBuffer = lines.pop(); // leftover partial line

  lines.forEach(line => {
    line = line.trim();
    if (line !== "") {
      const fields = line.split("\t");
      fields.forEach(field => {
        const parts = field.split(":");
        if (parts.length === 2) {
          const key = parts[0].trim();
          let value = parts[1].trim();

          // Convert "0" / "1" to boolean-like text if desired
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

/**
 * Toggle connection state for a single "Connect" button
 */
export async function toggleConnection() {
  const button = document.getElementById("connect-btn");
  if (!port) {
    // Try to connect
    const success = await connectSerial();
    if (success && button) button.textContent = "Disconnect";
    else console.log("Failed to connect.");
  } else {
    // Try to disconnect
    const success = await disconnectSerial();
    if (success && button) button.textContent = "Connect";
    else console.log("Failed to disconnect.");
  }
}

/**
 * Stub for sending data over serial
 */
export function sendCubeData() {
  console.log("Sending data...");
  // Implement data sending logic here
}

/**
 * Stub for reading data from serial
 */
export function readCubeData() {
  console.log("Reading data...");
  // Implement data reading logic here
}
