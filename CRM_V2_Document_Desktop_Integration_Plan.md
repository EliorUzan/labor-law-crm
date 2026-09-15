# Israeli Labor-Law CRM — superseded V2 planning draft

> **Do not implement this draft.** The filesystem-first correction in
> [`docs/DOCUMENT_MODEL.md`](docs/DOCUMENT_MODEL.md) and
> [`docs/V2_DOCUMENTS_AND_DESKTOP.md`](docs/V2_DOCUMENTS_AND_DESKTOP.md)
> supersedes every conflicting statement below: no V1-reference migration or
> compatibility layer, no `legacy_reference`, no provider/Drive file-ID identity,
> no managed Drive-folder metadata, and no core Google OAuth/Drive API. The CRM
> uses a user-selected local root synchronized by Google Drive for Desktop and
> persists canonical root-relative paths plus finite CRM links.

# Historical draft

**Document status:** Approved planning baseline for V2 implementation  
**Version:** 1.0  
**Date:** 9 September 2026  
**Primary V2 theme:** Managed documents + Google Drive + mirrored web/macOS desktop experience  
**Primary user:** A non-technical Israeli labor-law lawyer using macOS and Microsoft Office  
**Development model:** Existing Next.js/TypeScript CRM remains the primary application; Codex implements V2 in bounded threads

---

## Executive Summary

V2 turns the existing CRM document-reference feature into a real document-management layer while preserving the simplicity of V1.

The office already uses Google Drive for storage, but the lawyer prefers Microsoft Word, Excel, PowerPoint and the normal macOS desktop experience rather than Google Docs/Sheets as the primary editing environment. V2 therefore uses **Google Drive as the cloud source of truth for files** while providing two clients over the same CRM application:

- **Web app:** the existing deployed Next.js CRM. Files open through Google Drive's web viewer/editor when supported.
- **macOS desktop app:** a thin Electron shell around the same deployed CRM. Files open from the locally synchronized Google Drive folder using the operating system's default application, e.g. `.docx` in Microsoft Word and `.xlsx` in Microsoft Excel.

There is **one CRM codebase, one backend, one database and one document model**. Electron is not a second CRM implementation. It adds only a small, explicit native bridge for operations the browser cannot perform, such as opening a local file or revealing it in Finder.

Documents become first-class CRM objects. They may be associated with any substantive CRM record — for example Client, Matter, Client Payment/Charge, Task, Deadline, Client Obligation, Expense, Tax/VAT record, Trust transaction or Accounting Obligation — without making the physical Google Drive path part of the document's identity.

All files managed by the CRM live under a single user-selected Google Drive parent folder. If the user chooses `root_folder`, the CRM creates and owns:

```text
root_folder/
└── CRM/
    ├── Clients/
    ├── Accounting/
    └── ...
```

The CRM creates and manages the structure underneath `CRM/` automatically. The lawyer should not need to understand or maintain this folder hierarchy.

The V2 implementation will be delivered through focused Codex threads in the same style as V1. This document defines those stages, but the individual trigger prompts will be produced separately after this plan is accepted.

---

# 1. Relationship to V1

V1 deliberately stored document references rather than file contents and deferred real cloud/local synchronization. V2 replaces that limited model with a managed document system while preserving the existing CRM principles:

- Hebrew-first / RTL-first.
- One primary lawyer; no enterprise document platform.
- Minimal data entry.
- Flat UI even when the underlying data model is richer.
- Security and privacy are foundational.
- Existing Client, Matter, work-management and Accounting behavior must not regress.

V2 is primarily the **Document + Desktop Integration release**. Earlier planning mentioned email synchronization, AI email analysis and additional storage providers. Those ideas are **not discarded**, but they are not mixed into the implementation stages below because their behavior has not yet been specified to the same level as the document system. The internal document design should remain provider-neutral enough to support a future Dropbox integration without redesigning the CRM.

---

# 2. V2 Non-Negotiable Decisions

## 2.1 One shared application

The existing Next.js/TypeScript application remains the canonical CRM.

```text
                     Supabase + Google Drive
                              │
                     Same CRM application
                              │
               ┌──────────────┴──────────────┐
               │                             │
          Web browser                  macOS desktop
        normal Next.js UI              Electron shell
               │                             │
       Google Drive web              local synced file
                                             │
                                      Word / Excel / etc.
```

Normal product work should continue to be implemented once in the existing web application. The desktop shell should rarely require changes.

## 2.2 Electron is a thin native shell, not a fork

The desktop repository code should remain in the same project, for example:

```text
/app, /src, ...         existing Next.js CRM
/desktop or /electron  small Electron main/preload layer
```

The desktop layer should expose only narrowly scoped capabilities such as:

```text
isDesktop()
getDesktopCapabilities()
chooseLocalDriveRoot()
checkLocalDocument()
openLocalDocument()
revealLocalDocumentInFinder()
```

It must not expose a generic filesystem API or arbitrary Node.js execution to the CRM UI.

## 2.3 Google Drive is the V2 file store

Supabase stores CRM records and document metadata. Google Drive stores the file bytes.

The CRM must not duplicate uploaded file contents into the PostgreSQL database.

## 2.4 Documents may attach to any substantive CRM entity

Document ownership in the CRM is independent from Drive folder structure. A document may be linked to one or several CRM records.

Examples include:

- Client
- Matter
- Client financial record: charge or payment
- Client Obligation
- Task
- Deadline
- Important Date
- Case History entry
- Matter Note, where useful
- Expense
- Manual Income
- Trust transaction
- Tax payment
- VAT payment
- Tax/VAT liability
- Accounting Obligation

System/authentication/settings records are not document attachment targets.

## 2.5 One CRM-managed folder tree

The user chooses one Google Drive parent folder. The CRM creates a single `CRM` folder below it and keeps all **CRM-managed** files recursively under that folder.

Example:

```text
root_folder/
└── CRM/
    ├── Clients/
    │   └── <Client>/
    │       ├── Client Documents/
    │       └── Matters/
    │           └── <Matter>/
    │               └── Documents/
    └── Accounting/
        ├── Expenses/
        ├── Taxes/
        ├── VAT/
        ├── Trust/
        └── Other/
```

