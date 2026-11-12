# How Commiter Works

This document explains what `@programinglive/commiter` does, why each step exists,
what it guarantees, and where it is still weak. It is written to be read by
someone reviewing the design, not just by someone installing the package.

- Quick start: [`../README.md`](../README.md)
- Operational contract: [`RELEASE-V2-OPERATIONS.md`](RELEASE-V2-OPERATIONS.md)
- Recovery guide: [`RELEASE-RECOVERY.md`](RELEASE-RECOVERY.md)

---

## 1. Two responsibilities

The package does two separate things, and they are worth keeping separate in your
head because they fail differently.

| Responsibility | Command | Touches |
|---|---|---|
| **Set up commit conventions** | `commiter` (no arguments) | `package.json`, husky hooks, commitlint config |
| **Run a release** | `commiter release [type]` | git history, tags, the remote |

The setup half is a one-time scaffold. The release half is the part that can
damage a repository, so it is the part with guards.

---

## 2. The release flow

`commiter release` runs these steps in order and **stops at the first failure**.
Nothing is pushed until step 10.

| # | Step | Why it exists |
|---|---|---|
| 1 | Validate arguments and config | Unknown flags fail before anything is spawned |
| 2 | Refuse a dirty working tree | A release must not sweep someone else's uncommitted work into the release commit |
| 3 | Check the branch and fetch it | The release branch is configured per repo; a release from the wrong branch is a mistake, not a variant |
| 4 | Compare local HEAD with the exact origin OID | A stale clone would publish a release on top of someone else's work |
| 5 | Predict the version and reject tag collisions | The tag must be known before generation, so a collision fails before any file is written |
| 6 | Run `standard-version` for **file generation only** | `--skip.commit --skip.tag` keeps the generator from creating a commit or tag the engine does not control |
| 7 | Update release notes and the README version line | Both must be part of the same release commit |
| 8 | Stage only allowlisted files, then run the test gate | The gate runs on the final tree; a file outside the allowlist aborts the release |
| 9 | Re-check the origin OID and tag absence | The remote can move while the tests run |
| 10 | Create exactly one commit and one annotated tag | One commit, one tag, created once — never amended, never moved |
| 11 | `git push --atomic origin HEAD:<branch> refs/tags/<tag>` | Branch and tag land together or not at all |
| 12 | Compare the remote object IDs with the local ones | "The tag exists" does not prove it points at the release commit |

### Why the push is atomic

The previous engine pushed only the tag. That leaves a window where the tag
exists on the remote but the branch does not, and it cannot prove the tag points
at the commit the operator just built. `git push --atomic` publishes both refs in
one transaction: either both land or neither does. If the server does not support
atomic push, the release **fails**; there is no fallback to a non-atomic push.

### Why the tag is created once

`standard-version` used to create the commit and tag, after which the engine
amended the commit and force-moved the tag. That is two writes where one is
enough, and a crash between them leaves a tag pointing at the wrong commit. The
v2 engine asks `standard-version` for files only, then creates the commit and the
annotated tag itself, in that order.

### Why success is an OID comparison

`git ls-remote --tags origin refs/tags/<tag>` returning a line only proves a ref
with that name exists. It does not prove the ref points at the commit this run
created. The engine compares the remote branch OID and the remote tag OID with
the local ones, and reports `PUBLISHED` only when both match.

---

## 3. What it guarantees

| Guarantee | How it is enforced |
|---|---|
| No release from a dirty tree | `git status --porcelain=v1 --untracked-files=all` must be empty |
| No release from the wrong branch | `commiter.release.branch` must match the current branch |
| No release on a stale clone | Local HEAD must equal the exact origin branch OID, checked twice |
| No release with failing tests | `npm test` (or `commiter.release.verify`) must exit 0; its output is captured |
| No release that dirties the tree | A failure before the commit restores the allowlisted files |
| Branch and tag land together | One `git push --atomic`; no non-atomic fallback |
| The tag points at the release commit | Remote tag OID must equal the local tag OID |
| No orphan release commit | A rejected push rolls the commit back with `git reset --mixed` |

### What it deliberately does **not** guarantee

- **That the release is correct.** It guarantees the mechanics, not the content.
- **That migrations are safe.** It never runs database migrations.
- **That the remote accepts the push.** If the remote rejects it, the release
  fails; it cannot force.
- **That a half-finished state is impossible.** If the remote cannot be read
  after a push, the state is `UNKNOWN` and the operator must inspect it.
- **That a protected branch accepts a direct push.** Branch protection is a
  policy decision; the engine fails rather than bypassing it.

---

## 4. Failure states

Every run ends in one of seven states.

| State | Meaning | Tree |
|---|---|---|
| `PUBLISHED` | Remote branch and tag OIDs match the local release objects | Clean |
| `PLAN_ONLY` | `--dry-run`; nothing was written | Clean |
| `REJECTED` | The push was rejected and the remote did not change | Generated files preserved after the local commit is rolled back |
| `REJECTED_CONCURRENT_UPDATE` | Another release moved the branch first; this release is provably not published | Generated files preserved after the local commit is rolled back |
| `FAILED` | The release stopped before publication | Clean if nothing was committed; generated files preserved if a commit was rolled back |
| `UNKNOWN` | The remote could not prove success or rejection | Local commit and tag preserved |
| `MANUAL_RECOVERY` | A rollback or restore itself failed | Inspect by hand |

