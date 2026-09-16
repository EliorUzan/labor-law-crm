# Desktop distribution

The Electron shell loads https://labor-law-crm.vercel.app. It bundles Electron and
only the files explicitly listed in electron-builder.cjs; it does not bundle the
Next.js server, database credentials, .env files, or development tools. Users need
internet access and their normal CRM login, but no Terminal/npm. The document
bridge and document/filesystem architecture are unchanged.

## Version

Edit `version` in `desktop/package.json` (initially 0.1.0). Use stable
`major.minor.patch`, incrementing patch for fixes, minor for compatible native
features, major for incompatible native changes. Prerelease/build suffixes are
not supported by this distribution flow. Root package.json is the web project's
version; preload bridgeVersion describes capabilities and is not the installed
application version. Keep appId, productName and desktop package name stable
after the first release to preserve installation/user-data locations.

## Build locally (maintainers only)

Use Node 24 and the pnpm version in root package.json:

```text
pnpm install --frozen-lockfile
node node_modules/electron/install.js
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Set `CRM_DESKTOP_URL=https://labor-law-crm.vercel.app` in the build environment.
For PowerShell: `$env:CRM_DESKTOP_URL='https://labor-law-crm.vercel.app'`.
For macOS: `export CRM_DESKTOP_URL=https://labor-law-crm.vercel.app`.

- Windows host: `pnpm desktop:build:win`
- macOS host: `pnpm desktop:build:mac` (builds Apple Silicon and Intel)
- Unpacked host package: `pnpm desktop:pack`
- After packaging: `pnpm desktop:validate`

The script generates ignored desktop/runtime-config.json from the explicitly
configured HTTPS origin. A packaged app always uses that bundled URL, ignoring
NODE_ENV, ELECTRON_START_URL and CRM_DESKTOP_URL on the user's machine. Invalid or
missing configuration fails the build; there is no production localhost fallback.
Development `pnpm desktop:dev` still defaults to http://localhost:3000.

## Artifacts

All output is ignored by Git under `dist-desktop/`:

| Output | Location/name for 0.1.0 |
| --- | --- |
| Windows installer | Labor-Law-CRM-0.1.0-windows-x64-setup.exe |
| Unpacked Windows app | win-unpacked/Labor Law CRM.exe |
| Apple Silicon archive | Labor-Law-CRM-0.1.0-macos-arm64.zip |
| Intel Mac archive | Labor-Law-CRM-0.1.0-macos-x64.zip |
| Apple Silicon bundle | mac-arm64/Labor Law CRM.app |
| Intel Mac bundle | mac/Labor Law CRM.app |

Distribute the installer/ZIPs, not the unpacked Windows executable alone.
Mac ZIPs preserve the .app bundle; users extract in Finder and drag into
Applications. Windows uses an unsigned per-user NSIS installer with shortcuts.
No signing, notarization, store integration or auto-updater is configured.
The validator inspects each app.asar, verifies its version and HTTPS origin,
and rejects extra runtime files (including web code, tests or secrets).

## CI and release

`.github/workflows/desktop-release.yml` runs on `desktop-v*` tags and manual
workflow dispatch. It verifies tag/version agreement, runs typecheck, lint,
tests and the web build, then builds on Windows and macOS runners. Both Mac
architectures are built on the Mac runner. Installer artifacts are uploaded to
the workflow. A tag run collects the three files plus SHA256SUMS.txt in a
**draft** GitHub Release. A manual dispatch builds only, without creating a release.
The optional GitHub Actions variable CRM_DESKTOP_URL overrides the confirmed
production default. The workflow uses only GITHUB_TOKEN; no signing credentials.

1. Increment desktop/package.json; commit the implementation and lockfile.
2. Push a matching tag, e.g. `desktop-v0.1.0`.
3. Download the draft artifacts and smoke-test installation, login, version
   display, opening the hosted CRM and existing native document actions on
   Windows, Apple Silicon and Intel Mac. Test a browser-downloaded/quarantined
   Mac ZIP; a locally built app does not exercise Gatekeeper.
