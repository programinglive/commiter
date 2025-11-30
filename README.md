# Commiter 🚀

[![npm version](https://img.shields.io/npm/v/%40programinglive%2Fcommiter.svg)](https://www.npmjs.com/package/@programinglive/commiter)
[![npm downloads](https://img.shields.io/npm/dm/%40programinglive%2Fcommiter.svg)](https://www.npmjs.com/package/@programinglive/commiter)
[![publish status](https://img.shields.io/github/actions/workflow/status/programinglive/commiter/publish.yml?label=publish)](https://github.com/programinglive/commiter/actions/workflows/publish.yml)
[![license: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A standardized commit convention and release management tool for your repository using `standard-version`.

## Features

- ✅ **Enforced Commit Conventions** - Uses Conventional Commits format
- 🎯 **Automated Versioning** - Semantic versioning (major, minor, patch)
- 📝 **Changelog Generation** - Automatic CHANGELOG.md with icons
- 🔒 **Git Hooks** - Pre-commit and commit-msg validation via Husky
- 🎨 **Icon Support** - Each commit type has a dedicated icon in releases

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

### Patch Release (1.0.0 → 1.0.1)

For bug fixes and minor changes:

```bash
npm run release:patch
```

### Minor Release (1.0.0 → 1.1.0)

For new features (backwards compatible):

```bash
npm run release:minor
```

### Major Release (1.0.0 → 2.0.0)

For breaking changes:

```bash
npm run release:major
```

### Automatic Release

Let `standard-version` determine the version bump based on commits:

```bash
npm run release
```

## What Happens During Release?

1. 🧪 **Runs tests** - Detects your package manager and runs the `test` script automatically (tests only run during release, not on commit)
2. 📊 **Analyzes commits** - Examines commits since last release
3. 🔢 **Bumps version** - Updates version in `package.json`
4. 📝 **Updates changelog** - Generates `CHANGELOG.md` with icons
5. 🏷️ **Creates tag** - Creates a git tag for the release
6. 💾 **Commits release** - Commits changes with format: `chore(release): v1.2.3 🚀`

## Push Your Release

After running a release command, push to remote:

```bash
git push --follow-tags origin main
```

## Pre-commit Hooks

The following hooks are automatically enforced:

- **commit-msg**: Validates commit message format using commitlint
- **pre-commit**: Empty hook (tests are run only during release, not on commit)

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

### First release

If this is your first release and you don't have a version tag yet:

```bash
npm run release -- --first-release
```

Running the setup command ensures the default `npm test` script is `echo "No tests specified"`, preventing the Husky `pre-commit` hook from failing during this initial release. Replace it with your real test command once available.

### Dry run

To see what would happen without making changes:

```bash
npm run release -- --dry-run
```

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
