# Commiter 🚀

[![npm version](https://img.shields.io/npm/v/%40programinglive%2Fcommiter.svg)](https://www.npmjs.com/package/@programinglive/commiter)
[![npm downloads](https://img.shields.io/npm/dm/%40programinglive%2Fcommiter.svg)](https://www.npmjs.com/package/@programinglive/commiter)
[![publish status](https://img.shields.io/github/actions/workflow/status/programinglive/commiter/publish.yml?label=publish)](https://github.com/programinglive/commiter/actions/workflows/publish.yml)
[![license: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A commit convention and release tool for repositories that use `standard-version`.
It enforces Conventional Commits, then runs the whole release in one command:
version bump, changelog, release notes, README version, tag, and a **verified**
push of that tag to origin.

## Release

```bash
npx @programinglive/commiter release          # patch
npx @programinglive/commiter release minor
npx @programinglive/commiter release major
```

One command does all of this, and stops at the first failure:

1. refuses to run on a dirty working tree, the wrong branch, or a stale clone
2. predicts the next version and refuses a tag that already exists
3. generates the version bump, `CHANGELOG.md`, release notes, and README version
   line — without creating a commit or tag
4. runs the project's test script (`npm test`, or `commiter.release.verify` when
   set) on the final tree and cancels the release if it fails — there is no
   bypass, a repository without a `test` script simply fails the gate
5. creates exactly **one** release commit and **one** annotated tag
6. publishes both with a single `git push --atomic`, then compares the remote
   object IDs with the local ones

If the push is rejected, the local commit is rolled back with `git reset --mixed`
and the generated files are kept for inspection. If the remote cannot be read
after a push, the state is `UNKNOWN` and the tool tells you not to retry. See
[Release recovery](docs/RELEASE-RECOVERY.md).

## Features

- ✅ **Enforced Commit Conventions** - Uses Conventional Commits format
- 🎯 **Automated Versioning** - Semantic versioning (major, minor, patch)
- 📝 **Changelog Generation** - Automatic CHANGELOG.md with icons
- 🔒 **Git Hooks** - Pre-commit and commit-msg validation via Husky
- 🎨 **Icon Support** - Each commit type has a dedicated icon in releases
- 🎯 **Enhanced Release Process** - Clear console guidance and optional auto-commit for release notes
- 🤖 **AI-Optimized Workflow** - Built-in guidance for AI assistants with clear next steps and automated git operations

## Installation

Install the package globally or as a dev dependency in your project:

```bash
# Install globally
npm install -g @programinglive/commiter

# Or install as dev dependency
npm install --save-dev @programinglive/commiter

# Or use npx (no installation required)
npx @programinglive/commiter
```

After installation in your project, the Husky hooks will be automatically set up for commit message validation.

### Recommended MCP workflow companion

For a guided end-to-end engineering workflow, install the [Development Workflow MCP Server](https://github.com/programinglive/dev-workflow-mcp-server) alongside Commiter:

```bash
npm install --save-dev @programinglive/dev-workflow-mcp-server
```

Follow the configuration steps in that repository's README to connect your IDE assistant and automate the standard development workflow (start task → implement → test → document → commit → release).

## Commit Message Format

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types with Icons

| Type | Icon | Description | Changelog Section |
|------|------|-------------|-------------------|
| `feat` | ✨ | New feature | ✨ Features |
| `fix` | 🐛 | Bug fix | 🐛 Bug Fixes |
| `perf` | ⚡ | Performance improvement | ⚡ Performance |
| `refactor` | ♻️ | Code refactoring | ♻️ Refactors |
| `docs` | 📝 | Documentation changes | 📝 Documentation |
| `style` | 💄 | Code style changes | 💄 Styles |
| `test` | ✅ | Test additions/changes | ✅ Tests |
| `build` | 🏗️ | Build system changes | 🏗️ Build System |
| `ci` | 👷 | CI/CD changes | 👷 Continuous Integration |
| `chore` | 🧹 | Maintenance tasks | 🧹 Chores |
| `revert` | ⏪ | Revert previous commit | ⏪ Reverts |

### Examples

```bash
# Feature
git commit -m "feat(auth): add JWT authentication"

# Bug fix
git commit -m "fix(api): resolve null pointer exception"

# Breaking change
git commit -m "feat(api)!: redesign user endpoint

BREAKING CHANGE: The user endpoint now returns different data structure"

# With scope and body
git commit -m "perf(database): optimize query performance

Reduced query time by 50% using indexed columns"
```

## Release Commands

```bash
npx @programinglive/commiter release          # patch: 1.0.0 -> 1.0.1
npx @programinglive/commiter release minor    # 1.0.0 -> 1.1.0
npx @programinglive/commiter release major    # 1.0.0 -> 2.0.0
```

`release` with no argument means **patch**. It does not guess from your commits:
a release whose version depends on how the commits happen to be worded is a
release you cannot predict.

### What one command does

It runs the whole release and stops at the first failure:

1. refuses to run on a dirty working tree, on the wrong branch, or on a clone
   that is behind the remote
2. predicts the next version and refuses a tag that already exists
3. runs `standard-version` for **file generation only** — version bump,
   `CHANGELOG.md`, release notes, README version line
4. stages only allowlisted files, then runs your test script
   (`npm test`, or `commiter.release.verify`) on the final tree
5. creates exactly **one** release commit and **one** annotated tag
6. pushes the branch and the tag together with `git push --atomic`
7. compares the remote object IDs with the local ones before reporting success

### When it fails

| Situation | State | What happens |
|---|---|---|
| Dirty working tree | `FAILED` | Stops before writing anything |
| Wrong branch or stale clone | `FAILED` | Stops before writing anything |
| Tag already exists | `FAILED` | Stops before generation; no commit is created |
| Tests fail | `FAILED` | Generated files are restored; the reason names the failing output |
| Push rejected, remote unchanged | `REJECTED` | Local tag deleted, commit rolled back with `--mixed`, generated files kept |
| Another release moved the branch first | `REJECTED_CONCURRENT_UPDATE` | This release is provably not published; local commit and tag rolled back |
| Remote unreadable or ambiguous after push | `UNKNOWN` | Local commit and tag preserved; do not retry before inspecting |

It never leaves a "version X" commit behind without a tag. That is how a release
disappears silently: the commit looks released, the tag never arrived, and the
next release bumps from a version nobody published.

### Why branch and tag are pushed together

`git push` sends the branch, not the tag; `git push --tags` would rewrite every
legacy tag in the repository. Publishing one without the other leaves a window
that cannot be repaired automatically. So the tool publishes exactly two refs in
a single atomic push, and then compares the remote object IDs — because a push
that reports success is not proof the refs arrived, and a ref that exists is not
proof it points at the release commit.

### Why the version must be configured per repo

The release branch defaults to `main`. A repository that releases from `master`
— ERP, for example — must say so:

```json
{
  "commiter": {
    "release": {
      "branch": "master"
    }
  }
}
```

Without it the release fails with a message naming the expected and actual
branch, before it writes anything.

### Additional release files

The release allowlist is strict: `package.json`, npm lockfiles, `CHANGELOG.md`,
`README.md`, and the release notes file. A repository whose release generator
also writes another file must declare it:

```json
{
  "commiter": {
    "release": {
      "additionalFiles": ["docs/AI_CONTEXT.md"]
    }
  }
}
```

Every entry is validated before the release starts: it must be a relative path
inside the repository, with no absolute path, drive letter, backslash, `..`,
`.`, empty segment, or `.git/` access, and no symlink that escapes the
repository. The clean-tree requirement is unchanged, and a file outside the
allowlist still fails the release.

### Full explanation

The complete design — every step, every guarantee, the failure modes, the known
limitations and the open questions — is in
[`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md). The operational contract is in
[`docs/RELEASE-V2-OPERATIONS.md`](docs/RELEASE-V2-OPERATIONS.md), and the
`UNKNOWN`/`MANUAL_RECOVERY` path is in
[`docs/RELEASE-RECOVERY.md`](docs/RELEASE-RECOVERY.md).

## Pre-commit Hooks

The following hooks are automatically enforced:

- **commit-msg**: Validates commit message format using commitlint
- **pre-commit**: Enforces test cases verification before allowing commits (`node scripts/verify-tests.cjs`). If no test cases are found or tests fail, the commit is blocked (AI-assisted engineering standard).

## Configuration Files

- `package.json` - Contains `standard-version` configuration
- `commitlint.config.js` - Commitlint rules
- `.husky/commit-msg` - Commit message validation hook
- `.husky/pre-commit` - Pre-commit test hook

## Troubleshooting

### Commit message validation fails

Ensure your commit message follows the format:
```
type(scope): subject
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Release commits generated by `standard-version` such as `chore(release): 1.0.0 🚀` are automatically ignored by `commitlint`.

### First Release

For a project with no version tags yet, `--first-release` starts at **0.0.1**:

```bash
npx @programinglive/commiter release --first-release
```

It sets the initial version to `0.0.1`, creates the first tag, generates the
initial `CHANGELOG.md`, and commits the release.

### Dry run

**Not supported yet.** `--dry-run` is forwarded to `standard-version`, which
writes nothing, so the version does not change and the tool then moves the
existing tag to `HEAD`. The push is normally rejected and rolled back, but the
local tag has already moved.

Until this is implemented properly, preview a release on a throwaway clone. This
is listed as an open question in
[`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md#9-questions-worth-discussing).

## Website
 
 The project includes a professional landing page in the `web/` directory.
 
 ### Local Development
 
 To run the website locally:
 
 ```bash
 npm run web
 ```
 
 This will serve the website at `http://localhost:3000`.
 
 ## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

This project is open source and free to use, modify, and distribute at your own risk.