This folder tree is an implementation detail. The user works through CRM entities, not by manually creating folders.

## 2.6 Linking and moving are different operations

**Link document to entity** adds another CRM association and does not duplicate or move the file.

**Move document to entity** changes the document's primary/storage home. The CRM moves the file in Google Drive to the destination entity's managed folder while keeping the same Drive file identity and any valid secondary CRM links.

## 2.7 Platform-specific opening behavior

### Web

Primary Open action:

- opens the Google Drive web representation/viewer/editor for the file.

Context menu:

- `Open in Google Drive` — enabled.
- `Open on desktop` — visible but disabled/greyed out, with a short explanation that the feature requires the desktop app.

### macOS desktop

Primary Open action:

- resolves the synchronized local file and asks macOS to open it with the default associated application.

Examples:

```text
.docx → Microsoft Word, if Word is the macOS default
.xlsx → Microsoft Excel, if Excel is the macOS default
.pptx → Microsoft PowerPoint, if PowerPoint is the macOS default
.pdf  → Preview / Acrobat / configured default
```

Desktop context menu also contains `Open in Google Drive` as a fallback and `Reveal in Finder` when the local file is available.

---

# 3. V2 Scope

## Included

- Real Google Drive integration.
- Google OAuth connection managed through Settings/setup.
- Managed CRM folder tree under one selected Drive parent folder.
- Upload files from the CRM.
- Import/adopt appropriate existing Drive files where supported.
- Document metadata stored in the CRM.
- Documents linked to any supported CRM entity.
- Multiple entity links per document.
- Move documents between CRM entities.
- Rename documents.
- Remove individual entity links without deleting the underlying file.
- Safe document deletion/trash flow where explicitly implemented.
- Web opening through Google Drive.
- Electron desktop application using the same CRM web UI.
- Local opening using the synchronized Google Drive copy.
- Reveal in Finder.
- Non-technical first-run setup wizard.
- Settings for Drive connection, cloud root and per-machine local root.
- Local-document health checks and red-X unsupported/unavailable state.
- V1 document-reference migration.
- Cross-platform testing from a primarily Windows development environment.
- macOS packaging, signing/notarization readiness and release process.

## Explicitly not required for this V2 plan

- Full document-content indexing.
- OCR.
- AI document analysis.
- AI legal drafting.
- Automatic legal classification of uploaded documents.
- Email synchronization and AI email processing; these require a separate requirements workshop.
- Dropbox implementation; keep the model future-compatible but implement Google Drive first.
- Collaborative Word editing engine built by the CRM.
- Replacing Google Drive's revision/version history with a CRM version-control system.
- Replacing Finder.
- Native iPhone/iPad application.
- Generic desktop filesystem browsing outside the configured CRM area.

---

# 4. Architecture

## 4.1 Core components

```text
┌───────────────────────────────────────────────────────────────┐
│                        CRM backend                            │
│ Next.js server + Supabase/PostgreSQL + authentication        │
│                                                               │
│ document metadata │ entity links │ Drive integration settings │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ Google Drive API
                        ▼
               ┌─────────────────────┐
               │    Google Drive     │
               │ actual file bytes   │
               └─────────┬───────────┘
                         │
                  Drive for desktop
                         │
                         ▼
               ┌─────────────────────┐
               │ Lawyer's Mac        │
               │ local synced copy   │
               └─────────┬───────────┘
                         │
                    Electron bridge
                         │
                         ▼
               Word / Excel / Preview
```

## 4.2 Shared web/desktop UI

The production Electron window should load the deployed CRM URL rather than carrying an independent product frontend. During local development it may load the local Next.js development URL.

Benefits:

- One UI implementation.
- Normal web releases immediately appear in the desktop app.
- Electron is updated only when native capabilities change.
- Codex agents continue working mainly with Next.js/TypeScript.

Introduce a small capability handshake so the web UI can safely detect:

```text
platform = web | desktop
bridge_version
capabilities = [openLocalDocument, revealInFinder, chooseLocalDriveRoot, ...]
```

If a future web release requires a newer native bridge, show a clear `Desktop update required` message rather than failing silently.

## 4.3 Machine-specific versus cloud settings

This distinction is mandatory.

### Cloud/user settings — stored server-side

- Google account connection metadata.
- Google Drive selected parent folder ID.
- CRM-managed folder ID.
- Drive integration state.
- installation/marker identifier.

### Desktop-machine settings — stored locally on each computer

- local path corresponding to the selected Drive parent folder.
- local setup status.
- last validation timestamp.
- optional machine identifier and native-bridge version.

A local macOS path must **not** be treated as a universal user setting because the same Drive folder can appear at different filesystem paths on different computers.

---

# 5. Document Domain Model

## 5.1 Document identity

The identity of a managed document must be based on a stable cloud-provider file identifier, not its filename or path.

Conceptually:

```text
documents
├── id
├── owner_user_id
├── provider                       # google_drive in V2
├── provider_file_id               # stable Drive file ID
├── display_name
├── mime_type
├── extension nullable
├── size_bytes nullable
├── provider_web_url nullable
├── provider_parent_folder_id
├── relative_path_cache nullable    # convenience, not identity
├── managed_state
├── created_at
├── updated_at
└── provider_modified_at nullable
```

The exact schema must follow the existing project conventions and current Drizzle model.

## 5.2 Entity links

V2 explicitly requires a reusable document-association layer. This is one of the few cases where a generic target type is justified because document attachment to many record types is a current requirement, not speculative enterprise abstraction.

Conceptually:

```text
document_links
├── id
├── document_id
├── target_type
├── target_id
├── link_role nullable
├── is_primary/home flag if useful
└── created_at
```

`target_type` must use an application allowlist, not arbitrary strings supplied by the browser.

All reads/writes must verify that `target_id` exists, belongs to the authenticated user and matches the declared target type.

## 5.3 Storage home

A document can have multiple CRM links but one current physical storage home.

The storage home answers:

> Which CRM entity's managed folder should physically contain this file?

