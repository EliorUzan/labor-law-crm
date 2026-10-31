# Security maintenance — review due 7 November 2026

The minimatch GHSA-g3hv-75wg-m249 alert remains open in lint/Electron packaging dependencies. No public CRM runtime glob-pattern input was found. Keep builds limited to trusted sources, frozen installs and minimal CI permissions. Do not run untrusted PR build scripts with release credentials.

The advertised fix is minimatch 11.0.1, crossing API majors for older callers. Upgrade compatible parent tools or review a narrow backport, then validate lint, web build and Windows/macOS packaging. Avoid blanket overrides and forced audit fixes.

The prior Electron update is in source and draft packaging, but installed client versions and real installer smoke tests are still unverified. Do not call the installed desktop fleet patched based only on the Vercel web release. Sign/notarize releases when distribution credentials are available.

Account MFA/membership, leaked-password protection, preview bypass inventory, backups and alert routing remain platform verification tasks. The connector/browser outage prevented completing those checks in this pass. No platform settings were changed.
