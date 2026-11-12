# Release recovery

A release can stop in a state the tool cannot resolve on its own. This guide says
what to inspect, what **not** to retry, and how to finish by hand.

The engine never guesses. When it cannot prove the remote state, it reports
`UNKNOWN` and leaves the local commit and tag in place. When its own rollback
fails, it reports `MANUAL_RECOVERY`. Both mean: a human decides.

---

## 1. Read the state first

Every run returns one of seven states.

| State | Meaning | Safe to retry? |
|---|---|---|
| `PUBLISHED` | Remote branch and tag OIDs match the local release objects | No need |
| `PLAN_ONLY` | `--dry-run`; nothing was written | Yes |
| `REJECTED` | The push was rejected and the remote did not change | Yes, after reading the reason |
| `REJECTED_CONCURRENT_UPDATE` | Another release moved the branch first; this release is provably not published | Yes, after re-syncing |
| `FAILED` | Stopped before publication | Yes, after reading the reason |
| `UNKNOWN` | The remote could not prove success or rejection | **No** |
| `MANUAL_RECOVERY` | A rollback or restore failed | **No** |

The CLI prints the state in brackets:

```
[UNKNOWN] State publikasi UNKNOWN: branch=<oid>, tag=<oid>. Jangan retry tanpa inspeksi.
```

---

## 2. `UNKNOWN`

`UNKNOWN` means the push may or may not have landed. The engine reached the
remote comparison and could not prove either outcome: the connection dropped, the
remote returned an ambiguous ref, or the refs did not match what it expected.

### What to inspect

Run these from the repository, replacing `<branch>` and `<tag>`:

```bash
git rev-parse HEAD
git rev-parse refs/tags/<tag>
git ls-remote origin refs/heads/<branch> refs/tags/<tag>
```

Compare the four object IDs:

| Local HEAD | Local tag | Remote branch | Remote tag | Meaning |
|---|---|---|---|---|
| `A` | `A` | `A` | `A` | The release landed. Treat it as published. |
| `A` | `A` | `B` | absent | The push did not land. The local release is intact. |
| `A` | `A` | `B` | `C` | Someone else published. Do not force anything. |
| `A` | `A` | `A` | absent | The branch landed but the tag did not. Finish by hand. |

### What not to do

- **Do not run `commiter release` again.** A second run would create a second
  commit and tag on top of a state nobody has explained.
- **Do not `git push --force`.** The remote may already hold a release that other
  people depend on.
- **Do not delete the local tag or commit** until the table above says the push
  did not land.

### How to finish by hand

**If the release landed** (all four OIDs match): nothing to do. Record the tag
and move on.

**If the push did not land** (remote branch is the previous commit, remote tag
absent): the local commit and tag are correct. Publish them with the same atomic
push the engine would have used:

```bash
git push --atomic origin HEAD:refs/heads/<branch> refs/tags/<tag>:refs/tags/<tag>
```

Then verify the object IDs again with `git ls-remote`.

**If the branch landed but the tag did not**: push only the tag, then verify:

```bash
git push origin refs/tags/<tag>:refs/tags/<tag>
git ls-remote origin refs/tags/<tag>
```

**If someone else published**: stop. Compare their release with yours and decide
which one stands. Never force a tag that another release already owns.

---

## 3. `REJECTED` and `REJECTED_CONCURRENT_UPDATE`

Both states mean the release was **not** published. The difference is why.

### `REJECTED`

The push was rejected and the remote did not change: a branch protection rule, a
rejecting hook, or a missing permission. The engine rolled the local commit back
and kept the generated files.

1. Read the reason; it names the remote's rejection.
2. Fix the cause.
3. Confirm `git status --porcelain` shows only the generated files.
4. Run the release again.

### `REJECTED_CONCURRENT_UPDATE`

Another release moved the branch first. The engine proved this release is not on
the remote: the local commit is not an ancestor of the remote branch, and the
local tag object is not the remote tag. The local commit and tag were rolled
back.

1. `git fetch origin` and inspect the new head.
2. Re-sync the branch (`git pull --ff-only`).
3. Run the release again on top of the new head. The version is recomputed from
   the new `package.json`.
4. Do not force-push and do not reuse the old tag.

If the engine cannot prove the ancestry (for example, the fetch fails), it
reports `UNKNOWN` instead. Treat that as `UNKNOWN`, not as a rejection.

---

## 4. `MANUAL_RECOVERY`

`MANUAL_RECOVERY` means the engine tried to undo its own work and the undo
failed. The reason names both the original failure and the rollback failure.

### What to inspect

```bash
git status --porcelain
git log --oneline -3
git tag -l
```

The engine rolls back with `git reset --mixed <originalHead>`, which keeps file
changes in the working tree. A failed rollback usually means one of:

- the release commit is still `HEAD` (the reset did not run);
- the local tag still exists (the tag delete did not run);
- the working tree holds generated files that were not restored.

### How to finish by hand

1. If `HEAD` is the release commit, move it back without discarding files:

   ```bash
   git reset --mixed <originalHead>
   ```

2. If the local tag exists and the remote does not have it, delete it:

   ```bash
   git tag -d <tag>
   ```

3. Restore the generated files. The engine only ever touches `package.json`, npm
   lockfiles, `CHANGELOG.md`, `README.md`, and the configured release notes file:

   ```bash
   git checkout -- package.json package-lock.json CHANGELOG.md README.md
   ```

   Delete any of those files the generator created and that did not exist before.

4. Confirm the tree is clean with `git status --porcelain` before trying again.

---

## 5. `FAILED` with preserved files

A `FAILED` state after the commit was created (a rejected push, a failed tag)
rolls the commit back but **keeps the generated files** so you can inspect them.
The tree is intentionally dirty.

- If the files are correct, commit them again and re-run the release.
- If they are not, restore them with `git checkout -- <paths>` and delete any
  file the generator created.

A `FAILED` state before the commit restores the allowlisted files itself; the
tree is clean and the next run starts from the same place.

---

## 6. Prevention

- Configure `commiter.release.branch` in every repository. ERP uses `master`;
  everything else uses `main`.
- Keep the test suite hermetic. A test that writes to the repository fails the
  release gate, and the reason will name the test output.
- Do not run two releases from the same clone. Two clones from the same parent
  are safe: exactly one push wins and the other reports the remote state.
- Make sure the release actor may push directly to the release branch. A
  protected branch rejects the atomic push; the engine will not bypass it.