It may be represented as a primary link, explicit storage target fields, or a dedicated storage-location model. The implementation thread should select the simplest model that preserves these invariants:

1. File identity is independent of path.
2. One file has at most one managed physical parent folder at a time.
3. One file may link to several CRM entities.
4. Changing physical location does not create a duplicate document record.

## 5.4 Managed folders

Store Drive folder IDs created for CRM entities so the system does not rediscover folder paths by name on every operation.

Conceptually:

```text
managed_drive_folders
├── id
├── owner_user_id
├── target_type
├── target_id nullable
├── provider_folder_id
├── parent_provider_folder_id
├── display_name_cache
└── created_at / updated_at
```

Folder IDs, not folder names, are authoritative.

## 5.5 Document state

Useful internal states may include:

- `managed` — file is inside the CRM-managed Drive tree.
- `legacy_reference` — migrated V1 reference not yet adopted as a managed Drive file.
- `missing_cloud` — Drive file ID can no longer be found or accessed.
- `trashed` — underlying Drive file is in trash, if tracked.

Local availability is machine-specific and should not be stored as a single global document state.

---

# 6. Supported Document Associations

Every substantive CRM record should use a common `Documents` UI component rather than each domain implementing file behavior independently.

Minimum supported target categories:

| Domain | Examples |
|---|---|
| Client | Client record |
| Matter | Matter record |
| Client finance | Charge, payment |
| Client work | Client Obligation |
| Matter work | Task, Deadline, Important Date |
| Matter narrative | Case History entry; Matter Note where practical |
| Accounting | Expense, Manual Income, Trust transaction, Tax payment, VAT payment, Liability, Accounting Obligation |

For records without a full detail page, document actions can appear in the record's expanded row, edit/details dialog, or context menu. Do not create deep navigation solely to expose documents.

A document may appear in multiple sections because of multiple links, but the CRM must make clear that it is one physical file rather than multiple copies.

---

# 7. Google Drive Storage Model

## 7.1 Selected root

During setup the user chooses a Drive parent folder, for example:

```text
root_folder
```

The CRM creates:

```text
root_folder/CRM
```

The `CRM` folder is the root of all newly managed documents.

The user should be discouraged from manually reorganizing the internal CRM tree in Google Drive. The files remain visible and accessible in Drive; the CRM simply owns the structure.

## 7.2 Example managed structure

A practical initial convention:

```text
root_folder/
└── CRM/
    ├── Clients/
    │   ├── David Cohen [C-7K2F]/
    │   │   ├── Client Documents/
    │   │   └── Matters/
    │   │       └── Cohen v ABC [M-91A3]/
    │   │           └── Documents/
    │   └── ...
    │
    └── Accounting/
        ├── Expenses/
        │   └── 2026/
        │       └── 09/
        ├── Income/
        ├── Taxes/
        ├── VAT/
        ├── Trust/
        └── Obligations/
```

Readable names may include a short immutable CRM suffix to avoid collisions between Clients or Matters with the same name. The full internal database UUID should not need to appear in the folder name.

Exact naming belongs to an implementation thread, but these rules are required:

- Human-readable.
- Safe for macOS/Windows filenames.
- Duplicate-safe.
- Renaming an entity must not break the document identity.
- Folder identity is Drive folder ID, never reconstructed from the displayed path alone.

## 7.3 Entity-to-folder behavior

When a document is uploaded from an entity, the folder manager resolves or creates the appropriate managed folder.

Examples:

```text
Upload from Client
→ /CRM/Clients/<Client>/Client Documents/

Upload from Matter
→ /CRM/Clients/<Client>/Matters/<Matter>/Documents/

Upload from Expense
→ /CRM/Accounting/Expenses/<year>/<month>/
```

A file attached to several entities still has one physical home.

---

# 8. Document Lifecycle

## 8.1 Upload new file

User action from any supported entity:

```text
+ העלה מסמך
```

Flow:

1. User chooses one or more local files.
2. CRM validates basic file metadata and ownership/context.
3. Folder manager resolves the entity's managed Drive folder.
4. File is uploaded to Google Drive.
5. Drive returns stable file ID and metadata.
6. CRM creates the `document` record.
7. CRM creates the entity link.
8. UI displays the file immediately.

Do not save the underlying file bytes in Supabase.

For larger files, implementation should use an upload strategy compatible with Google Drive resumable upload behavior rather than buffering arbitrarily large files in memory. The implementation thread should verify the deployment platform's request limits before locking the transport mechanism.

## 8.2 Adopt/import an existing Drive file

V2 should support selecting an existing Drive file and bringing it under CRM management where practical.

Preferred behavior:

- User selects file through a Drive-aware picker.
- CRM receives authorized Drive file ID.
- CRM moves the file into the appropriate managed `CRM/...` folder when the user chooses to adopt it.
- CRM creates metadata and entity links.

Do not silently move an existing file without clearly telling the user that it will become CRM-managed.

## 8.3 Link existing CRM document to another entity

No Drive move and no duplicate upload.

Example:

```text
Document currently linked to Matter
→ Link to Client Payment
```

The same `document_id` receives another `document_link`.

## 8.4 Move document to another entity

Flow:

1. User selects `Move`.
2. Chooses destination entity.
3. CRM validates destination ownership.
4. Folder manager resolves destination folder.
5. Drive file is moved by changing its parent folder.
6. Storage-home metadata updates.
7. Secondary links remain unless user explicitly removes them.

The Drive file ID remains the same.

## 8.5 Rename

Rename should update the Drive file and CRM display metadata together.

If Drive succeeds but DB update fails, or vice versa, the operation must be recoverable and surfaced for reconciliation rather than silently diverging.

## 8.6 Remove link

Removing a document from one entity only removes that association.

It must not delete the physical file if other links exist.

## 8.7 Delete/trash

Permanent deletion is intentionally conservative because this is a legal CRM.

If implemented in V2:

- Prefer moving the Drive file to trash, not permanent deletion.
- Require explicit confirmation.
- Clearly distinguish `Remove from this record` from `Move file to Drive trash`.
- Preserve an audit-friendly metadata record where appropriate.

---

# 9. Web and Desktop Document UX

## 9.1 Common document row/card

