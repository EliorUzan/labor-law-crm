# V2 CRM 01 — Filesystem-first Document model

## Scope

CRM 01 establishes the persistent Document domain only. It does not add file
selection, import, folder creation, rename/move, opening, Settings UX, or Google
OAuth/Drive API work.

## Identity and paths

`documents.id` is the durable CRM identity. Each Document represents one real
file below the user's configured synchronized root. `relative_path` is the
canonical slash-delimited path from that root, never an absolute machine path.
It is owner-scoped and unique so the same file is not registered twice.

Documents store display name and optional MIME type, extension, byte size, and
file-modified timestamp. They contain no provider/file ID, Drive URL, legacy
reference fields, storage-home target, or cloud-state abstraction.

## Links and ownership

`document_links` associates a Document with an allowlisted substantive CRM
record. One Document may have many links; `(document_id, target_type, target_id)`
is unique. The document service validates both the Document and the target against
the authenticated owner before every read or mutation. The target allowlist covers
the implemented Client, Matter, work, financial, and accounting records only; it
is not a generic entity graph.

Unlinking removes only the association. It never deletes a Document record or a
physical file.

## V1 removal and corrective migration

The old `document_references` note-style feature is removed, with no migration,
compatibility adapter, or `legacy_reference` record. Migration `0008` drops that
table. It also repairs development databases that ran the discarded provider-ID
schema, replacing it with the filesystem-first tables. No V1 document data is
copied into V2 Documents.

## Deferred filesystem behavior

The desktop/native bridge will later choose and validate the synchronized root,
resolve only canonical relative paths beneath it, reject absolute/traversal and
symlink escapes, and perform imports or managed-folder operations. Google Drive
for Desktop synchronizes the real files; this CRM does not implement file sync,
Google OAuth, or Drive APIs for the core model.
