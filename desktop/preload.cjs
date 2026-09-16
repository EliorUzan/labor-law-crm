"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer, webUtils } = require("electron");

// Every native operation is validated in the main process. No generic filesystem
// or shell capability is exposed to the remote renderer.
contextBridge.exposeInMainWorld("crmDesktop", {
  getAppInfo: () => ipcRenderer.invoke("desktop:app-info"),
  getBridgeInfo: () => Promise.resolve({
    platform: "desktop",
    bridgeVersion: "0.2.0",
    canOpenLocalFiles: true,
    canRevealInFinder: false,
    canChooseLocalRoot: true,
  }),
  documentSettings: () => ipcRenderer.invoke("documents:settings"),
  chooseDocumentRoot: () => ipcRenderer.invoke("documents:choose-root"),
  chooseDocuments: () => ipcRenderer.invoke("documents:choose-files"),
  droppedDocuments: (files) => ipcRenderer.invoke("documents:dropped-files", files.map((file) => webUtils.getPathForFile(file))),
  openDocument: (relativePath) => ipcRenderer.invoke("documents:open", relativePath),
});