Example:

```text
כתב תביעה.docx
Word document • updated 09.09.2026
[פתח]
```

Common context menu:

```text
Open
Open in Google Drive
Open on desktop
Reveal in Finder
Link to another record
Move to another record
Rename
Remove from this record
```

Options appear/enable according to platform and document state.

## 9.2 Web behavior

`Open`:

- opens the file using its Google Drive web URL/viewer/editor.

`Open on desktop`:

- visible but greyed out.
- tooltip/help text: `Available in the desktop app` / Hebrew equivalent.

`Reveal in Finder`:

- hidden or disabled because the browser has no local filesystem relationship.

`Open in Google Drive`:

- available in the right-click/context menu as explicitly required.

## 9.3 Desktop behavior

`Open`:

1. Resolve local relative path.
2. Validate path is inside the configured local `root_folder/CRM` boundary.
3. Confirm file exists locally.
4. Ask the OS to open it using the default registered application.

If unavailable locally:

- do not fail with a technical error.
- show a concise message.
- offer `Open in Google Drive`.

`Reveal in Finder`:

- available only when local path can be safely resolved.

## 9.4 Red-X local unavailable indicator

When running in the desktop app, documents that are valid in Drive but cannot be resolved under the current selected local directory display a visible red X/status indicator.

The file remains usable through Google Drive.

Example:

```text
✕  כתב תביעה.docx
   לא זמין לפתיחה מקומית
   [פתח ב-Google Drive]
```

The red X represents **local desktop availability**, not a claim that the cloud file is missing.

---

# 10. Desktop Application Architecture

## 10.1 Technology choice

Use Electron unless the implementation spike identifies a concrete blocker.

Reasoning:

- Existing project is TypeScript/Next.js.
- Electron main/preload code can also be TypeScript/JavaScript.
- Codex agents can work directly with normal source files and CLI tooling; no special Codex plugin is required.
- Electron can load a remote production URL or local development URL.
- Electron provides OS file-opening and Finder integration APIs.

The memory/installer-size overhead compared with Tauri is acceptable for this single-lawyer CRM in exchange for simpler maintenance.

## 10.2 Security posture

The Electron renderer must be treated like a normal web page, not like trusted Node code.

Required defaults:

- `nodeIntegration: false`
- `contextIsolation: true`
- renderer sandbox enabled where compatible
- a minimal preload bridge via `contextBridge`
- navigation restricted to the CRM's allowed origin(s)
- arbitrary new windows blocked or opened safely in the external browser
- IPC handlers validate every argument

The desktop bridge must not accept arbitrary absolute filesystem paths from the renderer.

## 10.3 Native file operations

Main-process capabilities should be narrow:

```text
chooseLocalDriveRoot()
validateLocalRoot()
checkDocument(relativePath)
openDocument(relativePath)
revealDocument(relativePath)
getBridgeInfo()
```

Every path operation must:

1. accept only a CRM-relative path;
2. normalize it;
3. reject `..` traversal and absolute paths;
4. resolve beneath the configured local root + `/CRM`;
5. reject a resolved path that escapes that directory, including unsafe symlink cases where applicable;
6. reject executable/script file categories that the CRM has no reason to launch.

The bridge should then use the operating system's normal file handling rather than hardcoding Microsoft Word/Excel executable locations.

---

# 11. Google Drive Integration

## 11.1 OAuth

The lawyer connects the office Google account from the CRM.

Use the minimum practical Google Drive OAuth scope. The implementation should prefer `drive.file` where it satisfies the selected-folder + app-managed-file workflow. Google documents `drive.file` as access to files/folders the user has opened or created with the app, and Google Picker can work with this scope.

If a broader scope is later proven necessary for an explicitly approved use case, document and justify it before requesting it.

OAuth refresh credentials must remain server-side and protected as secrets. They must never be exposed to the browser or Electron renderer.

## 11.2 Root selection

The user chooses an existing Drive parent folder or creates one through a simple picker flow.

The CRM stores the selected **Drive folder ID**, not merely the displayed folder path.

Then it creates or finds one child folder named:

```text
CRM
```

The CRM child folder ID becomes the managed cloud root.

## 11.3 Provider-neutral metadata

Even though Google Drive is the only provider implemented in this V2 plan, store concepts such as:

```text
provider = google_drive
provider_file_id
provider_folder_id
provider_web_url
```

Do not build Dropbox code yet.

---

# 12. First-Run Setup for a Non-Technical User

The setup experience is a product feature, not README-only instructions.

The lawyer should not need to understand OAuth, mount points, Drive IDs or Electron.

## 12.1 First-run wizard overview

The desktop app should detect whether document integration has been configured and guide the user through a short wizard.

Suggested Hebrew-facing stages conceptually:

```text
1. Connect Google Drive
2. Choose where the CRM may store files
3. Confirm Google Drive for desktop is installed
4. Choose the matching folder on this Mac
5. Verify connection
6. Ready
```

Each screen contains one primary action and short explanations.

## 12.2 Step 1 — Connect office Google account

User sees:

```text
חיבור Google Drive
[התחבר ל-Google Drive]
```

Clicking launches normal Google authorization.

After success show the connected account identity clearly enough for the lawyer to verify it is the office account.

## 12.3 Step 2 — Choose cloud parent folder

User selects the Drive folder under which CRM-managed files may be stored.

Example selection:

```text
My Drive / Law Office
```

CRM explains simply:

> The CRM will create a folder named `CRM` inside this folder and organize files there automatically.

Then the CRM creates:

```text
Law Office/CRM
```

## 12.4 Step 3 — Google Drive for desktop guidance

The desktop app asks whether Google Drive for desktop is installed and signed into the same office account.

The wizard should provide simple instructions rather than assuming technical knowledge:

1. Install Google Drive for desktop if it is not installed.
2. Sign in with the same Google account shown in the CRM.
3. Prefer **Mirror files** for My Drive when practical, because mirrored files are standard local files and remain available offline. Streaming may still be supported, but local availability depends on Drive for desktop running and the specific file being available.
4. Return to the CRM and continue.

