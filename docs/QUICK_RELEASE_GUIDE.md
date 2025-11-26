# Quick Guide: Create GitHub Release for v1.1.9

Follow these simple steps to create your first GitHub release:

## Step 1: Navigate to New Release Page
1. Make sure you're logged into GitHub
2. Go to: https://github.com/programinglive/commiter/releases/new

## Step 2: Fill in the Form

### Choose a tag
- Click "Choose a tag"
- Type: `v1.1.9`
- Click "Create new tag: v1.1.9 on publish"

### Release title
- Type: `v1.1.9`

### Describe this release
Copy and paste this content:

```markdown
### 🐛 Bug Fixes

* convert release scripts to CJS to support ESM projects ([842da02](https://github.com/programinglive/commiter/commit/842da0298f1c4df7aa93b43ca8698e3669ef6450))
```

## Step 3: Publish
- Click the green "Publish release" button

## Done! ✅

Your release will now appear at: https://github.com/programinglive/commiter/releases

---

## Create More Releases (Optional)

If you want to create releases for older versions, here's the content for each:

### v1.1.8
**Title:** `v1.1.8`  
**Description:**
```markdown
### 🐛 Bug Fixes

* update installation script to copy missing files and update gitignore ([5d56259](https://github.com/programinglive/commiter/commit/5d562592fe35b684fa12bd89748b24551ae28a66))
```

### v1.1.7
**Title:** `v1.1.7`  
**Description:**
```markdown
### 📝 Documentation

* recommend dev workflow mcp server ([58a5054](https://github.com/programinglive/commiter/commit/58a5054fafd627ef23c448fd93b1383518590ad2))
```

### v1.1.6
**Title:** `v1.1.6`  
**Description:**
```markdown
### 🐛 Bug Fixes

* revert to simple release notes staging to avoid git ref conflicts ([2f6a40e](https://github.com/programinglive/commiter/commit/2f6a40ed7259cffdb0b1de1633af3e43df475044))
```

### v1.1.5
**Title:** `v1.1.5`  
**Description:**
```markdown
### ✨ Features

* include release notes in release commit via amendment ([3f2afa8](https://github.com/programinglive/commiter/commit/3f2afa8bd0bd264d047df06ae791384e74dc827e))

### 📝 Documentation

* update release notes for v1.1.5 ([cb3dbe6](https://github.com/programinglive/commiter/commit/cb3dbe62a85a174bfb074e3d2526a005fc83d0d7))
```

### v1.1.1
**Title:** `v1.1.1`  
**Description:**
```markdown
### 🐛 Bug Fixes

* remove fs.F_OK deprecation warning ([1b0652b](https://github.com/programinglive/commiter/commit/1b0652b88d1b095e1045994948f75ce8194f9d3a))
```

### v1.0.12
**Title:** `v1.0.12`  
**Description:**
```markdown
### ✨ Features

* auto-detect test command during release ([602e30e](https://github.com/programinglive/commiter/commit/602e30e94ff7c58b35f8c54bd495c0334352c72c))
```

---

**Tip:** You only need to create releases for the major versions (1.1.9, 1.1.8, 1.1.7, etc.). You can skip the older patch versions if you want to save time.
