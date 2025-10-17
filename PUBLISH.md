# Publishing to NPM

This guide explains how to publish the `@programinglive/commiter` package to npm.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **Login to NPM**: Run `npm login` in your terminal
3. **Organization Access**: Ensure you have access to the `@programinglive` organization on npm

## Publishing Steps

### 1. Login to NPM

```bash
npm login
```

Enter your npm credentials when prompted.

### 2. Verify Package Configuration

Check that `package.json` is correctly configured:

```bash
npm pack --dry-run
```

This shows what files will be included in the package.

### 3. Publish the Package

For the first publish:

```bash
npm publish --access public
```

**Note**: The `--access public` flag is required for scoped packages (@programinglive/commiter) to be publicly accessible.

### 4. Verify Publication

Check your package on npm:
```
https://www.npmjs.com/package/@programinglive/commiter
```

## Releasing New Versions

After the initial publish, use the built-in release commands:

### Patch Release (1.0.0 → 1.0.1)
```bash
npm run release:patch
git push --follow-tags origin main
npm publish
```

### Minor Release (1.0.0 → 1.1.0)
```bash
npm run release:minor
git push --follow-tags origin main
npm publish
```

### Major Release (1.0.0 → 2.0.0)
```bash
npm run release:major
git push --follow-tags origin main
npm publish
```

## Automated Release Workflow

1. Make changes and commit using conventional commits
2. Run the appropriate release command
3. Push to GitHub with tags
4. Publish to npm

Example:
```bash
# Make changes
git add .
git commit -m "feat(cli): add interactive setup wizard"

# Create release
npm run release:minor

# Push to GitHub
git push --follow-tags origin main

# Publish to npm
npm publish
```

## Unpublishing (Emergency Only)

If you need to unpublish a version within 72 hours:

```bash
npm unpublish @programinglive/commiter@1.0.0
```

**Warning**: Unpublishing is permanent and should only be used in emergencies.

## Package Visibility

- **Public**: Anyone can install and use the package
- **Open Source**: MIT licensed - users can modify and distribute
- **Free**: No cost to install or use

## Support

For issues or questions:
- GitHub Issues: https://github.com/programinglive/commiter/issues
- NPM Package: https://www.npmjs.com/package/@programinglive/commiter