The wizard may provide an external `Open Google Drive download/help page` link, but should never require the user to manually edit configuration files or environment variables.

## 12.5 Step 4 — Choose matching local folder

The desktop app opens a normal macOS folder chooser.

The user selects the local folder corresponding to the cloud parent chosen in Step 2.

Example:

```text
/Users/lawyer/Google Drive/Law Office
```

This path is stored only on that machine.

## 12.6 Step 5 — Automatic cloud/local verification

To prevent the user from accidentally selecting the wrong Google account or local folder, setup must verify the mapping automatically.

Recommended mechanism:

1. CRM creates a tiny marker file inside the cloud `CRM` folder containing a random installation identifier.
2. Desktop app looks for the synchronized marker at:

```text
<selected-local-root>/CRM/<marker>
```

3. The marker contents/identifier must match the server-side expected value.

If it is not present yet, show a non-technical message such as:

> Google Drive may still be synchronizing. Wait a moment and press `Check again`.

Provide:

```text
[בדוק שוב]
[בחר תיקייה אחרת]
```

A definite marker mismatch should block completion because it likely means the wrong folder/account was selected.

## 12.7 Setup success

Show:

- connected Google account;
- selected Drive location;
- local directory status;
- confirmation that files can now open in desktop applications.

Provide a simple test button that creates or locates a harmless test file and verifies the desktop-open path without using real Client data.

---

# 13. Settings Page

Settings becomes the ongoing control surface for document integration.

## 13.1 Integration card

Show:

```text
Google Drive
Connected account: office@example.com
Cloud folder: Law Office / CRM
Status: Connected
```

Actions:

- reconnect if authorization expires;
- change cloud parent through a deliberate migration flow;
- test connection.

## 13.2 This-computer card — desktop only

Show:

```text
Desktop file opening
Local folder: /Users/.../Law Office
Status: Ready
Last checked: ...
```

Actions:

- Change local folder
- Recheck files
- Open CRM folder in Finder

On the web app, show that desktop local-folder configuration is not applicable on this device rather than exposing a meaningless filesystem field.

## 13.3 Changing the local accessible directory

This implements the user's explicit warning requirement.

Before saving a new local root:

1. Verify the root corresponds to the same cloud CRM installation marker.
2. Scan/re-evaluate all managed/linked documents that are expected to open locally.
3. Count documents not found recursively beneath the proposed local root's `CRM` folder.
4. If any are unavailable, show a blocking confirmation warning before save.

Example:

```text
Warning
17 linked files will not be available for local opening from the selected folder.
They will remain stored in Google Drive and can still be opened through the web.

[Cancel]
[Use this folder anyway]
```

After confirmation:

- save the new machine-local root;
- affected documents show the red X local-unavailable indicator;
- `Open in Google Drive` remains functional.

A marker mismatch is different: it indicates the wrong folder/account and should normally prevent saving instead of offering `Use anyway`.

## 13.4 Changing cloud root

Changing the server-side Drive parent is more consequential than changing a local path.

Do not implement it as a simple text field.

If supported in V2, use a dedicated migration wizard that moves the managed `CRM` folder or rebinds it safely and warns about local mappings on registered desktop machines.

For a single-lawyer V2, it is acceptable to make cloud-root changes deliberately rare.

---

# 14. Local Availability and Health Model

Local status should be evaluated per machine.

Recommended states:

| State | Meaning | UI |
|---|---|---|
| Local ready | file exists under configured local CRM root | normal Open |
| Sync pending | cloud file exists but local copy has not appeared yet | clock/spinner + retry |
| Local unavailable | cloud file valid but not present under local root | red X + Drive fallback |
| Local root not configured | desktop setup incomplete | setup action |
| Cloud missing | Drive file itself unavailable | stronger error; not merely red-X local state |
| Legacy reference | old V1 reference not yet managed/adopted | migration/adopt action |

Do not globally mark a document broken merely because one specific Mac cannot find its local copy.

---

# 15. Synchronization and Reconciliation

Google Drive for desktop is responsible for syncing file bytes. The CRM does not build its own filesystem synchronization engine.

The CRM is responsible for metadata coherence.

## 15.1 Expected sync delay

After upload/move/rename, the web/cloud state may update before the local Drive client finishes synchronization.

Desktop UI should tolerate this:

```text
Cloud operation successful
→ local file not present yet
→ show Sync pending
→ retry/check later
```

Do not immediately mark a newly moved file as broken.

## 15.2 Manual Drive changes

Users may still rename/move/delete files manually in Google Drive or Finder.

Because Drive file ID is authoritative, renaming or moving within Drive should not automatically create a new CRM document identity.

Provide a reconciliation mechanism, likely:

- on-demand `Recheck documents` in Settings;
- lightweight opportunistic metadata refresh when a document is opened/viewed;
- optional bounded background refresh later.

Do not poll every file continuously.

## 15.3 Missing files

If Drive reports that a file no longer exists/is inaccessible:

- keep the CRM document metadata;
- show a clear missing-cloud status;
- do not silently delete links;
- allow the user to repair/relink where appropriate.

---

# 16. Document Search and Display

Extend Global Search to include at least:

- document display name;
- linked Client/Matter context;
- optional category/notes if retained.

Do not search document contents in this V2 plan.

Search result example:

```text
כתב תביעה.docx
Document • Cohen v ABC • David Cohen
```

Opening the result should navigate to the relevant CRM context or document action according to current UX conventions.

---

# 17. Migration from V1 Document References

Existing V1 data must not be discarded.

## 17.1 Migration objective

Convert Matter-only reference records into the new document model while preserving original information.

For each legacy reference:

- create a V2 `document` or `legacy_reference` record;
- create a Matter document link;
- preserve display name, category, notes and original URL/path;
- do not pretend a legacy local path is a valid managed Drive file.

## 17.2 Google Drive URLs

Where a V1 reference is already a Google Drive URL, attempt to extract/resolve the Drive file ID only when safe and authorized.

If authorization or parsing is uncertain, preserve it as a legacy reference and offer an explicit `Adopt into CRM` flow rather than guessing.

## 17.3 Legacy local paths

Preserve as legacy metadata.

