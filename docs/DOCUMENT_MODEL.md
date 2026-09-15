# Documents — desktop and web

## Identity and ownership

A Document is a leaf record attached to an implemented Client, Matter, payment,
obligation, work item, history/note, or Accounting record. `documents.id` is its
durable CRM identity. Several parents can reference one file; unlinking removes
only the association and never deletes the file or the Document.

The server validates the authenticated owner of both the Document and its parent.
The finite `document_links` allowlist remains; no generic entity graph is added.

## Three locations

- `relative_path`: canonical path within the configured Google Drive folder.
- `drive_file_id` and `web_url`: stable cloud identity and Google editor/view URL.
- Local machine path: resolved from this machine's verified root plus the relative
  path. It is displayed on desktop and passed only to Electron's `shell.openPath`.
  Absolute machine paths are never persisted in the shared database.

Root-relative paths and non-null Drive IDs are unique per owner. Re-adding the
same file reuses the Document and adds an idempotent association. A cloud rename
or move within the root is resolved by its Drive ID when opened through the web.
The desktop uses the last known relative path; re-select a moved file or open its
web link to refresh that path. Moves outside the configured root are rejected.

## Settings and folder verification

Settings connects Google Drive through OAuth and selects a cloud folder. Each
computer separately selects its corresponding local synchronized folder. A
random temporary text file is created in that cloud folder; Electron reads only
that exact proof file in the candidate folder and requires matching random
content before saving the root. Renaming an arbitrary folder to Google Drive
does not pass verification. Wait for synchronization before retrying. The app
deletes the proof after success or explicit cancellation. An abandoned expired
verification can leave a `.crm-verification-*.txt` file for manual removal.

Machine roots are scoped by CRM origin, authenticated user, and cloud root ID in
Electron userData. Changing the cloud root after Documents exist is rejected to
avoid reinterpreting existing relative paths. Reconnection requires the same
Google account. Verification proves synchronization at setup; it is not
continuous monitoring of the Google Drive desktop process.

## Existing and new files

Existing files are linked in place. Desktop supports native browsing and drag/drop;
all paths are checked before a batch is submitted. Absolute/traversal injection,
Windows device names/alternate streams, and symlink/junction escapes are rejected.
The server independently verifies cloud ancestry and rejects ambiguous duplicate
paths. Files awaiting synchronization can be retried without being copied.

Web browsing lists the configured Drive folder and descendants, and accepts
dropped Drive links. Browsers cannot prove a local File's absolute path, so local
OS file drops are rejected with a detailed explanation; they are never uploaded.

New documents are created under `CRM/<client name (id)>/<matter title (id)>/`.
Client-only files omit the Matter directory; office Accounting files use
`CRM/הנהלת חשבונות/<record type>-<id>/`. Names retain Hebrew; IDs disambiguate
records sharing a name. Existing CRM folders are reused and filename collisions
fail without overwriting. Creation supports a copy of an existing in-root template
(including `.doc/.docx/.xls/.xlsx`) or a blank Google Doc/Sheet. The original
template is not changed. Drive for Desktop synchronizes new files.

Desktop opens supported ordinary document formats with the OS default app.
Document rows provide an explicit **פתח קובץ** button on desktop, alongside
**פתיחה ב-Google Drive**, which always opens a browser link and never invokes
the local-file IPC operation. Google-native files show an explanation when the
local button is selected. Settings includes a Hebrew setup guide for office users.
Google-native Docs/Sheets have no ordinary Office binary; they open their Google
editor. Web opening routes Word files to Google Docs, Excel files to Google
Sheets, and other files to the corresponding Google editor or Drive viewer.
Native executable formats are not opened. Missing files/apps produce clear errors.
After native code updates the desktop app must be fully closed and restarted;
reloading its web page does not reload Electron's main process. Missing document
handlers now produce Hebrew restart guidance instead of raw IPC errors.

## Credentials and migrations

`0009_document_drive_access.sql` adds nullable cloud metadata to preserve existing
Document rows and a server-only `document_drive_connections` table. Refresh tokens
use AES-256-GCM with the server environment key. This table has RLS enabled and no
grants to PUBLIC/anon/authenticated. Tokens never reach renderer props, browser
storage, or logs. OAuth uses an encrypted, expiring, owner-bound state cookie.

Migration `0008` is an earlier corrective migration that removes the obsolete V1
reference/provider model. Check those tables before applying it to an old database;
it is destructive for records still in that discarded schema.

See [V2_DOCUMENTS_AND_DESKTOP.md](V2_DOCUMENTS_AND_DESKTOP.md) for setup and testing.
