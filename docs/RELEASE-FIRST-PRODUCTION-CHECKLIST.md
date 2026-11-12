# First production release checklist

Use this checklist the first time each repository runs a real release with
`commiter release` v2. The engine has been validated locally; this checklist
proves the production path — tag, CI, deployment, and the version the
application actually serves.

Do not run a release only to test the engine. Run it when the repository has a
real change to ship.

---

## 1. Before the release (read-only)

- [ ] `npm ls @programinglive/commiter` shows `1.5.1` or newer.
- [ ] `npm ls standard-version` shows `9.5.0` or newer.
- [ ] `package.json` has `commiter.release.branch` equal to the repository's
      default branch (`master` for clinic, belajar, mgm, reseller, erp; `main`
      for programinglive, zettly, hris).
- [ ] `scripts.release` is `commiter release` and `scripts/release.cjs` does not
      exist.
- [ ] `git status --porcelain` is empty.
- [ ] `git rev-parse HEAD` equals `git ls-remote origin refs/heads/<branch>`.
- [ ] `npx commiter release --dry-run` prints `PLAN ONLY: v<next>` and leaves the
      tree clean.

## 2. Run the release

- [ ] `npm run release` (or `npm run release:minor` / `release:major`).
- [ ] The command exits 0 and prints
      `✅ Release v<version> complete; branch commit and annotated tag verified on origin.`
- [ ] The state is `PUBLISHED`, not `UNKNOWN` or `MANUAL_RECOVERY`.

## 3. Immediately after the release

- [ ] `git rev-parse HEAD` equals `git ls-remote origin refs/heads/<branch>`.
- [ ] `git rev-parse refs/tags/v<version>` equals
      `git ls-remote origin refs/tags/v<version>`.
- [ ] `git cat-file -t refs/tags/v<version>` prints `tag` (annotated).
- [ ] `git rev-parse v<version>^{commit}` equals `git rev-parse HEAD`.
- [ ] `git status --porcelain` is empty.
- [ ] `git tag -l` shows exactly one new tag and no moved tag.

## 4. CI and deployment

- [ ] The CI pipeline for the tag started and succeeded.
- [ ] The deployment job detected the new tag (not a branch push).
- [ ] The deployment log names the same tag.
- [ ] No rollback, retry loop, or hidden error in the deployment log.

## 5. Production version

- [ ] The application's version endpoint, build info, or `version` file reports
      the released version.
- [ ] The deployed commit matches the release commit.
- [ ] A smoke check of the main page or health endpoint passes.

## 6. Record the evidence

Record in the task:

```
repo: <name>
tag: v<version>
release commit: <oid>
remote branch oid: <oid>
remote tag oid: <oid>
pipeline: <id or url>
deployed version: <version>
smoke check: <what was checked and the result>
```

Only after this evidence exists may the migration task be closed.

---

## If the release reports `UNKNOWN`

Do not retry. Follow [`RELEASE-RECOVERY.md`](RELEASE-RECOVERY.md): compare the
four object IDs, then finish by hand only when the table says the push did not
land.

## If the release reports `FAILED`

Read the reason. A pre-commit failure restores the generated files; a
post-commit failure keeps them for inspection. Fix the cause, confirm the tree
is clean, and run the release again.
