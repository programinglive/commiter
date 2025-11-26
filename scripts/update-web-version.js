const fs = require('fs');
const path = require('path');

// Get current version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

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
console.log(`✅ Updated website to version ${version}`);
