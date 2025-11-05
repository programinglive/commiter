# PRD: Eliminate `fs.F_OK` Deprecation Warning During Releases

## Overview
`standard-version@9.5.0` uses the deprecated `fs.F_OK` constant when ensuring the changelog file exists. When `scripts/release.js` executed, Node.js v20+ surfaced `[DEP0176]` warnings, creating noise in CI/CD logs and confusing maintainers about potential breakages.

## Goals
- Prevent the deprecation warning without forking or manually editing `node_modules`.
- Keep the mitigation self-contained within the Commiter codebase so dependency upgrades remain safe.
- Preserve existing release behaviour (tests, standard-version invocation, CLI API).

## Non-Goals
- Upgrading `standard-version` or other dependencies.
- Patching unrelated lifecycle scripts that do not trigger the warning.
- Changing user-facing configuration or CLI commands.

## Target Users
- Repository maintainers who run `npm run release*` scripts and expect clean logs.
- CI pipelines that rely on warning-free output to detect regressions.

## Functional Requirements
1. Release commands must execute without emitting the `fs.F_OK` deprecation warning.
2. The fix must apply automatically whenever the bundled release helper runs.
3. Commiter must continue to run project tests prior to executing `standard-version`.
4. All existing automated tests must remain green.

## Technical Approach
- Introduce `scripts/preload/fs-f-ok.cjs` that monkey patches Node's module loader for `standard-version/lib/lifecycles/changelog`, rewriting `fs.F_OK` to `fs.constants.F_OK` in-memory before the module executes.
- Ensure every Commiter-managed release process uses the preload script by appending `--require <preload>` to `NODE_OPTIONS` for the spawned `standard-version` child process.
- Retain a local require of the preload script in `scripts/release.js` so unit tests that run in-process also benefit.

## Success Metrics
- Running `node scripts/release.js --help` (or any release command) no longer emits `[DEP0176]`.
- Automated test suite (`npm test`) passes without new failures.

## Testing Plan
- Extend test coverage with `test/fs-f-ok-preload.test.js` to verify `fs.F_OK` is aligned with `fs.constants.F_OK` after loading the release helper.
- Update existing release unit tests to assert the spawn sequence now includes the `--require` preload flag.
- Execute `node --test` locally and in CI to validate.

## Risks & Mitigations
- **Upstream Changes**: Future `standard-version` versions may restructure files. Mitigate by scoping the preload to the exact module path and gracefully skipping if no replacement is required.
- **Environment Variable Collisions**: Appending to `NODE_OPTIONS` could conflict with user-provided values. Mitigate by concatenating (instead of overriding) existing options.
- **Windows Path Quoting**: Preload flag builder escapes quotes and wraps paths containing spaces to avoid spawn failures on Windows.

## Rollout Plan
- Ship change in the next patch release (v1.1.x).
- Communicate via release notes and CHANGELOG updates once published.
