# Pull Request Checklist

## Summary

Describe the changes in this pull request.

## Related Issues

Link related issues (e.g. closes #123).

## Testing

- [ ] `npm install`
- [ ] `npm test`
- [ ] `npm run release -- --dry-run` (if release-related)

## Checklist

- [ ] I've read the [Code of Conduct](../CODE_OF_CONDUCT.md)
- [ ] I've read the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] My commits follow the Conventional Commits format (`type(scope): subject`)
- [ ] Documentation has been updated if needed
- [ ] New dependencies are justified and added to `package.json`
- [ ] No `any` types were introduced (TypeScript rule)
