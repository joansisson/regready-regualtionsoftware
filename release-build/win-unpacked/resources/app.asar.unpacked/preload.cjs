"use strict";

// No-op preload.
// Electron loads this file with `contextIsolation: true` and `nodeIntegration: false`.
// The renderer currently does not require any IPC bridges, but we still need a valid
// (non-empty) preload script in packaged builds.

module.exports = {};
