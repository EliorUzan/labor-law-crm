# Engineering guide

Start each task by reading `CRM_AI_PROJECT_CONTEXT.md`, `PRODUCT_REQUIREMENTS.md`,
and the relevant documentation in `docs/`. `docs/ARCHITECTURE.md` records technical
boundaries; `docs/DATA_MODEL.md` records V1 domain meanings.

- Preserve the simple modular-monolith architecture and Client → Matter ownership.
- Work only within the requested module; do not make unrelated refactors.
- Keep TypeScript strict and validate external input at server boundaries.
- Make schema changes through checked-in database migrations; do not put secrets in source control.
- Preserve Hebrew-first, RTL-first, responsive UI behavior; keep English values such as URLs and email usable.
- Keep forms minimal and optional fields optional. Hide missing optional values in normal display where required.
- Keep Tasks, Deadlines, and Important Dates as distinct user-facing concepts.
- Do not implement V2/V3 functionality unless explicitly requested.
- Before adding an abstraction, ask whether the current product requirement needs it; choose the simpler design when it does not.
- Run the relevant lint, typecheck, tests, and build checks before handoff.
