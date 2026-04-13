# NekoServe Changelog

Each released version of NekoServe has its own standalone markdown file in this directory. The content of that file is the source of truth for the corresponding GitHub Release notes — the release workflow reads `changelog/vX.Y.Z.md` at tag-push time and uses it as the release body.

## Conventions

- **One file per version**, named `vX.Y.Z.md` (semver, lowercase `v` prefix).
- **Release notes are per-version, not cumulative.** Only describe what changed in that specific version; do not re-summarize earlier releases.
- **Downloads table** at the bottom lists the artifacts that the release workflow attaches (Windows portable `.exe`, macOS `.dmg` / `.zip`, Linux `AppImage` where applicable).
- New versions should also bump `package.json`, `package-lock.json`, and `src/renderer/src/i18n/locales/{zh-TW,en}/about.json`'s `version` field before tagging.

## Versions

- [v0.2.0](v0.2.0.md) — Full bilingual i18n (zh-TW / en), typed translation keys, native menu localization, structured error codes, English CSV headers, Windows build fix. _2026-04-13_
- [v0.1.0](v0.1.0.md) — Initial public release. Simulation core, 4 pages, scenario comparison, CSV/JSON exports, learning sidebar. _2026-04-13_
