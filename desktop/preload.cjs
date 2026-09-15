"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge } = require("electron");

// This is intentionally a capability handshake only. Future native operations
// must be individually validated in the main process and added deliberately.
contextBridge.exposeInMainWorld("crmDesktop", {
  getBridgeInfo: () => Promise.resolve({
    platform: "desktop",
    bridgeVersion: "0.1.0",
    canOpenLocalFiles: false,
    canRevealInFinder: false,
    canChooseLocalRoot: false,
  }),
});