The user may later upload/adopt the actual file into the managed Drive tree.

Never silently move local files based only on a historical path string.

---

# 18. Security Requirements

Documents contain confidential legal information. V2 expands attack surface through OAuth and desktop-native capabilities, so security is part of each thread rather than a final add-on.

## 18.1 Server/Drive

- All document records scoped to authenticated owner.
- Entity-link target ownership checked server-side.
- OAuth tokens server-only.
- Request minimum practical Drive scope.
- Validate Drive file/folder ownership/access before attaching.
- No file or token data in logs beyond what is necessary.
- No secrets in browser bundles or Electron renderer.

## 18.2 Electron

- Renderer has no Node integration.
- Context isolation enabled.
- Sandbox enabled where compatible.
- Preload exposes a tiny API only.
- Main process validates all IPC requests.
- No arbitrary shell commands.
- No arbitrary URL launching without protocol/origin validation.
- No raw path opening outside configured CRM root.
- Path traversal and symlink escape protections.
- Unsafe executable/script file extensions rejected from automatic launch.

## 18.3 Remote-web-in-Electron risk

Because Electron loads the deployed CRM, treat the remote renderer as untrusted relative to native APIs.

Native operations must remain safe even if malicious JavaScript somehow runs in the renderer. Therefore the main process must enforce the root/path/file rules rather than trusting the React UI to do so.

## 18.4 Legal-data deletion

Deleting an entity link and deleting the file are separate actions.

Drive trash is preferred over permanent delete.

---

# 19. Testing Strategy When Development Happens on Windows

The user can continue doing nearly all daily development on Windows.

## 19.1 Windows development coverage

Develop/test on Windows:

- Next.js application.
- Supabase schema and migrations.
- Google Drive OAuth/API integration.
- Upload/import/move/rename/link/unlink.
- folder-management logic.
- Settings and setup UX.
- Electron main/preload bridge.
- local-path validation.
- default application opening using Windows equivalents.
- web/desktop capability detection.

Google Drive for desktop on Windows can provide a realistic local-sync development environment.

## 19.2 Automated platform-neutral tests

Unit/integration tests should mock native operations behind a small desktop adapter/interface.

Business code should not directly depend on macOS APIs.

Example separation:

```text
Document UI/domain
      ↓
DesktopBridge interface
      ↓
Electron implementation
```

Tests can provide a fake bridge.

## 19.3 CI macOS builds

Use GitHub Actions macOS runners to compile/package the macOS Electron application on every relevant release branch/tag.

CI can verify:

- Electron TypeScript build.
- packaging succeeds.
- expected files exist in artifact.
- unit tests for native bridge/path logic.

## 19.4 Real Mac smoke test

Some behavior cannot be proven from Windows/CI alone:

- actual Drive for desktop behavior on the lawyer's Mac;
- Finder integration;
- real local sync path;
- macOS default application behavior;
- Word/Excel launch;
- Gatekeeper/signing/notarization behavior.

Maintain a short manual smoke test to run on the lawyer's Mac after desktop-specific changes.

The user should not need to develop on the Mac; only periodic verification is required.

## 19.5 Test account/data

Use a dedicated non-production Google test account/folder where practical.

Never run destructive Drive tests against real Client files.

---

# 20. Deployment and Desktop Distribution

## 20.1 Web

Continue existing Vercel + Supabase deployment unless architecture changes are deliberately approved.

## 20.2 Desktop

Use Electron packaging tooling, preferably Electron Forge unless an implementation spike identifies a better fit.

The production app should:

- load only the approved CRM production origin;
- show a graceful offline/network error if the CRM cannot load;
- expose native document functions through the bridge;
- keep local machine configuration in Electron's application data location.

## 20.3 macOS signing/notarization

For a non-technical lawyer, do not rely on instructions for bypassing Gatekeeper.

The release process should produce a signed and notarized macOS application. Electron's official documentation recommends code signing for distribution and describes macOS signing + Apple notarization as the normal release path.

Plan for:

- Apple Developer Program enrollment by the app owner/office/developer as appropriate;
- signing credentials stored securely in CI secrets;
- notarized release artifact;
- a simple installer/disk image or other standard macOS distribution format.

Do not require App Store distribution in V2.

## 20.4 Updates

Because the desktop shell loads the live web app, most CRM updates require no desktop reinstall.

For native-bridge updates, initial V2 may use a simple manual desktop update process with a clear version warning. Automatic desktop updates can be added later if they become useful.

---

# 21. Failure Behavior

The user is non-technical. All failures must translate into useful actions.

Examples:

| Problem | User-facing behavior |
|---|---|
| Google token expired/revoked | `Reconnect Google Drive` |
| File still syncing | `Still syncing — check again` |
| Wrong local directory | explain mismatch + choose folder again |
| Some files absent under new local root | warning before save; red X afterward |
| Local file missing but cloud exists | Drive fallback |
| Drive file missing | show cloud-missing state, keep CRM record |
| Desktop bridge outdated | `Update desktop app` |
| Desktop capability used from web | disabled control with explanation |

Never show raw Drive API, Node, Electron or filesystem error messages to the lawyer.

---

# 22. Performance and Simplicity

The office is small and single-user-first.

Do not introduce:

- Elasticsearch.
- event buses.
- microservices.
- continuous filesystem watchers across the entire Drive unless later proven necessary.
- a generic workflow engine.
- complex document permissions separate from CRM ownership.

Use Drive IDs, indexed PostgreSQL metadata and bounded API calls.

Documents should load as metadata lists, not download file contents merely to display a page.

---

# 23. Codex Development Workflow for V2

Continue the V1 workflow:

- One bounded Codex conversation per stage.
- Each conversation starts with a dedicated trigger prompt written separately after this plan is approved.
- Codex reads `AGENTS.md`, project context and exact requirement docs first.
- Durable decisions go into repository docs, not repeated giant prompts.
- Small coherent schema migrations.
- Run typecheck/lint/tests/build at every stage.
- Git checkpoint between stages.
- No stage proceeds into later functionality unless explicitly requested.

Recommended persistent documentation additions:

