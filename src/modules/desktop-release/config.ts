import "server-only";
import { parseDesktopReleaseConfig } from "./metadata";

export function getDesktopRelease() {
  return parseDesktopReleaseConfig(process.env.DESKTOP_RELEASE_VERSION, process.env.DESKTOP_DOWNLOAD_BASE_URL);
}