`UNKNOWN` and `MANUAL_RECOVERY` are never retried automatically. See
[`RELEASE-RECOVERY.md`](RELEASE-RECOVERY.md).

---

## 5. Configuration

Deliberately minimal. Everything that decides *how* a release behaves is fixed,
because per-repo variation is what produced eight divergent scripts.

| Key | Default | When to set it |
|---|---|---|
| `commiter.release.branch` | `main` | The repo releases from another branch, e.g. `master` |
| `commiter.release.verify` | `npm test` | The repo verifies with something else, e.g. `npm run verify` |
| `commiter.release.releaseNotes` | `docs/release-notes/RELEASE_NOTES.md` | The repo keeps its notes elsewhere |
| `commiter.release.additionalFiles` | `[]` | The release generator writes a repository file that is not one of the standard artifacts |

`additionalFiles` is the only way to widen the release allowlist, and it is
validated before anything runs:

- every entry must be a relative path inside the repository;
- absolute paths, drive letters, backslashes, `..`, `.`, empty segments, and
  `.git/` are rejected;
- the nearest existing ancestor is resolved, so a symlinked directory cannot
  point outside the repository;
- the clean-tree requirement is unchanged: the file must be clean before the
  release starts, and only the generator may change it during the release.

The default allowlist stays strict: `package.json`, npm lockfiles,
`CHANGELOG.md`, `README.md`, and the configured release notes file. A file
outside that set fails the release and is left in the working tree for
inspection; the engine never deletes a path it was not allowed to touch.

There is no configuration for the tag format, the push target, or the rollback
behaviour. Those are the same everywhere on purpose.

---

## 6. Design decisions and their cost

Each of these was chosen against an alternative that looked reasonable.

| Decision | Alternative rejected | Cost of the choice |
|---|---|---|
| Atomic push of branch and tag | Tag-only push | A server without atomic support cannot release |
| Fail closed when there is no test script | Skip the gate | A repo with no tests cannot release until it has one |
| One commit and one tag, created once | Amend and move the tag | Slightly more engine code; no behavioural cost |
| Compare object IDs | Check that the tag name exists | One more `ls-remote`; the only proof that matters |
| `--mixed` rollback | `--hard` rollback | Leaves a dirty tree after a post-commit failure |
| Restore generated files on a pre-commit failure | Leave the tree dirty | The engine must know the allowlist before generation |
| Reject every unknown flag | Forward to `standard-version` | Callers that relied on passthrough must change |
| Fixed behaviour, no per-repo config | Configurable everything | Less flexible; that is the point |

---

## 7. Known limitations

These are real and worth discussing before the next release.

1. **`--dry-run` does not fetch.** It is read-only by design, so its plan can be
   based on a stale view of the remote. It predicts the version; it does not
   promise the later real release will be accepted.
2. **`predictVersion` must agree with `standard-version`.** The engine computes
   the next version itself and aborts if the generator produced a different one.
   A repo with a non-default increment configuration will fail loudly rather than
   publish the wrong version.
3. **The allowlist is explicit.** Only `package.json`, npm lockfiles,
   `CHANGELOG.md`, `README.md`, and the configured notes file may change. A repo
   with custom `standard-version` `bumpFiles` must extend the allowlist first.
4. **A protected branch rejects the release.** The engine pushes directly to the
   release branch; branch protection must allow the release actor.
5. **Atomic push requires server support.** GitLab and GitHub support it; a
   server that does not will fail the release.
6. **`--first-release` only works from version `0.0.0`.** This is a breaking
   change from 1.4.0, which accepted it from any version.
7. **The test gate runs the repo's own `npm test`.** A test suite that writes to
   the repository will fail the release; that is intentional, but it means test
   hygiene is a release prerequisite.

---

## 8. How it is tested

- **54 tests** across the package's suites. The release engine is covered by
  `release-v2` (parser, version prediction, dry run, README sync),
  `release-integration` (a real bare remote), `release-defects` (D1–D4),
  `release-concurrency` (two clones from the same parent), and `release-faults`
  (one failure per phase).
- **Real git repositories and local bare remotes only.** No test touches a real
  remote, and no test publishes anything.
- **Fault injection per phase**: generate, verify, commit, tag, push, and remote
  verification. Each case asserts the resulting state and whether the tree is
  clean or preserved.
- **Concurrency**: two clones release from the same parent; exactly one
  publishes, and the other reports the remote state.

The harness exists because unit tests with a fake `spawn` cannot catch a broken
default `spawn`. That is not hypothetical: the first implementation passed every
test while being unable to run at all, because `spawnSync` returns Buffers and the
code only accepted strings.

---

## 9. Questions worth discussing

1. Should the test gate be skippable at all, and if so, by what — a flag, an
   environment variable, or a config key?
2. Should `--dry-run` fetch the release branch, accepting that it is no longer
   strictly read-only?
3. Is one notes path the right call, or should the path be configurable with a
   single documented default?
4. Should the engine own the GitHub Release and site deployment too, or is that
   correctly left to CI?
5. Should a rejected push roll back automatically, or is a dirty tree with a
   clear message the better contract?
