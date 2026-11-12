# Commiter Release v2 — operational contract

## Scope and strict guarantees

The release CLI authors one release commit and one annotated tag, then uses a single `git push --atomic` to publish **both** `refs/heads/<branch>` and `refs/tags/v<version>`. No force-push, wildcard tag push, or automatic deploy. If the server does not support atomic push, release fails closed. A protected branch that forbids direct pushes will reject release: use an approved CI release actor or adapt branch protection, not an unsafe fallback.

Only the release engine publishes. GitHub Release, npm publish, and deployment remain CI concerns.

The release branch is `main` by default. The local HEAD must exactly equal the advertised branch OID on `origin`. The check is performed twice. Concurrent releases with different tag names cannot both advance the same remote branch via fast-forward.

The release engine rejects **all** standard-version CLI passthrough flags. Recognized user flags are `--dry-run` and `--first-release` only; `--first-release` is accepted only from version `0.0.0` and cannot be combined with a release type. The tool controls `--skip.commit --skip.tag` internally.

## Config

In `package.json`:

```json
{
  "commiter": {
    "release": {
      "branch": "main",
      "verify": "npm test",
      "releaseNotes": "docs/release-notes/RELEASE_NOTES.md"
    }
  }
}
```

Default `verify` is `npm test`. No skip flag or env bypass. `verify` runs after generating release files, before commit/tag. Tests must not change the generated tree. The release engine stages only package.json, npm lockfiles, CHANGELOG.md, README.md, and configured releaseNotes file. Repositories using additional `standard-version` bumpFiles require extending the explicit allowlist before rollout; silent inclusion is prohibited.

## Phase order

1. Validate args, config, branch, clean tree.
2. Fetch only release branch (no tags); compare HEAD and exact origin branch OID.
3. Predict release version; reject local and remote tag collisions.
4. Run standard-version for **file generation only**.
5. Generate release notes and sync every matching README version line.
6. Stage only allowlisted release files; execute final verify; reject extra file changes.
7. Recheck remote branch OID and tag absence.
8. Create exactly one release commit and one annotated tag.
9. Atomically push branch+tag; query exact remote OIDs.
10. Report published only when both branch and tag object IDs match local IDs.

## Failure states

- `FAILED` before remote publication: no published release. If a local commit/tag was created, rollback to original HEAD using `git reset --mixed <OID>` while preserving release file changes. Pre-commit failures intentionally leave generated file changes for inspection. There is no destructive `--hard` cleanup.
- `PUBLISHED`: both remote refs match the local release objects, even if push transport returned nonzero. Never retry.
- `UNKNOWN`: remote comparison could not prove either success or rejection, or partial refs were observed. Preserve local commit/tag and **never auto-retry**. Investigate `git ls-remote origin refs/heads/main refs/tags/<tag>` and compare object IDs.

## Dry run

`commiter release [type] --dry-run` only reads Git and package state; it does not fetch, generate files, invoke tests, create commits/tags, push, stash or reset. Its report predicts the next version; it does **not** promise that the later real release will be accepted by remote.

## Migration checklist

Run on a dedicated branch first. Existing per-repo `scripts/release.cjs` files must no longer orchestrate their own release. Route npm release scripts to `commiter release`. Any repo whose release branch is not `main` must configure `commiter.release.branch`. Review `standard-version` config for custom bumpFiles, unusual prefixes, prerelease identifiers, lockfiles, and hooks. Run bare-remote integration tests covering a happy path, branch push reject, tag collision, concurrent patch/minor, network ambiguity, and hook failure. Do not release to production until these scenarios pass on each repository family.

## Breaking changes from 1.4.0

1. **`commiter.release.branch` is required per repository.** The default is
   `main`. A repository that releases from another branch (ERP uses `master`)
   must configure it, or the release fails before writing anything.
2. **`--first-release` is accepted only from version `0.0.0`.** 1.4.0 accepted it
   from any version and produced `0.0.1`. The new rule is safer but stricter.
3. **The release pushes the branch as well as the tag.** A protected branch that
   forbids direct pushes will reject the release. Grant the release actor push
   access or adapt branch protection; there is no unsafe fallback.
4. **Every other `standard-version` flag is rejected.** Only `--dry-run` and
   `--first-release` are accepted.

## Status

This engine is the adopted release path. It is covered by 54 tests, including
real-git integration against local bare remotes, concurrency, and one injected
failure per phase. It has not been published as a new npm version yet; the
migration of the eight consumer repositories is tracked separately.

