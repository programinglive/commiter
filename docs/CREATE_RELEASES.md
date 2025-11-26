# Creating GitHub Releases

This guide explains how to populate your GitHub releases page with releases from your tags.

## Problem

You have tags in your repository (v1.0.0, v1.1.9, etc.) but the GitHub releases page is empty. GitHub doesn't automatically create releases from tags - you need to create them manually.

## Solution Options

### Option 1: Use the Automated Script (Recommended)

We've created a script that will automatically create releases for all your tags using the content from CHANGELOG.md.

#### Prerequisites
1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name like "Commiter Releases"
   - Select scope: `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

#### Steps
1. Set your GitHub token as an environment variable:
   ```powershell
   # Windows PowerShell
   $env:GITHUB_TOKEN="your_token_here"
   ```

2. Run the script:
   ```bash
   node scripts/create-releases.js
   ```

3. The script will:
   - Read all your local tags
   - Parse CHANGELOG.md for release notes
   - Create GitHub releases for each tag
   - Skip tags that already have releases

### Option 2: Create Releases Manually

If you prefer to create releases manually or just want to create the latest release:

1. Go to https://github.com/programinglive/commiter/releases
2. Click "Draft a new release"
3. Click "Choose a tag" and select `v1.1.9`
4. Set the release title to `v1.1.9`
5. Copy the release notes from CHANGELOG.md (lines 5-10):
   ```markdown
   ### 🐛 Bug Fixes

   * convert release scripts to CJS to support ESM projects ([842da02](https://github.com/programinglive/commiter/commit/842da0298f1c4df7aa93b43ca8698e3669ef6450))
   ```
6. Click "Publish release"
7. Repeat for other versions if needed

### Option 3: Use GitHub CLI (if installed)

If you have GitHub CLI installed (`gh`):

```bash
# Create release for v1.1.9
gh release create v1.1.9 \
  --title "v1.1.9" \
  --notes "### 🐛 Bug Fixes

* convert release scripts to CJS to support ESM projects"

# Or create from CHANGELOG
gh release create v1.1.9 --notes-file CHANGELOG.md
```

## After Creating Releases

Once releases are created, they will appear on:
- https://github.com/programinglive/commiter/releases
- The right sidebar of your repository
- In the repository's release feed

## Automating Future Releases

To automatically create GitHub releases during your release process, you can:

1. **Add to your release script** - Modify `scripts/release.cjs` to create GitHub releases
2. **Use GitHub Actions** - Set up a workflow that creates releases when tags are pushed
3. **Use the script** - Run `scripts/create-releases.js` after each release

## Troubleshooting

### "GITHUB_TOKEN not set"
Make sure you've set the environment variable in your current terminal session.

### "API rate limit exceeded"
GitHub API has rate limits. The script waits 1 second between requests to avoid this. If you hit the limit, wait an hour and try again.

### "Resource not accessible by integration"
Your token doesn't have the right permissions. Make sure you selected the `repo` scope when creating the token.

## Security Note

**Never commit your GitHub token to the repository!** Always use environment variables or secure secret management.
