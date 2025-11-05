# Commiter Release Notes

This document summarizes every published version of `@programinglive/commiter`. Refer to the generated [CHANGELOG](../../CHANGELOG.md) for commit-level details.

| Version | Date | Highlights |
|---------|------|------------|
| 1.1.0 | 2025-10-29 | 📝 Documentation – clarified release automation flow. |
| 1.0.12 | 2025-10-29 | ✨ Feature – autodetects project test command before releasing. |
| 1.0.11 | 2025-10-29 | 📝 Documentation – added project status and download badges. |
| 1.0.10 | 2025-10-29 | Maintenance release; no additional notes provided. |
| 1.0.9 | 2025-10-29 | ✨ Feature – introduced a new capability (see changelog commit `e1603c1`). |
| 1.0.8 | 2025-10-29 | ✨ Feature – added release helper script and tests. |
| 1.0.7 | 2025-10-29 | ✨ Feature – added release helper script and tests. |
| 1.0.6 | 2025-10-19 | Maintenance release; no additional notes provided. |
| 1.0.5 | 2025-10-19 | 🐛 Bug Fix – allowed release commits to include emoji. |
| 1.0.4 | 2025-10-19 | 🐛 Bug Fix – ensured safe default test script for initial release. |
| 1.0.3 | 2025-10-19 | Maintenance release; no additional notes provided. |
| 1.0.2 | 2025-10-19 | Maintenance release; no additional notes provided. |
| 1.0.1 | 2025-10-18 | 🐛 Bug Fix – aligned commitlint config with project module type. |
| 1.0.0 | 2025-10-17 | ✨ Initial release – bootstrapped conventional release tooling; added community docs and metadata. |

## fs.F_OK Deprecation Warning Fix (Unreleased)
- Eliminated the `[DEP0176] fs.F_OK` warning emitted during release commands by injecting a preload script that transparently rewrites `fs.F_OK` usage inside `standard-version`.
- Ensured the preload script runs for both in-process unit tests and the child process that executes `standard-version` by appending a `--require` flag to `NODE_OPTIONS`.
- Updated the test suite to cover the preload behaviour and the adjusted release workflow, switching the project to Node’s built-in test runner (`node --test`).

### Impact
- Release logs are now warning-free, reducing CI noise and operator confusion.
- Future dependency updates remain safe because no files under `node_modules` are modified.
- The new tests guard against regressions in the preload integration.

### Testing
- `node --test`
