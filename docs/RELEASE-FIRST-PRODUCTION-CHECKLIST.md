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

## If the release reports `REJECTED`

The push was rejected and the remote did not change. The local commit was rolled
back and the generated files were kept for inspection. Fix the cause (branch
protection, a rejecting hook, a missing permission), confirm the tree is clean,
and run the release again.

## If the release reports `REJECTED_CONCURRENT_UPDATE`

Another release moved the branch first. This release was not published; the
local commit and tag were rolled back. Re-sync the branch, then release again on
top of the new head. Do not force-push and do not reuse the old tag.

## If the release reports `FAILED`

Read the reason. A pre-commit failure restores the generated files; a
post-commit failure keeps them for inspection. Fix the cause, confirm the tree
is clean, and run the release again.

---

## If deployment fails after Git publication succeeded

Git publication and deployment are **not one transaction**. A successful
`PUBLISHED` state means the branch and the annotated tag are on the remote. It
does not mean the application is running that version.

When the pipeline or deployment fails after `PUBLISHED`:

1. **Do not delete or move the published tag.** The tag is the record of what
   was released. Rewriting it makes the failure harder to audit and can break
   other consumers.
2. **Do not re-run the release command.** The release already happened; a second
   run would create a new version on top of a deployment that never completed.
3. Read the pipeline log and identify the failing stage.
4. Fix the deployment cause (configuration, credentials, infrastructure) and
   re-run the **deployment** for the same tag, not the release.
5. If the deployment cannot be fixed forward, ship a new patch release with the
   fix. The failed tag stays in history as a failed deployment, not as a
   rewritten release.
6. Record the failed tag, the pipeline, the failing stage, and the recovery
   action in the task.

A tag that exists without a successful deployment is a deployment incident, not
a release incident. Treat it as such.

