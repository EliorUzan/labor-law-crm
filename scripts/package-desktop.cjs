"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { build, Platform } = require("electron-builder");
const { isApprovedCrmUrl } = require("../desktop/security.cjs");
const config = require("../electron-builder.cjs");

async function main() {
  const target = process.argv[2];
  if (!["win", "mac", "dir"].includes(target)) throw new Error("Choose win, mac, or dir.");
  const crmUrl = process.env.CRM_DESKTOP_URL;
  if (!isApprovedCrmUrl(crmUrl, false)) throw new Error("Set CRM_DESKTOP_URL to the production HTTPS CRM URL before packaging.");
  const url = new URL(crmUrl);
  if (url.pathname !== "/" || url.search || url.hash) throw new Error("CRM_DESKTOP_URL must be an origin without a path, query, or fragment.");
  const { version } = require("../desktop/package.json");
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error("Desktop releases require a stable major.minor.patch version.");
  fs.writeFileSync(path.join(__dirname, "../desktop/runtime-config.json"), JSON.stringify({ crmUrl: url.origin }, null, 2) + "\n");
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  const platform = target === "mac" ? Platform.MAC : target === "win" ? Platform.WINDOWS : Platform.current();
  await build({ config, targets: platform.createTarget(target === "dir" ? "dir" : undefined), publish: "never" });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
