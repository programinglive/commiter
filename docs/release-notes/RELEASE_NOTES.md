# Commiter Release Notes

This document summarizes every published version of `@programinglive/commiter`. Refer to the generated [CHANGELOG](../../CHANGELOG.md) for commit-level details.

| Version | Date | Highlights |
|---------|------|------------|
| 1.6.1 | 2026-11-13 | **release:** report path escapes before allowlist misses (80811b1) |
| 1.6.0 | 2026-11-13 | **release:** support validated additional release files (f87ce93) |
| 1.5.1 | 2026-11-12 | **plan:** migrate the eight repos to release v2 (ad0457f) |
| 1.5.0 | 2026-11-12 | **release:** create the GitHub Release and deploy the site from one tag (#1) (ecaa6a6) |
| 1.3.0 | 2026-11-06 | enforce test cases presence and execution before commit in pre-commit hook (5867720) |
| 1.2.20 | 2026-01-01 | update release notes for v1.2.19 📋 (87759c1) |
| 1.2.19 | 2026-01-01 | finalize v1.2.18 release notes and website update (034faa5) |
| 1.2.18 | 2026-01-01 | Add usage safety warnings and MCP workflow tips |
| 1.2.17 | 2025-12-26 | **web:** update homepage for v1.2.16 release (c4ba36e) |
| 1.2.16 | 2025-12-13 | upgrade to node 20 and update npm for OIDC (5f7d9a0) |
| 1.2.15 | 2025-12-13 | remove registry-url to fix OIDC auth conflict (c49b6e8) |
| 1.2.14 | 2025-12-13 | remove legacy auth token env (8508deb) |
| 1.2.13 | 2025-12-13 | enable npm trusted publishing (OIDC) with provenance (5e1e852) |
| 1.2.12 | 2025-12-13 | cleanup and add deployment scripts (4124b5f) |
| 1.2.11 | 2025-12-11 | cleanup and add deployment scripts (4124b5f) |
| 1.2.10 | 2025-12-11 | enhance release workflow with first release support and patch defaults (d5f1334) |
| 1.2.9 | 2025-12-05 | add release:first script (0240fce) |
| 1.2.8 | 2025-12-02 | remove website auto updates (c6f2498) |
| 1.2.7 | 2025-12-02 | remove website auto updates (c6f2498) |
| 1.2.6 | 2025-11-30 | tests only run during release, not on commit (15600a0) |
| 1.2.5 | 2025-11-29 | **release:** v1.2.4 🚀 (23e546a) |
| 1.2.4 | 2025-11-27 | **release:** 1.2.3 (9d12f7e) |
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





































## 1.6.1

Released on **2026-11-13**.

- **release:** report path escapes before allowlist misses (80811b1)

## 1.6.0

Released on **2026-11-13**.

- **release:** support validated additional release files (f87ce93)
- **plan:** record the 1.5.1 engine and the ERP contract test (f610e2b)
- **release:** add the first production release checklist (73b82b2)
- **release:** document recovery and configuration (5eadcee)
- **release:** classify concurrent publication failures safely (c78bceb)
- **release:** keep transport failures UNKNOWN and revalidate staged paths (32ca277)
- **release:** cover failure classification and path safety (0d8daf3)
- **release:** cover transport failure and post-preflight symlink (0621ddb)
- **plan:** migrate the eight repos to release v2 (ad0457f)
- **web:** show v1.5.0 and the atomic release flow (17478c9)
- **release:** translate engine messages to English (e110be5)

## 1.5.1

Released on **2026-11-12**.

- **plan:** migrate the eight repos to release v2 (ad0457f)
- **web:** show v1.5.0 and the atomic release flow (17478c9)
- **release:** translate engine messages to English (e110be5)

## 1.5.0

Released on **2026-11-12**.

- **release:** create the GitHub Release and deploy the site from one tag (#1) (ecaa6a6)
- **release:** skip npm publish when the version already exists (#2) (0086d9b)
- **release:** gate every release and keep the tag annotated (584299e)
- **release:** adopt the v2 engine with atomic publication (91fcd59)
- **release:** prove concurrency and per-phase failure handling (4cfc0d4)
- audit the release v2 overlay before adopting it (#5) (57c84b1)
- compact session handover and the plan to adopt release v2 (#6) (639d9c0)
- explain how commiter works, and correct the README (#4) (1479737)
- **release:** describe the v2 flow and the recovery path (fc7ac39)
- **web:** show 1.4.0 and document the release command (#3) (2cbefe6)

## 1.3.0

Released on **2026-11-06**.

- See CHANGELOG for details.

## 1.2.20 – 📝 Documentation

Released on **2026-01-01**.

- update release notes for v1.2.19 📋 (87759c1)
- add comment for complete release test (b87d0f5)

## 1.2.19 – 📝 Documentation

Released on **2026-01-01**.

- finalize v1.2.18 release notes and website update (034faa5)
- update README, restore PRD, and enhance website features (451ef7b)
- enhance release process with clear git operation guidance and auto-commit option (91171e2)

## 1.2.18 – 📝 Documentation

Released on **2026-01-01**.

- **release-notes:** add 1.2.17 entry (0a79779)
- **web:** refresh homepage content for v1.2.17 (2fc6666)
- add usage warning and MCP dev-workflow tip (df7bc00)
- add automated tests for usage warnings (af6283e)

## 1.2.17 – 📝 Documentation

Released on **2025-12-26**.

- **web:** update homepage for v1.2.16 release (c4ba36e)
- **release:** enforce PRD presence warning (227e237)

## 1.2.16 – 👷 Continuous Integration

Released on **2025-12-13**.

- upgrade to node 20 and update npm for OIDC (5f7d9a0)

## 1.2.15 – 👷 Continuous Integration

Released on **2025-12-13**.

- remove registry-url to fix OIDC auth conflict (c49b6e8)

## 1.2.14 – 👷 Continuous Integration

Released on **2025-12-13**.

- remove legacy auth token env (8508deb)

## 1.2.13 – 👷 Continuous Integration

Released on **2025-12-13**.

- enable npm trusted publishing (OIDC) with provenance (5e1e852)

## 1.2.12 – 🧹 Chores

Released on **2025-12-13**.

- cleanup and add deployment scripts (4124b5f)
- **release:** 1.2.11 🚀 (2bbf62a)
- resolve npm pkg warnings (6d7a193)
- **setup:** surface first release commands (8701e9a)

## 1.2.11 – 🧹 Chores

Released on **2025-12-11**.

- cleanup and add deployment scripts (4124b5f)
- **setup:** surface first release commands (8701e9a)

## 1.2.10 – ✨ Features

Released on **2025-12-11**.

- enhance release workflow with first release support and patch defaults (d5f1334)

## 1.2.9 – 🧹 Chores

Released on **2025-12-05**.

- add release:first script (0240fce)
- update gitignore and release notes (c12f935)
- document release:first command and update tests (876a208)

## 1.2.8 – ♻️ Refactors

Released on **2025-12-02**.

- remove website auto updates (c6f2498)
- **release:** 1.2.7 🚀 (cb97edc)
- add netlify.toml for static site deployment (2f70ec7)

## 1.2.7 – ♻️ Refactors

Released on **2025-12-02**.

- remove website auto updates (c6f2498)

## 1.2.6 – 🐛 Bug Fixes

Released on **2025-11-30**.

- tests only run during release, not on commit (15600a0)

## 1.2.5 – 🧹 Chores

Released on **2025-11-29**.

- **release:** v1.2.4 🚀 (23e546a)
- add integration tests to verify web updates are only for commiter (8b2b1ad)

## 1.2.4 – 🧹 Chores

Released on **2025-11-27**.

- **release:** 1.2.3 (9d12f7e)
- **web:** improve terminal layout and animation (6d196f4)

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
