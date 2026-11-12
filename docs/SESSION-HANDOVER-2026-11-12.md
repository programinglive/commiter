# Session handover — 12 November 2026

Compact record of what shipped, what is pending, and the decisions that shaped it.
Read this before starting new work on Commiter.

---

## 1. Shipped and verified

| Area | Evidence |
|---|---|
| Factory removed from the MCP surface | PR #89 → `63ca009`; tools 64→57; 0 Factory mentions; 1768 tests pass |
| Factory removed from 3 hosts | 0 cron, 0 unit, 0 script, 0 process; `factory-backup.json` → HTTP 404 |
| Factory removed from the ops repo | PR #20; 15 scripts + 5 tests deleted; 686 tests pass |
| Factory archive preserved | GCS permanent prefix, 45 objects, `integrity_check=ok` (76 projects / 858 tasks) |
| Notifications unified through BOTOL | `deliveryRate 100%`, 0 failed; webhook fallbacks removed |
| One fleet health card for 4 hosts | delivered; unreachable host renders `DOWN` with the reason |
| Disk `bw-server-clean` 75% → 52% | WAL 31→19 GB, binlog 12→2.5 GB, retention automated and tested (7/7) |
| Notification catalog 17 → 9 entries | `catalog validate PASS` |
| ERP release notes moved to the standard path | MR !779, pipeline success |
| `commiter@1.4.0` published | `gitHead` = our release commit; tarball contents verified |
| Release workflow: npm + GitHub Release + site | PR #1, #2; v1.4.0 release created, site deployed |
| Site shows 1.4.0 and documents `commiter release` | live page verified, 30.908 bytes |
| `docs/HOW-IT-WORKS.md` | full design explanation, 8 limitations, 6 open questions |
| Release v2 overlay audited | `docs/AUDIT-RELEASE-V2.md`, 10 findings |

## 2. Pending

| Item | Blocker |
|---|---|
| Adopt the v2 release engine | D1–D4 must be fixed first (see the audit) |
| Migrate 8 repos to `commiter release` | needs the v2 engine |
| Publish 1.5.0 | needs the v2 engine and a passing proof harness |
| Regression guard test | needs the migration done |
| `bw-server-clean` disk at 52% | healthy, but retention must keep running |

## 3. Decisions worth remembering

1. **One correct behaviour, not parity.** Where a legacy script is defective, fix
   it; do not preserve the defect for the sake of equivalence.
2. **`npm publish` is irreversible**, so the order is: build → pack a tarball →
   prove it against a local bare remote → publish.
3. **Never test a release against a real remote.** `/etc/deploy/PRODUCTION_ENABLED`
   exists and `deploy_tags.sh` runs every 5 minutes, so a test tag would deploy
   ERP to production within five minutes.
4. **Rollback uses `git reset --mixed`, never `--hard`.** A library must not
   discard the operator's file changes.
5. **A missing warning looks identical to no problem.** Every check that cannot
   run must say so, not stay silent.
6. **Grep is not analysis.** A feature matrix built with regex reported "ERP has
   release notes" when the path differed, and "ERP pushes tags" when the tag
   source differed. Both conclusions were wrong.

## 4. Where things live

| What | Where |
|---|---|
| Release engine (current) | `D:\code\commiter\lib\release.js` |
| v2 overlay (candidate) | `C:\Users\DHIKA\Desktop\commiter-release-v2-overlay.zip` |
| v2 audit | `D:\code\commiter\docs\AUDIT-RELEASE-V2.md` |
| Design explanation | `D:\code\commiter\docs\HOW-IT-WORKS.md` |
| Behaviour spec | `bw-server-grooming/docs/superpowers/specs/2026-11-12-commiter-release-behaviour.md` |
| SDD ledger (all rulings) | `C:\Users\DHIKA\AppData\Local\Temp\opencode\sdd\2026-11-12-rilis-berbasis-tag\progress.md` |

## 5. State of the eight repos

All eight still use their own `scripts/release.cjs`. Only ERP pushes its tag.
Nothing has been migrated, so no production behaviour has changed.
