# Contributing to Commiter

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/commiter.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feat/your-feature-name`

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages. This is enforced via git hooks.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (white-space, formatting, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope

The scope should be the name of the affected module/component (e.g., `auth`, `api`, `ui`, `database`).

### Subject

- Use imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end
- Keep it concise (50 characters or less)

### Body

- Use imperative, present tense
- Include motivation for the change and contrast with previous behavior
- Wrap at 72 characters

### Footer

- Reference issues and pull requests
- Note breaking changes with `BREAKING CHANGE:` prefix

### Examples

```bash
# Simple feature
feat(auth): add password reset functionality

# Bug fix with scope
fix(api): handle null response from user endpoint

# Breaking change
feat(api)!: redesign authentication flow

BREAKING CHANGE: The authentication endpoint now requires OAuth2 tokens instead of API keys.
Clients must update their authentication implementation.

# Multiple paragraphs
refactor(database): optimize query performance

This commit introduces connection pooling and query caching
to improve database performance under high load.

The changes reduce average query time by 50% and support
up to 1000 concurrent connections.

Closes #123
```

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation if needed
3. Add tests for new features
4. Ensure all tests pass: `npm test`
5. Update the README.md if needed
6. If modifying the website, verify changes with `npm run web`
7. Create a Pull Request with a clear description

## Release Process

Releases are managed using `standard-version`. Only maintainers can create releases:

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major

# Push release
git push --follow-tags origin main
```

## Questions?

Feel free to open an issue for any questions or concerns.
