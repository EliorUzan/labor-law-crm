# Document setup and acceptance checks

## Server setup

1. Apply checked-in Drizzle migrations. Before migration 0008 on an old database,
   inspect the discarded document tables; do not discard live records blindly.
2. Enable Google Drive API in a Google Cloud project. Configure OAuth consent and
   add the office account as a test user if the app is in testing mode.
3. Create an OAuth **Web application** client. Register
   `http://localhost:3000/api/documents/google/callback` for development and the
   equivalent HTTPS production URL. The host must match `NEXT_PUBLIC_APP_URL`.
4. Set `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and a stable random
   32-byte hex `DOCUMENT_TOKEN_ENCRYPTION_KEY` in `.env.local` / production secrets.
   Generate the key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Never commit these values. All app instances must share the encryption key.
5. Restart the server and open Settings → connect Google Drive in a normal browser.
   Sign in and grant the requested Drive scope. The full Drive scope supports
   resolving existing arbitrary in-root files and copying templates; the server
   restricts document operations to the selected root. Follow Google's applicable
   OAuth verification requirements before public distribution.
6. Paste the cloud folder URL in Settings and save. `CRM` is created if absent.
7. Start Electron with `pnpm desktop:dev`. It uses the same CRM server and login.
   In desktop Settings, refresh the connection status, prepare verification, wait
   for Drive synchronization, then choose the matching folder on this computer.
   After updating files in `desktop/`, fully close and relaunch Electron. A page
   reload can load a newer preload alongside an older main process, causing
   missing document handlers. The startup regression test checks that all preload
   document channels are registered before the CRM window loads.

Settings also provides a plain-Hebrew user guide for connecting an account,
copying the folder URL, synchronizing the local folder and troubleshooting.
It is expanded before connection and can be reopened after setup.

For the supplied test folder, choose
`G:\My Drive\משפטי - אין בהכרח קשר לתכנית העסקית` and its matching cloud URL.
This example is documentation only, not a hard-coded app setting.

## Acceptance checks

- Pick an unsynchronized folder: verification fails and preserves the previous
  root. A folder named Google Drive alone also fails.
- Verify the synchronized folder; `CRM` is reused; proof cleanup succeeds.
- Add an in-root `.docx` by browse and drag/drop. Bytes/path are unchanged.
- Try a sibling folder, traversal, absolute injection, and a junction escape:
  each is rejected. A mixed native batch is checked before registering any file.
- Open Word/Excel on desktop: the OS default app opens the file. Open from web:
  Google Docs/Sheets opens the cloud file. Test a PDF as well.
- Create from a template: correct Client → Matter hierarchy, original preserved,
  no overwrite on name collision. Unsynchronized files return retry guidance.
- Browser picker stays inside root. Outside Drive URLs/shortcuts are rejected.
  Local browser drops explain why absolute paths cannot be verified.
- Attach the same document to Client and payment: one Document, two links.
  Unlink one parent: file and other link remain. Cross-owner IDs fail.
- Move a cloud file within root and use web open: path refreshes. Move outside:
  fail closed. Revoked OAuth prompts reconnection; another Google account fails.

## Verification on 2026-09-15

- Native filesystem/security, Drive resolution/encryption, and app tests: 223
  passed, 22 pre-existing integration tests skipped. A separate real PostgreSQL
  document-service integration test passed with all fixtures rolled back.
  TypeScript and ESLint passed; production build passed with Webpack.
- The supplied G: folder passed a real temporary-file test for Hebrew paths,
  relative/local mapping, and outside-folder rejection. The temporary file was
  removed; existing files were untouched.
- The configured database's four obsolete document tables were empty before
  migration. Migrations 0008 and 0009 were applied. Credential-table RLS and lack
  of authenticated Data API read privileges were verified by SQL.
- Settings and Client document UI were checked in the browser. The disconnected
  Drive action displays a clear Hebrew Settings instruction.
- After changing the OAuth audience to External/testing, Google consent and the
  token exchange succeeded. The first Drive account request was rejected because
  Google Drive API is disabled in the OAuth client's Cloud project. Enable it in
  APIs & Services → Library → Google Drive API, then reconnect in Settings.
  The callback now reports this specific cause in Hebrew, distinguishes expired
  state, token, access and database failures, and logs only fixed diagnostic codes.
  End-to-end cloud synchronization remains unverified until the API is enabled.

### Follow-up: opening controls and user instructions

- After the user enabled Drive API, desktop Settings showed the connected account,
  configured cloud folder and matching local G: root.
- The reported missing `documents:open` handler came from an Electron main process
  started before the handler implementation. The app was fully closed and relaunched
  with the current main process; Settings then read its native root successfully.
- Added Hebrew onboarding/troubleshooting in Settings and a separate desktop
  `פתח קובץ` button. Seventeen focused native/bridge/UI tests passed, including
  startup registration, separate cloud/local actions, and old-process recovery.
  TypeScript, focused ESLint and the Webpack production build passed.
- Live desktop check: `פתח קובץ` opened the existing in-root `.docx` in Microsoft
  Word and returned its local G: path successfully. Existing files were not edited.
  The separate Drive link opened the same document in Google Docs in Chrome.

The default compiler can fail in this Windows environment while spawning its
PostCSS child process. `next dev --webpack` and `next build --webpack` are supported
verification fallbacks; no app compiler configuration is changed.

## Boundaries

Electron remains a sandboxed shell around the single Next.js app. IPC is limited
to settings, root selection, file selection/drop, and opening; every operation
requires the exact CRM origin/main frame and authenticated context. There is no
arbitrary filesystem read, command execution, custom sync engine, document upload
endpoint, or automatic modification of existing files.
