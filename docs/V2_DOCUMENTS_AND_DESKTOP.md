# V2 filesystem-first Documents and desktop boundary

## Source of truth

The user selects one local folder already synchronized by Google Drive for
Desktop. Real files below that root are the files the CRM manages or links.
PostgreSQL stores owner-scoped Document metadata, canonical root-relative paths,
and finite CRM links. Google Drive for Desktop performs synchronization.

Google OAuth, Drive Picker/API upload/move/rename, Drive folder IDs, and provider
file IDs are not part of the core V2 document system. A later browser-access
feature may introduce an API integration only with explicit requirements.

## One CRM, two clients

The Next.js application remains the only CRM UI/backend. Electron is a thin
native shell around the same URL; the browser UI works without desktop-only
capabilities.

The renderer is untrusted: Electron keeps `nodeIntegration: false`, context
isolation and sandboxing enabled, allows only the configured CRM origin, and
exposes no generic filesystem, shell, or command API. Shared React code reaches
desktop functions only through the browser-safe adapter.

## Future native filesystem operations

Named, sender-validated IPC operations may later choose/validate the local root,
link an existing file inside it, import an outside file into the managed `CRM/`
tree, open/reveal a resolved file, or move/rename it. Each operation must:

- accept CRM-relative paths, not arbitrary absolute paths;
- normalize input and reject `..` traversal and absolute-path injection;
- prove the resolved path stays under the configured root, including symlink
  handling;
- avoid silently overwriting a filename collision.

Existing files anywhere below the root are linked without moving/copying. Files
outside the root are imports and are copied into the managed hierarchy. The
database root is intentionally absent: it is machine-local configuration, not a
universal user setting.
