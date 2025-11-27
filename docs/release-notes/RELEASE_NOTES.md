# Commiter Release Notes

This document summarizes every published version of `@programinglive/commiter`. Refer to the generated [CHANGELOG](../../CHANGELOG.md) for commit-level details.

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.3 | 2025-11-27 | automate website releases timeline updates from release notes (5abf788) |
| 1.2.2 | 2025-11-27 | update homepage url (556b173) |
| 1.2.1 | 2025-11-26 | **release:** improve website version update reliability (18f5ace) |
| 1.2.0 | 2025-11-26 | See CHANGELOG for details. |
| 1.1.11 | 2025-11-26 | **website:** add open graph social media preview (7a2f911) |
| 1.1.10 | 2025-11-26 | **website:** add professional landing page and release tools (ec53e2d) |
| 1.1.9 | 2025-11-24 | convert release scripts to CJS to support ESM projects (842da02) |
| 1.1.8 | 2025-11-22 | update installation script to copy missing files and update gitignore (5d56259) |
| 1.1.7 | 2025-11-11 | recommend dev workflow mcp server (58a5054) |
| 1.1.6 | 2025-11-05 | revert to simple release notes staging to avoid git ref conflicts (2f6a40e) |
| 1.1.5 | 2025-11-05 | include release notes in release commit via amendment (3f2afa8) |
| 1.1.4 | 2025-11-05 | simplify release notes staging to avoid git ref conflicts (d4077aa) |
| 1.1.3 | 2025-11-05 | See CHANGELOG for details. |
| 1.1.2 | 2025-11-05 | auto-update release notes during release (99d1043) |
| 1.1.1 | 2025-11-05 | 🐛 Bug Fix – removed the fs.F_OK deprecation warning from release runs. |
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















## 1.2.3 – ✨ Features

Released on **2025-11-27**.

- automate website releases timeline updates from release notes (5abf788)

## 1.2.2 – 🧹 Chores

Released on **2025-11-27**.

- update homepage url (556b173)

## 1.2.1 – 🐛 Bug Fixes

Released on **2025-11-26**.

- **release:** improve website version update reliability (18f5ace)
- **website:** read version from git tags instead of package.json (8fe8af8)
- **project:** update documentation and release scripts (88d02c6)

## 1.2.0

Released on **2025-11-26**.

- See CHANGELOG for details.

## 1.1.11 – 📝 Documentation

Released on **2025-11-26**.

- **website:** add open graph social media preview (7a2f911)

## 1.1.10 – ✨ Features

Released on **2025-11-26**.

- **website:** add professional landing page and release tools (ec53e2d)

## 1.1.9 – 🐛 Bug Fixes

Released on **2025-11-24**.

- convert release scripts to CJS to support ESM projects (842da02)

## 1.1.8 – 🐛 Bug Fixes

Released on **2025-11-22**.

- update installation script to copy missing files and update gitignore (5d56259)

## 1.1.7 – 📝 Documentation

Released on **2025-11-11**.

- recommend dev workflow mcp server (58a5054)

## 1.1.6 – 🐛 Bug Fixes

Released on **2025-11-05**.

- revert to simple release notes staging to avoid git ref conflicts (2f6a40e)

## 1.1.5 – ✨ Features

Released on **2025-11-05**.

- include release notes in release commit via amendment (3f2afa8)
- update release notes for v1.1.5 (cb3dbe6)

## 1.1.4 – 🐛 Bug Fixes

Released on **2025-11-05**.

- simplify release notes staging to avoid git ref conflicts (d4077aa)

## 1.1.3

Released on **2025-11-05**.

- See CHANGELOG for details.

## 1.1.2 – 🧹 Chores

Released on **2025-11-05**.

- auto-update release notes during release (99d1043)

## 1.1.1 – fs.F_OK Deprecation Warning Fix

Released on **2025-11-05**.
- Eliminated the `[DEP0176] fs.F_OK` warning emitted during release commands by injecting a preload script that transparently rewrites `fs.F_OK` usage inside `standard-version`.
- Ensured the preload script runs for both in-process unit tests and the child process that executes `standard-version` by appending a `--require` flag to `NODE_OPTIONS`.
- Updated the test suite to cover the preload behaviour and the adjusted release workflow, switching the project to Node’s built-in test runner (`node --test`).

### Impact
- Release logs are now warning-free, reducing CI noise and operator confusion.
- Future dependency updates remain safe because no files under `node_modules` are modified.
- The new tests guard against regressions in the preload integration.

### Testing
- `node --test`
