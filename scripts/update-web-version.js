const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current version from latest git tag
let version;
try {
    // Get the latest tag
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    // Remove 'v' prefix if present
    version = tag.startsWith('v') ? tag.substring(1) : tag;
} catch (error) {
    // Fallback to package.json if no tags exist
    console.warn('⚠️  No git tags found, falling back to package.json version');
    const packageJson = require('../package.json');
    version = packageJson.version;
}

const indexPath = path.join(__dirname, '../web/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Update version in the badge
// Matches: <span>v1.1.9 - Latest Release</span>
content = content.replace(
    /<span>v\d+\.\d+\.\d+ - Latest Release<\/span>/,
    `<span>v${version} - Latest Release</span>`
);

// Update version in the stats
// Matches: <div class="stat-value">1.1.9</div>
content = content.replace(
    /<div class="stat-value">\d+\.\d+\.\d+<\/div>(\s*<div class="stat-label">Latest Version<\/div>)/,
    `<div class="stat-value">${version}</div>$1`
);

fs.writeFileSync(indexPath, content);
console.log(`✅ Updated website to version ${version} (from git tag)`);
