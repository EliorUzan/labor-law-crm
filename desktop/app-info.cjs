"use strict";

function installAppInfoHandler({ ipcMain, app, crmUrl, platform = process.platform, arch = process.arch }) {
  ipcMain.handle("desktop:app-info", (event) => {
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || new URL(event.senderFrame.url).origin !== crmUrl.origin) {
      throw new Error("Unauthorized desktop information request.");
    }
    return { version: app.getVersion(), platform, arch };
  });
}

module.exports = { installAppInfoHandler };
