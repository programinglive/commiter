# How Commiter Works

This document explains what `@programinglive/commiter` does, why each step exists,
what it guarantees, and where it is still weak. It is written to be read by
someone reviewing the design, not just by someone installing the package.

- Quick start: [`../README.md`](../README.md)
- Behaviour specification: `bw-server-grooming/docs/superpowers/specs/2026-11-12-commiter-release-behaviour.md`

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
| 1 | Reject a dirty working tree | A release must not sweep someone else's uncommitted work into the release commit |
| 2 | Resolve the release type | No argument means `patch`. Accepted: `patch`, `minor`, `major`, `premajor`, `preminor`, `prepatch`, `prerelease` |
| 3 | Reject `--release-as`, `-r`, `--skip.tag` | Passing these through once produced a tag literally named `vnull` |
| 4 | Run the test gate | A release that ships failing tests is worse than a late release |
| 5 | Re-check the working tree | The test gate itself can write files; without this, that dirt lands in the release commit |
| 6 | Run `standard-version` | Bumps the version, writes `CHANGELOG.md`, creates the release commit and an **annotated** tag |
| 7 | Update release notes | `docs/release-notes/RELEASE_NOTES.md`, if the file exists |
| 8 | Sync the README version line | A README that still shows the old version fails deploy checks in some repos |
| 9 | Amend the commit and move the tag | The tag must point at the commit that actually contains steps 7 and 8 |
| 10 | Push **only** `refs/tags/<tag>` | `git push --tags` would rewrite hundreds of unrelated legacy tags |
| 11 | Verify with `ls-remote` | A push that reports success is not proof the tag exists on the remote |
| 12 | Roll back on a rejected push | Two people releasing at once must not leave a "version X" commit with no tag |

### Why the tag comes from `package.json`, not `git describe`

`git describe --tags --abbrev=0` returns the nearest reachable tag. With
`--skip.tag` or `--skip.commit`, that is the **previous** release, so the tool
would amend the previous release commit and force-move the previous tag. The
version is therefore read from `package.json` after `standard-version` runs.

### Why the tag stays annotated

`standard-version` creates the tag with `git tag -a -m "chore(release): X"`.
Moving it with a bare `git tag -f` silently downgrades it to a lightweight tag:
the message is lost, and a signature would be lost too. The move therefore
re-creates the annotation, reusing the original message.

### Why the rollback uses `--mixed`

On a rejected push the tool deletes the local tag and runs
`git reset --mixed HEAD~1`. `--hard` would discard the operator's file changes;
a library has no business doing that. The cost is a dirty working tree after a
failure, which the message states explicitly.

---

## 3. What it guarantees

| Guarantee | How it is enforced |
|---|---|
| No release from a dirty tree | `git status --porcelain` must be empty, twice |
| No release with failing tests | `npm test` (or `commiter.release.verify`) must exit 0 |
| The tag exists on the remote | `git ls-remote --tags origin refs/tags/<tag>` must return a line |
| Only one ref is pushed | The push names `refs/tags/<tag>`; `--tags` is never used |
| No orphan release commit | A rejected push deletes the tag and undoes the commit |
| The tag points at the released code | The commit is amended and the tag moved onto it |

### What it deliberately does **not** guarantee

- **That the release is correct.** It guarantees the mechanics, not the content.
- **That migrations are safe.** It never runs database migrations.
- **That the remote accepts the tag.** If the remote rejects it, the tool fails
  and rolls back; it cannot force.
- **That a half-finished state is impossible.** If `ls-remote` itself fails, the
  local tag and commit remain, and the operator is told to check manually.

---

## 4. Failure modes

| Situation | Behaviour |
|---|---|
| Dirty working tree | Fails before anything is written |
| Test gate fails | Fails before `standard-version` |
| Test gate leaves files behind | Fails, naming the gate as the likely cause |
| Invalid release type | Fails before spawning anything |
| `--release-as` / `-r` / `--skip.tag` passed | Fails before spawning anything |
| Tag already exists on the remote | Push rejected → local tag deleted, commit undone, failure names the tag |
| `ls-remote` unreachable | Fails; local tag and commit remain, message says so |
| Amend or tag move fails | Fails; message says the state is half-applied |
| Release notes file missing | Skipped, release continues |
| Release notes file has no table | Entry skipped with a warning, release continues |

