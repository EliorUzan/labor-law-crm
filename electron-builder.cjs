"use strict";

module.exports = {
  appId: "com.laborlawcrm.desktop",
  productName: "Labor Law CRM",
  directories: { app: "desktop", output: "dist-desktop" },
  files: ["package.json", "main.cjs", "preload.cjs", "security.cjs", "documents.cjs", "app-info.cjs", "runtime-config.json", "!node_modules{,/**/*}"],
  asar: true,
  npmRebuild: false,
  publish: null,
  win: { target: [{ target: "nsis", arch: ["x64"] }], signAndEditExecutable: false, signExecutable: false },
  nsis: {
    artifactName: "Labor-Law-CRM-${version}-windows-${arch}-setup.${ext}",
    oneClick: false,
    differentialPackage: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    deleteAppDataOnUninstall: false,
  },
  mac: {
    target: [{ target: "zip", arch: ["arm64", "x64"] }],
    artifactName: "Labor-Law-CRM-${version}-macos-${arch}.${ext}",
    identity: null,
    notarize: false,
    hardenedRuntime: false,
    category: "public.app-category.productivity",
  },
};
