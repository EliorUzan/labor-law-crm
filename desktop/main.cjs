"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("node:path");
const { app, BrowserWindow, session, shell, ipcMain, dialog } = require("electron");
const { installDocumentHandlers } = require("./documents.cjs");
const { installAppInfoHandler } = require("./app-info.cjs");
const { isCrmNavigation, isSafeExternalUrl, resolveCrmUrl } = require("./security.cjs");

function createMainWindow(crmUrl) {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  const blockUnexpectedNavigation = (event, url) => {
    if (!isCrmNavigation(url, crmUrl)) event.preventDefault();
  };
  window.webContents.on("will-navigate", blockUnexpectedNavigation);
  window.webContents.on("will-redirect", blockUnexpectedNavigation);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url) || isCrmNavigation(url, crmUrl)) void shell.openExternal(url);
    return { action: "deny" };
  });

  void window.loadURL(crmUrl.href);
  return window;
}

app.whenReady().then(() => {
  const crmUrl = resolveCrmUrl(process.env, app.isPackaged ? require("./runtime-config.json") : null, app.isPackaged);
  installAppInfoHandler({ ipcMain, app, crmUrl });
  installDocumentHandlers({ ipcMain, dialog, shell, app, crmUrl, contextFor: async (nativeSession) => {
    const response = await nativeSession.fetch(new URL("/api/documents/desktop-context", crmUrl).href, { redirect: "error" });
    if (!response.ok) throw new Error("יש להתחבר ל-CRM ולחבר תיקיית Google Drive בהגדרות.");
    return response.json();
  } });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  createMainWindow(crmUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(crmUrl);
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
