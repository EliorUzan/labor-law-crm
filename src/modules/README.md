# Planned module boundaries

This directory is deliberately a map, not an implementation. Each V1 module will
own its domain UI, validation, and server-side application logic when its focused
implementation thread begins.

```text
modules/
  dashboard/       # Dashboard composition and read models
  clients/         # Clients, payments, and client obligations
  matters/         # Matters, history, and matter notes
  work/            # Tasks, legal deadlines, and important dates
  accounting/      # Lightweight office accounting records
  documents/       # V1 document references only
  search/          # Global search
  settings/        # Account and application preferences
```

Do not make a cross-cutting “generic entity” module. Shared components and helpers
belong in `src/components` and `src/lib` only when an actual implemented module
needs them.
