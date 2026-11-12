# Migrate the eight repos to Release v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point all eight consumer repositories at `commiter release` (engine 1.5.1) and remove their local `scripts/release.cjs`, without touching uncommitted work.

**Architecture:** Each repo gets one branch, one commit, one MR. The commit adds `commiter.release.branch`, rewrites the `release*` npm scripts to `commiter release`, installs `@programinglive/commiter@1.5.1`, and deletes `scripts/release.cjs`. Repos with uncommitted work are migrated in a git worktree cut from `origin/<default>`, so the operator's working tree is never touched.

**Tech Stack:** Node 18+, npm, git worktrees, GitLab/GitHub MRs.

**Spec:** `docs/AUDIT-RELEASE-V2.md` (D5, D6), `docs/RELEASE-V2-OPERATIONS.md` (migration checklist), `docs/HOW-IT-WORKS.md` (v2 flow).

## Global Constraints

- Engine version is `@programinglive/commiter@1.5.1` (published, `gitHead` `0d58b4c`).
- Default branch per repo: `master` for clinic, belajar, mgm, reseller, erp; `main` for programinglive, zettly, hris.
- `commiter.release.branch` must equal the repo's default branch.
- Never commit or push another session's uncommitted work. Dirty repos are migrated in a worktree from `origin/<default>`.
- One repo, one branch, one MR. No production release is run during migration; only `--dry-run` after merge.
- `scripts/release.cjs` must not remain in any repo.
- Keep the dependency where it already lives: `dependencies` for belajar, `devDependencies` for the rest.

## Review Focus

1. A repo whose default branch is `master` must not be configured with `main`.
2. Belajar keeps `@programinglive/commiter` in `dependencies`, not `devDependencies`.
3. ERP has no commiter dependency; it must be added as a `devDependency`.
4. mgm and reseller have no `docs/release-notes/RELEASE_NOTES.md`; the engine must skip notes, not fail.
5. A dirty working tree must never be committed; worktree isolation is the guard.

---

### Task 1: Migrate mgm (reference, clean, master)

**Files:**
- Modify: `D:\code\mgm.beautyworld.co.id\package.json`
- Delete: `D:\code\mgm.beautyworld.co.id\scripts\release.cjs`

**Interfaces:**
- Consumes: `commiter release` from `@programinglive/commiter@1.5.1`
- Produces: the exact package.json shape every later task copies

- [ ] **Step 1: Branch from the default branch**

```bash
cd D:/code/mgm.beautyworld.co.id
git checkout master && git pull --ff-only
git checkout -b chore/adopt-commiter-release-v2
```

- [ ] **Step 2: Rewrite package.json**

Add `commiter.release.branch = "master"` and set:

```json
"release": "commiter release",
"release:major": "commiter release major",
"release:minor": "commiter release minor",
"release:patch": "commiter release patch",
"release:first": "commiter release --first-release"
```

- [ ] **Step 3: Install the engine and remove the local script**

```bash
npm install --save-dev @programinglive/commiter@1.5.1
git rm scripts/release.cjs
```

- [ ] **Step 4: Verify**

```bash
git grep -n "scripts/release" || echo bersih
npm ls @programinglive/commiter
node -e "require('@programinglive/commiter/lib/release')"
```

Expected: `bersih`, `@programinglive/commiter@1.5.1`, and no error.

- [ ] **Step 5: Commit, push, MR, merge**

```bash
git add package.json package-lock.json
git commit -m "chore(release): adopt commiter release v2"
git push -u origin chore/adopt-commiter-release-v2
```

Open the MR, merge it, then:

```bash
git checkout master && git pull --ff-only
npx commiter release --dry-run
```

Expected: `PLAN ONLY: v<next>` and `git status --porcelain` empty.

---

### Task 2: Migrate reseller (clean, master)

Same steps as Task 1, in `D:\code\reseller.beautyworld.co.id`, branch `chore/adopt-commiter-release-v2`, `commiter.release.branch = "master"`.

- [ ] **Step 1: Branch, rewrite package.json, install, remove the script**
- [ ] **Step 2: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 3: Commit, push, MR, merge, dry-run on master**

---

### Task 3: Migrate programinglive (clean, main)

Same steps as Task 1, in `D:\code\programinglive`, branch `chore/adopt-commiter-release-v2`, `commiter.release.branch = "main"`.

- [ ] **Step 1: Branch, rewrite package.json, install, remove the script**
- [ ] **Step 2: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 3: Commit, push, MR, merge, dry-run on main**

