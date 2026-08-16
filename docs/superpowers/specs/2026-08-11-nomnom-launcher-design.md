# Nomnom Launcher + Split Enhancements — Design Record

This records the decisions from the 2026-08-11 grilling session that shaped the
launcher/registry refactor and the six Split enhancements (session rename to
"Nomnom", deferred creation, the styled combobox, name-frequency remembering,
the guided custom-color palette, and app-aware backup v2). It's the decision
history behind `docs/superpowers/plans/2026-08-11-nomnom-launcher-refactor.md`;
see that plan for the full task-by-task implementation.

## Design summary (from grilling session, 2026-08-11)

| # | Decision |
|---|---|
| 1 | "night" → **"Nomnom"** in UI copy only; `Night` type unchanged. |
| 2 | **Deferred creation**: `/split/new` form + Create button; back = discard. Enabled once a name is typed or ≥1 person added; empty name defaults to today's date. |
| 3 | Native `<datalist>` → reusable **`Combobox`** (anchored, styled, keyboard nav, "Add '<typed>'"). |
| 4 | A name auto-joins Common names once it appears in **3+ distinct Nomnoms** (case-insensitive); one-time, persisted, deletable, never silently re-added. Manual add stays. |
| 5 | **Launcher** at `/`: 2-col icon grid (3-col wide), registry-driven; Split icon `Receipt`. Routes `/split`, `/split/new`, `/split/night/:id`, `/split/archive`, `/split/names`, global `/settings`. |
| 6 | Structure: `apps/split/` + `shared/` + `launcher/` + `settings/`; per-app store `useSplitStore`; global theme. |
| 7 | Palettes: Default, Coffee, **Custom** (guided modal, 6 plain-language colors → 19 derived; single fixed set, mode toggle hidden when Custom active; advanced JSON import/export). |
| 8 | **Backup** global + app-aware + includes appearance: `{ version:2, apps:{ split:{ nights, knownNames, promotedNames } }, appearance:{ palette, mode, custom? } }`; v1 files still import. |
