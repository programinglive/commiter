# Adopt Release v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the current release engine with the v2 design (atomic push,
single commit and tag, OID-verified publication) and migrate eight repos to it.

**Architecture:** One engine in `lib/release.js`. `scripts/release.cjs` becomes a
thin wrapper. Generation never creates a commit or tag; the engine creates exactly
one of each, then publishes branch and tag in one `git push --atomic`.

**Tech Stack:** Node 18+ CommonJS, `node:test`, `standard-version`, real git repos
with local bare remotes for integration tests.

**Spec:** `docs/AUDIT-RELEASE-V2.md` (10 findings) and
`docs/HOW-IT-WORKS.md` (current behaviour).

## Global Constraints

- Node 18+, CommonJS, no new dependencies.
- Never `git push --tags`, `--force`, or `--follow-tags`.
- No fallback to a non-atomic push. If the remote rejects atomic, the release fails.
- Never roll back when the remote may already hold the push.
- Tests use temporary repos and local bare remotes only. No real remote, no publish.
- Conventional Commits, max 100 chars per line.

## Review Focus

1. A failure after generation must not leave the tree dirty (D1).
2. Paths with spaces must survive staging (D2).
3. A single-commit repo must be releasable (D3).
4. A verify failure must name the failing test, not just an exit code (D4).
5. Two concurrent releases from the same parent must not both succeed.

---

### Task 1: Apply the overlay and fix D1–D4

**Files:**
- Replace: `lib/release.js`, `lib/release-notes.js`, `scripts/release.cjs`
- Modify: `index.js` (route `release` to the engine)
- Test: `test/release-v2.test.cjs`, `test/release-integration.test.cjs`

**Interfaces:**
- Consumes: nothing
- Produces: `runRelease({cwd, type, extraArgs, log}) -> {ok, state, tag, commit, reason}`
  where `state` is `PUBLISHED | PLAN_ONLY | FAILED | UNKNOWN | MANUAL_RECOVERY`

- [ ] **Step 1: Apply the overlay on a branch, run its tests unchanged**

```bash
git checkout -b feat/release-v2
# copy the seven overlay files into place
node --test test/release-v2.test.cjs test/release-integration.test.cjs
```

Expected: the overlay's own tests pass. Record the count.

- [ ] **Step 2: Write failing tests for D1–D4**

- D1: verify fails after generation → `git status --porcelain` is empty afterwards
- D2: a changed file whose name contains a space is staged correctly
- D3: a repo with exactly one commit can release
- D4: verify failure reason contains the failing command's output

- [ ] **Step 3: Fix D1–D4**

- D1: capture the generated file list before generation; on failure before commit,
  `git restore --source=<originalHead> -- <paths>` and delete files the generator
  created. Never touch paths outside the allowlist.
- D2: use `git status --porcelain=v1 -z` and split on `\0`.
- D3: compare parent OIDs with `git rev-list --parents -n1 HEAD` instead of `HEAD^`.
- D4: capture verify output instead of `stdio: 'inherit'`; include the last 20
  lines in the failure reason.

- [ ] **Step 4: Run everything**

```bash
node --test
```

Expected: all suites pass, including the 87 existing tests.

- [ ] **Step 5: Commit**

```bash
git add lib scripts index.js test
git commit -m "feat(release): adopt the v2 engine with atomic publication"
```

---

### Task 2: Concurrency and fault-injection tests

**Files:**
- Create: `test/release-concurrency.test.cjs`
- Create: `test/release-faults.test.cjs`

**Interfaces:**
- Consumes: `runRelease` from Task 1
- Produces: proof for the five Review Focus items and the 27 cases in the task brief

- [ ] **Step 1: Concurrency**

Two processes release from the same parent: same type, patch+minor, minor+major.
Exactly one succeeds; the other fails with a reason naming the remote state.

- [ ] **Step 2: Fault injection per phase**

Inject a failure at: generate, verify, commit, tag, push, remote verification.
For each, assert the resulting `state` and that the tree is either clean
(`FAILED`) or preserved (`UNKNOWN`).

- [ ] **Step 3: Atomic push rejection**

A remote that rejects atomic push must fail the release, not fall back.

- [ ] **Step 4: Run and commit**

```bash
node --test test/release-concurrency.test.cjs test/release-faults.test.cjs
git commit -m "test(release): prove concurrency and per-phase failure handling"
```

---

### Task 3: Documentation

**Files:** `README.md`, `docs/HOW-IT-WORKS.md`, `docs/RELEASE-RECOVERY.md`

- [ ] **Step 1: Update the flow description** to the v2 order (generate → verify →
  one commit → one tag → atomic push → OID verification).
- [ ] **Step 2: Write `docs/RELEASE-RECOVERY.md`** covering `UNKNOWN` and
  `MANUAL_RECOVERY`: what to inspect, what not to retry, how to finish by hand.
- [ ] **Step 3: Document the breaking changes**: `commiter.release.branch` is
  required per repo, and `--first-release` now requires version `0.0.0`.
- [ ] **Step 4: Commit**

---

### Task 4: Migrate the eight repos

**Files:** `package.json` in each repo; delete `scripts/release.cjs`

- [ ] **Step 1: One repo, one commit, in this order**

`clinic` → `belajar` → `mgm` → `reseller` → `programinglive` → `zettly` →
`hris` → `erp`

Per repo: add `commiter.release.branch` (`master` for ERP, `main` otherwise),
point the four `scripts.release*` entries at `commiter release`, `npm install`,
`git rm scripts/release.cjs`, commit, push, MR, merge.

- [ ] **Step 2: Verify per repo**

```bash
git grep -n "scripts/release" || echo bersih
npm ls @programinglive/commiter
```

---

### Task 5: Regression guard

**Files:** `bw-server-grooming/monitoring/tests/test_release_tag_push.py`

- [ ] **Step 1: Write the test** — fails if a repo has `scripts/release.cjs`,
  if `scripts.release` is not `commiter release`, or if the package version is
  below the v2 release.
- [ ] **Step 2: Prove it can fail** by restoring one local copy temporarily.
- [ ] **Step 3: Commit**

---

## Verification

| Case | Passes when |
|---|---|
| Normal patch / minor / major / prerelease | tag published, OID matches |
| Dirty tree, detached HEAD, wrong branch | fails before any mutation |
| Local behind remote | fails with a sync message |
| Unknown CLI flag | fails before spawning anything |
| Verify fails | tree clean afterwards, reason names the failure |
| Tag collision | fails, no commit created |
| Two concurrent releases | exactly one succeeds |
| Atomic push rejected | fails, no fallback |
| Push accepted but connection dropped | `PUBLISHED` if OIDs match, else `UNKNOWN` |
| Remote verification fails | `UNKNOWN`, local commit and tag preserved |
| Dry run | no mutation at all |

## Rollback

Per repo: `git revert` one commit. The engine itself is one branch; reverting it
restores the previous `lib/release.js`.