---

### Task 4: Migrate erp (clean, master, no dependency yet)

Same steps as Task 1, in `D:\code\erp.beautyworld.co.id`, branch `chore/adopt-commiter-release-v2`, `commiter.release.branch = "master"`.

- [ ] **Step 1: Branch, rewrite package.json, install, remove the script**
- [ ] **Step 2: Replace the two PHP tests that pin the v1 script**

`tests/Feature/ReleasePushesTagsTest.php` and `tests/Feature/ReleaseScriptArgsTest.php`
read and execute `scripts/release.cjs`. Replace both with
`tests/Feature/ReleaseContractTest.php`, which asserts the v2 contract: no local
script, `scripts.release` is `commiter release`, `commiter.release.branch` is
`master`, and the installed commiter version is at least 1.5.0.

- [ ] **Step 3: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1, `php artisan test --filter=ReleaseContractTest` passes
- [ ] **Step 4: Commit, push, MR, merge, dry-run on master**

---

### Task 5: Migrate clinic (dirty tree, master)

**Files:**
- Worktree: `D:\code\clinic-wt-release-v2` from `origin/master`
- Modify: `package.json`, delete `scripts/release.cjs`

- [ ] **Step 1: Create the worktree from origin/master**

```bash
cd D:/code/clinic
git worktree add ../clinic-wt-release-v2 -b chore/adopt-commiter-release-v2 origin/master
```

- [ ] **Step 2: Rewrite package.json, install, remove the script** (same values as Task 1)
- [ ] **Step 3: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 4: Commit, push, MR, merge, dry-run on master**
- [ ] **Step 5: Remove the worktree**

```bash
git worktree remove ../clinic-wt-release-v2
```

---

### Task 6: Migrate belajar (dirty tree, master, dependency in `dependencies`)

**Files:**
- Worktree: `D:\code\belajar-wt-release-v2` from `origin/master`
- Modify: `package.json`, delete `scripts/release.cjs`

- [ ] **Step 1: Create the worktree from origin/master**
- [ ] **Step 2: Rewrite package.json, install with `--save` (not `--save-dev`), remove the script**
- [ ] **Step 3: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 4: Commit, push, MR, merge, dry-run on master**
- [ ] **Step 5: Remove the worktree**

---

### Task 7: Migrate zettly (staged notes, main)

**Files:**
- Worktree: `D:\code\zettly-wt-release-v2` from `origin/main`
- Modify: `package.json`, delete `scripts/release.cjs`

- [ ] **Step 1: Create the worktree from origin/main**
- [ ] **Step 2: Rewrite package.json, install, remove the script**
- [ ] **Step 3: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 4: Commit, push, MR, merge, dry-run on main**
- [ ] **Step 5: Remove the worktree**

---

### Task 8: Migrate hris (feature branch checked out, main)

**Files:**
- Worktree: `D:\code\hris-wt-release-v2` from `origin/main`
- Modify: `package.json`, delete `scripts/release.cjs`

- [ ] **Step 1: Create the worktree from origin/main**
- [ ] **Step 2: Rewrite package.json, install, remove the script**
- [ ] **Step 3: Verify** — `git grep -n "scripts/release"` clean, `npm ls` shows 1.5.1
- [ ] **Step 4: Commit, push, MR, merge, dry-run on main**
- [ ] **Step 5: Remove the worktree**

---

### Task 9: Regression guard

**Files:**
- Create: `bw-server-grooming/monitoring/tests/test_release_tag_push.py`

- [ ] **Step 1: Write the failing test**

The test fails when a repo has `scripts/release.cjs`, when `scripts.release` is not `commiter release`, or when the installed commiter version is below 1.5.1.

- [ ] **Step 2: Prove it can fail** by restoring one local copy temporarily.

- [ ] **Step 3: Run it green and commit.**

---

## Verification

| Case | Passes when |
|---|---|
| Every repo | `git grep -n "scripts/release"` prints nothing |
| Every repo | `npm ls @programinglive/commiter` shows 1.5.1 |
| Every repo | `npx commiter release --dry-run` prints `PLAN ONLY` and mutates nothing |
| Dirty repos | The operator's original working tree is unchanged |
| Regression guard | Fails when a local `scripts/release.cjs` is restored, passes when removed |

## Rollback

Per repo: `git revert` the single migration commit. The engine itself is unchanged by this plan.