```text
docs/V2_DOCUMENTS_AND_DESKTOP.md      # this plan or condensed canonical requirements
docs/DOCUMENT_MODEL.md
docs/GOOGLE_DRIVE_INTEGRATION.md
docs/DESKTOP_ARCHITECTURE.md
docs/DESKTOP_SETUP.md
```

Existing `PRODUCT_REQUIREMENTS.md`, `DATA_MODEL.md`, `ARCHITECTURE.md` and `CRM_AI_PROJECT_CONTEXT.md` should be updated incrementally as decisions become implemented truth.

---

# 24. Proposed V2 Codex Thread Breakdown

The exact trigger prompts will be created after this document is reviewed.

## V2 CRM 00 — Architecture Spike + V2 Documentation Baseline

Purpose:

- verify Electron remote-web shell approach in the existing repository;
- verify Google Drive API libraries/credential flow fit current architecture;
- define shared adapters/interfaces;
- update canonical docs;
- no broad user-facing document implementation yet.

Exit condition:

- web CRM still works;
- minimal Electron development shell can load the CRM safely;
- architecture decisions documented;
- no parallel frontend fork created.

## V2 CRM 01 — Document Data Model + V1 Migration

Purpose:

- replace Matter-only references with first-class Documents;
- introduce document/entity links;
- storage-home and managed-folder metadata;
- safe migration of V1 references.

Exit condition:

- legacy records preserved;
- documents can be associated to supported CRM entity types at data/service level;
- no Drive upload required yet.

## V2 CRM 02 — Google Drive Connection + Cloud Root Setup

Purpose:

- Google OAuth;
- minimal practical Drive scope;
- root-folder selection;
- create/find `root_folder/CRM`;
- server-side token handling;
- connection status in Settings.

Exit condition:

- authenticated lawyer can connect the office Drive and CRM can safely create/read metadata in the managed cloud root.

## V2 CRM 03 — Managed Folder Engine + Upload/Import

Purpose:

- entity-driven automatic folder hierarchy;
- Drive folder-ID mapping;
- upload files;
- adopt/import existing Drive file;
- safe naming/collision behavior;
- file metadata refresh.

Exit condition:

- uploading from Client/Matter/Accounting places files into correct managed folders without manual Drive navigation.

## V2 CRM 04 — Documents UI Everywhere + Link/Move/Rename

Purpose:

- common Documents component;
- Client/Matter/financial/accounting entity integration;
- link to another record;
- move physical storage home;
- rename;
- unlink;
- web opening behavior;
- right-click context menu;
- web `Open on desktop` disabled/greyed.

Exit condition:

- complete useful document workflow exists in web app using Drive.

## V2 CRM 05 — Electron Desktop Shell + Native File Bridge

Purpose:

- production-grade thin Electron wrapper;
- same deployed CRM UI;
- secure preload/IPC bridge;
- platform/capability detection;
- local open and Reveal in Finder primitives;
- Windows development support.

Exit condition:

- desktop app can load same CRM and safely open a test file using the OS default app without exposing generic filesystem access.

## V2 CRM 06 — Non-Technical Setup Wizard + Local Drive Mapping

Purpose:

- first-run wizard;
- Drive for desktop instructions;
- local folder picker;
- cloud/local marker verification;
- machine-local settings;
- reconfiguration through Settings.

Exit condition:

- a non-technical lawyer can configure Drive + local opening without terminal, config-file or environment-variable work.

## V2 CRM 07 — Desktop Document UX + Health/Reconciliation

Purpose:

- desktop primary Open behavior;
- Drive fallback context menu;
- Reveal in Finder;
- sync-pending state;
- red-X unavailable state;
- local-root-change preflight warning;
- recheck/reconciliation tools;
- bridge version compatibility behavior.

Exit condition:

- normal documents open locally; misconfigured/missing files degrade safely and visibly.

## V2 CRM 08 — Security, Cross-Platform Tests, macOS Packaging + Release Candidate

Purpose:

- OAuth/security audit;
- Electron security audit;
- migration/failure tests;
- Windows + macOS CI;
- Drive test-environment safeguards;
- macOS signing/notarization configuration;
- production setup docs;
- complete acceptance test.

Exit condition:

- V2 release candidate is safe to test with real office workflow after final review.

---

# 25. V2 Acceptance Criteria

V2 is functionally complete when all of the following are true.

## Shared data model

- [ ] One document may link to multiple CRM records.
- [ ] Every link is ownership-validated.
- [ ] Document identity survives rename and move.
- [ ] Existing V1 references are preserved/migrated.

## Google Drive

- [ ] Lawyer can connect office Google account.
- [ ] Lawyer can choose one cloud parent folder.
- [ ] CRM creates/owns exactly one child `CRM` tree below it.
- [ ] Upload from an entity automatically uses an appropriate managed folder.
- [ ] CRM can move and rename managed files without changing document identity.

## Web

- [ ] Documents visible from supported entities.
- [ ] Primary Open uses Google Drive web behavior.
- [ ] `Open in Google Drive` available from context menu.
- [ ] `Open on desktop` remains visible but disabled/greyed.
- [ ] Link/move/rename/unlink works without local desktop dependency.

## macOS desktop

- [ ] Same CRM UI/data as web.
- [ ] Local root stored per machine.
- [ ] Setup verifies cloud/local mapping.
- [ ] Primary Open opens synchronized local file with default macOS application.
- [ ] `.docx` opens in Word when Word is configured as default.
- [ ] `.xlsx` opens in Excel when Excel is configured as default.
- [ ] `Open in Google Drive` available in context menu.
- [ ] Reveal in Finder works.

## Reconfiguration/failure safety

- [ ] Changing local root performs preflight.
- [ ] User warned if existing linked documents will be unavailable locally.
- [ ] User may confirm the new root when marker is valid but some files are missing.
- [ ] Affected files show red X.
- [ ] Cloud Drive access remains available.
- [ ] Wrong-account/root marker mismatch prevents accidental save.

## Development/release

- [ ] Main development remains possible on Windows.
- [ ] Automated macOS build runs in CI.
- [ ] Mac smoke-test checklist documented.
- [ ] Desktop app is signed/notarized for non-technical installation before production use.
- [ ] Typecheck/lint/tests/build pass.

