# Commiter Product Requirements Document (PRD)

## 1. Overview
Commiter is a CLI utility that bootstraps and automates conventional release workflows for JavaScript/TypeScript projects. It enforces commit conventions, orchestrates semantic version bumps, keeps release tooling configured, and surfaces feedback during release execution so teams can ship confidently.

## 2. Problem Statement
Growing teams often struggle to keep release processes consistent: commit messages drift from convention, changelogs become stale, and release scripts accumulate manual steps. Commiter removes this friction by installing opinionated tooling, providing curated scripts, and running guard rails (tests, linters) before invoking `standard-version` to publish a release.

## 3. Goals & Success Metrics
- **Consistent releases**: Every release run through Commiter formats commits, updates changelogs, tags, and version bumps without manual editing.
- **Low ceremony onboarding**: A single `npx commiter` command prepares repositories (Husky, commitlint, release scripts).
- **Signal-rich automation**: Release logs clearly show which steps ran, including any warnings (e.g., tests skipped). Zero noisy deprecation warnings.
- **Reliability**: New releases do not regress existing behavior; the automated test suite passes (`node --test`).
- **Adoption Metric**: Track installations (npm downloads) and successful release script exits.

## 4. Personas
1. **Solo Maintainer** – wants painless semantic releases without memorizing commands.
2. **Team Lead** – enforces commit standards across contributors and ensures releases produce accurate changelogs.
3. **DevOps/CI Engineer** – integrates Commiter’s release command into CI pipelines and expects deterministic, machine-readable output.

## 5. Key Features
- **Setup CLI (`index.js`)**
  - Installs dev dependencies (`standard-version`, `commitlint`, `husky`).
  - Configures package scripts (`npm run release`, `release:major/minor/patch`).
  - Creates Husky hooks and commitlint configuration.
  - Generates release helper script and ensures executable permissions (POSIX-friendly).
- **Release Helper (`scripts/release.js`)**
  - Detects release type from CLI args or npm context.
  - Runs project tests via detected package manager before releasing.
  - Invokes `standard-version` with additional flags (e.g., preload patch for deprecated APIs).
- **Preload Patching (`scripts/preload/fs-f-ok.cjs`)**
  - Hooks Node’s module loader to transparently replace deprecated `fs.F_OK` usages in `standard-version` without altering `node_modules`.
- **Testing**
  - Suite executed via `node --test` covers setup utilities, release argument parsing, and the preload patch.

## 6. Functional Requirements
1. Running `npx @programinglive/commiter` inside a Node project should configure release tooling without manual edits.
2. `npm run release` must:
   - Run the project’s tests (if defined) with the correct package manager.
   - Execute `standard-version`, passing the preload script via `NODE_OPTIONS`.
   - Exit with non-zero status if tests or standard-version commands fail.
3. CLI should provide friendly console output (status icons, instructions).
4. The preload script must eliminate `[DEP0176] fs.F_OK` warnings on supported Node versions.
5. Documentation (README, PRD, release notes) remains shipped with the package.

## 7. Non-Functional Requirements
- **Compatibility**: Supports Node.js 18+ (aligning with dependencies); tested on Windows/macOS/Linux.
- **Maintainability**: Avoid direct edits to dependencies; wrap behavior in Commiter-controlled modules.
- **Performance**: Release command overhead minimal (<1s additional startup time) beyond running tests and standard-version.
- **Security**: No network requests during CLI execution beyond npm installs triggered by the user.

## 8. User Journeys
1. **Initial Setup**
   - Run `npx @programinglive/commiter`.
   - Tool installs dependencies, updates `package.json`, and scaffolds Husky hooks.
   - Maintainer confirms success message and new scripts.
2. **Standard Release**
   - Developer runs `npm run release minor`.
   - Commiter runs tests, ensures preload patch prevents deprecation warnings, executes `standard-version`.
   - Release completes with updated changelog and git tag.
3. **CI Pipeline**
   - CI job executes `npm run release -- --prerelease beta`.
   - Logs show tests executed, no deprecation warnings, and release artifacts generated.

## 9. Milestones & Roadmap
- **v1.1.x** (current)
  - Deprecation warning mitigation, enhanced tests, PRD + release documentation.
- **Future Considerations**
  - Support for monorepo detection (Lerna/Nx) to run scoped releases.
  - Optional lint/test command customization via config file.
  - Telemetry opt-in for release statistics (downloads, success rates).

## 10. Risks & Mitigations
- **Dependency API Changes**: Upstream packages may alter file paths. Mitigate with targeted module resolution and tests.
- **User Customization Conflicts**: Custom scripts might skip tests. Provide documentation for overriding behavior.
- **Platform Differences**: Windows path quoting; addressed via `buildPreloadFlag` helper.

## 11. Release & QA Checklist
- [x] `npm test` (alias for `node --test`) passes.
- [x] Manual run of `node scripts/release.js --help` shows no `[DEP0176]` warning.
- [ ] Update `CHANGELOG.md` (handled by standard-version during actual release).
- [ ] Verify README reflects latest setup instructions before shipping.

## 12. Appendices
- **Release Notes**: See `docs/release-notes/` for per-change summaries.
- **Testing Artifacts**: `test/` directory contains Node test runner suites.