The last two matter: a notes file with an unexpected shape must never block a
release. That was a real defect — the helper used to throw.

---

## 5. Configuration

Deliberately minimal. Everything that decides *how* a release behaves is fixed,
because per-repo variation is what produced eight divergent scripts.

| Key | Default | When to set it |
|---|---|---|
| `commiter.release.verify` | `npm test` | The repo verifies with something else, e.g. `npm run verify` |

There is no configuration for the tag format, the push target, the notes path, or
the rollback behaviour. Those are the same everywhere on purpose.

---

## 6. Design decisions and their cost

Each of these was chosen against an alternative that looked reasonable.

| Decision | Alternative rejected | Cost of the choice |
|---|---|---|
| Fail closed when there is no test script | Skip the gate | A repo with no tests cannot release until it has one |
| Read the version from `package.json` | `git describe` | One more file read; no behavioural cost |
| Preserve the annotated tag | Bare `git tag -f` | Slightly more code; keeps the message and signature |
| `--mixed` rollback | `--hard` rollback | Leaves a dirty tree after a failure |
| Reject `--release-as` | Strip it silently | Callers that relied on it must change |
| One notes path | Two candidate paths | Repos with a different path must move the file |
| Fixed behaviour, no per-repo config | Configurable everything | Less flexible; that is the point |

---

## 7. Known limitations

These are real and worth discussing before the next release.

1. **`--first-release=true` reintroduces the old bug.** Only the exact token
   `--first-release` is recognised; the `=true` form is forwarded raw, and
   `standard-version` treats it as "do not bump", producing a tag at the current
   version.
2. **`--dry-run` can move an existing tag.** `standard-version` writes nothing,
   the version is unchanged, and the tool force-moves the existing tag to HEAD.
   The push is normally rejected and rolled back, but the local tag has already
   moved.
3. **`--skip.commit` is not rejected.** The version bump stays uncommitted and
   the tag points at the previous commit.
4. **`--tag-prefix` is not rejected.** The tag is hardcoded `v${version}`; a repo
   configured with a different prefix gets a tag that does not match.
5. **README sync replaces only the first match.** A README with two version lines
   updates one of them.
6. **The notes helper still throws on a table-less file.** The caller catches it,
   so `commiter release` is safe, but any other caller of the helper is not.
7. **`ls-remote` failure leaves a half-state** with no automatic rollback.
8. **The test gate runs the repo's own `npm test`**, which in this very repo
   rewrites `package.json`. Step 5 catches it, but the release then fails for a
   reason that is not the operator's fault.

---

## 8. How it is tested

- **87 tests** across three suites: `release-behaviour` (29), `release-push-tag`
  (12), `release-cli` (3), plus the package's own setup tests.
- **Mutation testing** was used to check the tests themselves: 18 deliberate
  breakages were introduced, and 15 were caught. The three that were not are
  listed in section 7 as gaps.
- **A real-git harness** runs the whole flow against a local bare remote seeded
  with 600 tags, proving that exactly one tag is added, that a rejected push
  leaves no orphan commit, and that the tag is visible on the remote afterwards.

The harness exists because unit tests with a fake `spawn` cannot catch a broken
default `spawn`. That is not hypothetical: the first implementation passed every
test while being unable to run at all, because `spawnSync` returns Buffers and the
code only accepted strings.

---

## 9. Questions worth discussing

1. Should the test gate be skippable at all, and if so, by what — a flag, an
   environment variable, or a config key?
2. Should `--dry-run` be supported properly (compute the version, show the plan,
   touch nothing), rather than being an unguarded pass-through?
3. Is one notes path the right call, or should the path be configurable with a
   single documented default?
4. Should the tool refuse to run when the current branch is not the release
   branch?
5. Should a rejected push roll back automatically, or is a dirty tree with a
   clear message the better contract?
6. Should the package own the GitHub Release and site deployment too, or is that
   correctly left to CI?
