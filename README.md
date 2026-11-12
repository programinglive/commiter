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

1. refuses to run on a dirty working tree
2. runs the project's test script
3. bumps the version and writes the changelog
4. updates `docs/release-notes/RELEASE_NOTES.md` and the README version line
5. amends the release commit and moves the tag onto it
6. pushes **only** `refs/tags/<tag>` and proves it arrived with `ls-remote`

If the tag already exists — two people releasing at once — the command fails
loudly, removes the local tag, and undoes the release commit. It never leaves a
"version X" commit behind without a tag, because that is how a release silently
disappears.

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

### Complete Release (Auto-commit & Push)

For fully automated release with git operations:

```bash
npm run release:complete
```

This command:
- Runs the standard release process
- Automatically commits release notes with versioned message
- Pushes changes to remote
- Provides success confirmation

### Automatic Release

Let `standard-version` determine the version bump based on commits:

```bash
npm run release
```

**Note**: This command shows clear guidance for git operations needed after release notes generation.

## What Happens During Release?

1. 🧪 **Runs tests** - Detects your package manager and runs the `test` script automatically
2. 📊 **Analyzes commits** - Examines commits since last release
3. 📘 **Verifies documentation** – Warns if `docs/PRD.md` is missing so every project keeps an up-to-date PRD
4. 🔢 **Bumps version** - Updates version in `package.json`
5. 📝 **Updates changelog** - Generates `CHANGELOG.md` with icons
6. 📋 **Generates release notes** - Creates and stages release notes entry
7. 🏷️ **Creates tag** - Creates a git tag for the release
8. 💾 **Commits release** - Commits changes with format: `chore(release): v1.2.3 🚀`
9. 🎯 **Shows next steps** - Provides clear guidance for git operations needed

## Release Notes Management

### Standard Release (Manual Git Operations)

When using `npm run release`, the tool provides clear console guidance:

```
🎯 Release notes generated and staged successfully!

📋 NEXT STEPS REQUIRED:
   ✅ Release notes have been staged for commit
   🔄 You need to commit and push the release notes:
      git commit -m "docs: update release notes for version"
      git push

💡 AI ASSISTANCE:
   🤖 Use the dev-workflow MCP server to handle the commit and push automatically
   📝 The release notes are now staged and ready for commit
```

### Complete Release (Automated Git Operations)

Use `npm run release:complete` for full automation:
- ✅ Release completed
- ✅ Release notes generated
- ✅ Changes committed
- ✅ Changes pushed

## Push Your Release

After running a standard release command, push to remote:

```bash
git push --follow-tags origin main
```

For complete releases, pushing is handled automatically.

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

For new projects without any version tags, use the first release command to start from version 0.0.1:

```bash
npm run release:first
```

Running the first release command:
- Sets the initial version to **0.0.1**
- Creates the first git tag
- Generates the initial CHANGELOG.md
- Commits the release with proper formatting

This ensures your project starts with a clean, semantic version foundation. Replace the default test script with your real test command once available.

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