---

# 26. Manual End-to-End Acceptance Scenario

A representative final test:

1. Log into CRM on the Mac desktop app.
2. If unconfigured, follow the setup wizard with no technical assistance.
3. Connect the office Google account.
4. Select `Law Office` as cloud parent.
5. Confirm CRM creates `Law Office/CRM`.
6. Select the matching locally synced `Law Office` folder.
7. Verify setup successfully matches the marker.
8. Open Client `David Cohen`.
9. Upload `engagement-letter.docx` to the Client.
10. Verify Drive contains it under the CRM-managed Client folder.
11. Click the file in the desktop app.
12. Verify Microsoft Word opens the local synced file.
13. Edit and save in Word.
14. Verify the change synchronizes to Drive.
15. Open the same CRM from an ordinary browser/phone.
16. Verify the same document record is visible.
17. Click it and verify it opens through Google Drive web.
18. Verify `Open on desktop` is disabled in the browser.
19. Link the document to a Matter without duplicating it.
20. Move its storage home to that Matter.
21. Verify the Drive file moves to the Matter's managed folder but keeps one CRM document identity.
22. Link a PDF to a Client payment.
23. Upload a receipt to an Expense.
24. Verify both appear under their entities.
25. Change the Mac's local folder to a valid mapped folder in Settings.
26. Verify preflight checks existing documents.
27. Simulate a locally unavailable document.
28. Confirm red X appears and Google Drive fallback still works.
29. Run `Recheck documents` and verify repaired files return to normal state.

---

# 27. Future Extensions After This V2

These should not influence V2 implementation beyond sensible interfaces:

- Dropbox storage provider.
- Email synchronization.
- AI email classification/summarization with lawyer approval.
- OCR/document content extraction.
- AI document classification.
- Word/Excel template generation.
- AI-assisted legal drafting.
- automatic desktop updates.
- native iOS/iPadOS client.

Provider-neutral metadata and clean document/entity links should make these possible without rebuilding the core document system.

---

# Appendix A — Conceptual Data Model

```text
User
│
├── DriveIntegration
│   ├── provider = google_drive
│   ├── connected_account
│   ├── selected_parent_folder_id
│   ├── crm_root_folder_id
│   └── marker/install_id
│
├── Document
│   ├── provider_file_id
│   ├── name / MIME / metadata
│   ├── physical storage home
│   └── cloud state
│        │
│        └── DocumentLink[]
│             ├── Client
│             ├── Matter
│             ├── Payment/Charge
│             ├── Task/Deadline/Obligation
│             └── Accounting entity
│
└── Desktop machine local settings (NOT global DB path)
    ├── local_parent_path
    ├── validated marker
    └── bridge version
```

---

# Appendix B — Electron Bridge Boundary

Illustrative only; exact naming belongs to implementation:

```ts
type DesktopCapabilities = {
  platform: 'desktop';
  bridgeVersion: string;
  canOpenLocalFiles: boolean;
  canRevealInFinder: boolean;
  canChooseLocalRoot: boolean;
};

interface CrmDesktopBridge {
  getCapabilities(): Promise<DesktopCapabilities>;
  chooseLocalDriveRoot(): Promise<{ pathLabel: string } | null>;
  validateLocalRoot(): Promise<LocalRootValidation>;
  checkDocument(relativePath: string): Promise<DocumentLocalState>;
  openDocument(relativePath: string): Promise<OpenResult>;
  revealDocument(relativePath: string): Promise<OpenResult>;
}
```

The renderer must never receive a generic `openAnyPath()` or `runCommand()` capability.

---

# Appendix C — Recommended User-Facing Setup Copy Principles

Because the lawyer is non-technical:

- Say `Google Drive folder`, not `provider root identifier`.
- Say `Choose the same folder on this Mac`, not `map local mount point`.
- Say `Google Drive is still syncing`, not `ENOENT`.
- Show the connected Google account visibly.
- Prefer one action per screen.
- Provide `Check again` and `Choose another folder` recovery actions.
- Never ask the user to paste OAuth tokens, file IDs or filesystem paths manually.
- Never require Terminal for normal setup.

---

# Appendix D — Technical Assumptions Verified Against Official Documentation

The implementation plan relies on the following currently documented platform capabilities:

1. Google Drive for desktop supports both streaming and mirroring. Mirrored My Drive files are stored locally and in the cloud and remain available offline; Shared Drives can only be streamed.  
   https://support.google.com/drive/answer/13401938

2. Google Drive for desktop on macOS exposes Drive content through Finder and synchronizes local/cloud changes.  
   https://support.google.com/drive/answer/10838124  
   https://support.google.com/drive/answer/12178485

3. Google Picker can be used to let users select/upload Drive content, and Google documents use of the `drive.file` scope for user-authorized files.  
   https://developers.google.com/workspace/drive/picker/guides/web-picker

4. The Drive API supports creating/uploading files and maintaining stable Drive file IDs independently of human-readable folder names.  
   https://developers.google.com/workspace/drive/api/guides/create-file  
   https://developers.google.com/workspace/drive/api/guides/manage-uploads

5. Electron `BrowserWindow` can load a remote URL; Electron recommends context isolation/sandboxing and provides `shell.openPath()` / `shell.showItemInFolder()` for default-application and file-manager integration.  
   https://www.electronjs.org/docs/latest/api/browser-window  
   https://www.electronjs.org/docs/latest/tutorial/security  
   https://www.electronjs.org/docs/latest/api/shell

6. Electron recommends code signing for distributed apps; macOS release normally includes code signing and notarization.  
   https://www.electronjs.org/docs/latest/tutorial/code-signing

---

# Final Planning Rule

V2 should feel to the lawyer like this:

> Files simply belong to the Client, Matter, payment or accounting item she is looking at. The CRM silently keeps those files organized in Google Drive. On the Mac, clicking a file opens the normal local Office application; everywhere else, the same CRM and same file remain available through the web.

The technical folder hierarchy, Drive IDs, local paths, OAuth and Electron bridge exist to support that experience and should remain mostly invisible to the user.
