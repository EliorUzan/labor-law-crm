"use strict";

const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function toUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isApprovedCrmUrl(value, development) {
  const url = toUrl(value);
  if (!url || url.username || url.password) return false;
  if (development) return url.protocol === "http:" && LOCAL_DEVELOPMENT_HOSTS.has(url.hostname);
  return url.protocol === "https:";
}

function resolveCrmUrl(environment = process.env) {
  const development = environment.NODE_ENV !== "production";
  const value = development
    ? environment.ELECTRON_START_URL ?? "http://localhost:3000"
    : environment.CRM_DESKTOP_URL;

  if (!value || !isApprovedCrmUrl(value, development)) {
    throw new Error(development
      ? "ELECTRON_START_URL must be an http://localhost, 127.0.0.1, or [::1] URL."
      : "CRM_DESKTOP_URL must be an explicitly configured HTTPS URL without credentials.");
  }

  return new URL(value);
}

function isCrmNavigation(value, crmUrl) {
  const url = toUrl(value);
  return Boolean(url && url.origin === crmUrl.origin);
}

function isSafeExternalUrl(value) {
  const url = toUrl(value);
  return Boolean(url && url.protocol === "https:" && !url.username && !url.password);
}

module.exports = { isApprovedCrmUrl, isCrmNavigation, isSafeExternalUrl, resolveCrmUrl };
