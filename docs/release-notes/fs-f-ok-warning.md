# Release Notes: Fix fs.F_OK Deprecation Warning

## Summary
- Eliminated the `[DEP0176] fs.F_OK` warning emitted during release commands by injecting a preload script that transparently rewrites `fs.F_OK` usage inside `standard-version`.
- Ensured the preload script runs for both in-process unit tests and the child process that executes `standard-version` by appending a `--require` flag to `NODE_OPTIONS`.
- Updated the test suite to cover the preload behaviour and the adjusted release workflow, switching the project to Node’s built-in test runner (`node --test`).

## Impact
- Release logs are now warning-free, reducing CI noise and operator confusion.
- Future dependency updates remain safe because no files under `node_modules` are modified.
- The new tests guard against regressions in the preload integration.

## Testing
- `node --test`
