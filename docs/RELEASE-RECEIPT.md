# Release receipt

A release leaves no durable record of *which engine* produced it. The Git remote
proves the commit and tag exist; it cannot prove the command that made them.
That gap is why the MGM v1.0.14 release could not be closed: the commit, tag,
atomic push and deployment were all verifiable, but nothing recorded that
`commiter release` v2 ran.

The receipt closes that gap for every release from now on. It does not, and
cannot, backfill a past release.

## What it records

Written to `.git/commiter-receipts/<timestamp>-<tag>.json`:

| Field | Source |
|---|---|
| `commiter.name`, `commiter.version` | the package that ran |
| `releaseId` | generated at write time |
| `repository.root`, `repository.remote` | the clone; the remote URL is credential-stripped |
| `branch` | the branch the engine verified |
| `originalHead` | HEAD before the release commit |
| `releaseCommit` | the commit the engine created |
| `tag` | the annotated tag name |
| `localTagObject` | `refs/tags/<tag>` object OID |
| `remoteBranchOid` | `git ls-remote` result the engine compared |
| `remoteTagObject` | `git ls-remote` result the engine compared |
| `command`, `releaseType` | what was asked for |
| `result` | `PUBLISHED` / `REJECTED` / `REJECTED_CONCURRENT_UPDATE` / `UNKNOWN` / `FAILED` / `MANUAL_RECOVERY` |
| `reason` | the failure reason, when there is one |
| `timestamp` | ISO-8601 |
| `verification` | how the result was decided |

## Guarantees

1. **Only verified facts.** Every OID is one the engine already compared; the
   receipt never records what the operator hoped happened.
2. **Never part of the release.** It lives in `.git/`, so it cannot dirty the
   working tree, cannot join the release commit, and cannot move the tag target.
3. **No secrets.** The remote URL is stripped of `user:token@` before writing.
4. **Failures are recorded.** `UNKNOWN`, `REJECTED` and `MANUAL_RECOVERY` are
   written as faithfully as `PUBLISHED`. A receipt that only exists for happy
   paths is useless during the incident it is meant to explain.
5. **Atomic.** Temp file plus rename, so a crash cannot leave a half receipt.
6. **Never the source of truth.** The Git remote stays authoritative. The file
   is editable, so it is an audit aid, not cryptographic proof.
7. **Never fails a release.** If the receipt cannot be written, the release
   result is unchanged.

## Storage options compared

| Option | Strength | Cost | Verdict |
|---|---|---|---|
| Local receipt in `.git/` | records the engine version and the four OIDs; survives on the release host | none; no new dependency | **chosen** |
| CI artifact | harder to edit after the fact; tied to a pipeline | needs a CI job and artifact retention; not every repo releases through CI | optional later |
| GitHub/GitLab release evidence | server-side, visible to reviewers | needs API tokens and a remote publication step; adds a failure mode to the release | not now |

The local receipt is the simplest thing that produces a strong audit trail
without a new dependency or a new remote publication. It is deliberately not
signed: a signature would imply a guarantee the file cannot make, and the remote
OID comparison already provides the authoritative check.

## Reading a receipt

```bash
cat .git/commiter-receipts/*.json | jq -r '[.timestamp,.tag,.result,.commiter.version]|@tsv'
```

A receipt whose `result` is `PUBLISHED` and whose `remoteBranchOid` and
`remoteTagObject` match the live `git ls-remote` output is a complete record of
that release. A receipt whose `result` is `UNKNOWN` is a recovery instruction,
not a success.

## Backward compatibility

The receipt is additive. Repositories that never read it are unaffected, and a
release that cannot write it still succeeds. No existing field, exit code or
state name changed.

## Durability and retention

The receipt lives on the release host, inside the clone. That is enough for
troubleshooting, but it is not durable storage: a re-clone, a disk loss or a
`git clean` of `.git` removes it.

Recommended practice, in order of cost:

1. **Keep the local receipt as a troubleshooting artifact.** It is the first
   thing to read when a release is questioned, and it costs nothing.
2. **Archive it when a CI or monitoring pipeline already exists.** Copy
   `.git/commiter-receipts/*.json` into the pipeline artifact for the release
   commit. Do not add a pipeline only for this.
3. **Tie the receipt to the release commit and tag OID.** The receipt already
   records both, so an archived copy can be matched against
   `git ls-remote` at any later date.
4. **Never backfill.** A receipt written after the fact is not evidence that the
   engine ran; it is a reconstruction. The MGM v1.0.14 release has no receipt
   and must not be given one.

Automatic export to a central store is a separate change: it needs a destination,
credentials and a retention policy. It is deliberately out of scope here.

## Retention

Keep receipts for at least as long as the release is deployed, and for the
lifetime of any incident that references it. A receipt is small (about 1 KB), so
keeping every receipt for a repository is cheap.