4. Publish the reviewed draft. This task does not push tags or publish releases.
5. Set the two web deployment variables below and deploy the web app.

GitHub release URLs work for end users only when the release assets are accessible
to them. For a private source repository, copy all three assets to a public
HTTPS download bucket/CDN or a separate public distribution repository. Do not
embed GitHub tokens or temporary authenticated URLs. Confirm each URL in a signed-out
browser before enabling the download buttons. CI artifacts expire and are not
the end-user download host.

## Download/version metadata

Set these **server-side** environment variables on the web deployment only after
all three matching assets are published:

```text
DESKTOP_RELEASE_VERSION=0.1.0
DESKTOP_DOWNLOAD_BASE_URL=https://github.com/EliorUzan/labor-law-crm/releases/download/desktop-v0.1.0
```

The base URL can be any accessible HTTPS directory containing the exact artifact
names above. No credentials, query strings or fragments are accepted. The example
requires a publicly accessible release; choose another host if the repo is private.
The explicit published version is independent of the version currently being
developed in desktop/package.json. Updating these variables requires a web
redeployment on Vercel, but no desktop rebuild.

The authenticated /downloads page and /api/desktop/release use the same validated
configuration. Missing/invalid configuration disables download links and never
announces an update. Do not advertise assets before upload completes.
Metadata responses use private, no-store caching. No new database table is needed.

The desktop reads version/OS/CPU from a narrow main-frame, exact-origin IPC call
using app.getVersion(). After login, it compares on shell mount and window focus
(at most once per minute). /downloads shows installed and published status; a newer
release adds a small shell notice linking to manual installation. Numeric comparison
handles 1.10.0 > 1.9.0. Equal, ahead-of-published, browser, old bridge, invalid data,
timeout and unavailable metadata are handled without blocking CRM use. There is
no background download or installation. Focus/reload checks pick up metadata changes.

## Unsigned installation expectation

The Hebrew download page gives GUI instructions: macOS Finder extraction →
Applications → first launch → System Settings → Privacy & Security → Open Anyway;
Windows SmartScreen → More info → Run anyway, if offered. Only override a warning
for an artifact from the trusted download page. Follow
[Apple's guidance](https://support.apple.com/102445) and
[Microsoft's Smart App Control guidance](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions).

Unsigned/unnotarized Mac distribution is best-effort: Gatekeeper, Apple Silicon
runtime restrictions, OS versions and managed-device policies can prevent GUI-only
launch. This flow deliberately does not add ad-hoc signing or quarantine-removal
commands. Do not claim universal macOS compatibility before testing the actual
downloaded artifacts on both architectures. If Open Anyway is unavailable or
launch still fails, use the web CRM or contact the computer administrator.
Windows Smart App Control, S mode or corporate policy may similarly prevent
an override. Do not disable system-wide protection.

For manual upgrades, quit the app, run the new Windows installer in the same
location or replace the Mac .app in Applications. Do not remove user-data folders.
First migration from the development Electron launcher may require login and
local Drive-root verification again because the installed app has its own profile.

## Rebuild versus web deploy

Rebuild and increment the desktop version for main/preload/security/native bridge
changes, Electron upgrades, bundled CRM origin changes, package configuration,
icons or installer changes. Deploy only the web app for CRM UI/server changes,
download instructions, or published release metadata. Keep web changes compatible
with older native bridges; package version and bridge capability version have
separate purposes.
## Validation on this Windows host

Typecheck and lint passed. The complete suite passed with 285 tests and 23
integration tests skipped. The Next.js production build passed with the documented
Windows Webpack fallback. The Windows NSIS installer built successfully; its
Authenticode status is NotSigned. The packaged ASAR passed the file allowlist,
version and production-origin checks. Workflow YAML was parsed locally.

The macOS build command correctly refuses Windows. Mac bundles must be produced
by the macOS CI job or a Mac maintainer; the workflow has not been dispatched here.
Interactive installation, downloaded-file warnings, and Mac first launch remain
manual first-release smoke tests. No release was published or web deployment made.
