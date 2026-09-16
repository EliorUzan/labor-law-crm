"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const asar = require("@electron/asar");
const expected = require("../desktop/package.json");
const { isApprovedCrmUrl } = require("../desktop/security.cjs");

function findArchives(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) return [];
    if (entry.isDirectory()) return findArchives(item);
    return entry.name === "app.asar" ? [item] : [];
  });
}
const archives = findArchives(path.join(__dirname, "../dist-desktop"));
assert(archives.length > 0, "Build a desktop package first.");
for (const archive of archives) {
  const files = asar.listPackage(archive).map((file) => file.replaceAll("\\", "/").replace(/^\//, ""));
  const allowed = ["package.json", "main.cjs", "preload.cjs", "security.cjs", "documents.cjs", "app-info.cjs", "runtime-config.json"];
  assert.deepEqual(files.sort(), allowed.sort(), "Only the desktop runtime may be shipped; no web code, tests, or secrets.");
  const readJson = (file) => JSON.parse(asar.extractFile(archive, file).toString());
  assert.equal(readJson("package.json").version, expected.version);
  assert.equal(readJson("package.json").main, "main.cjs");
  assert(isApprovedCrmUrl(readJson("runtime-config.json").crmUrl, false));
  if (process.env.CRM_DESKTOP_URL) assert.equal(readJson("runtime-config.json").crmUrl, new URL(process.env.CRM_DESKTOP_URL).origin);
  console.log("Validated " + archive + " (desktop " + expected.version + ")");
}
