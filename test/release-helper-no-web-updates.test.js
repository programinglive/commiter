const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const releaseScriptPath = path.join(__dirname, '..', 'scripts', 'release.cjs');

const forbiddenPatterns = [
  /update-web-version/i,
  /update-web-releases/i,
  /web\s*\/?index\.html/i
];

test('release helper stays scoped to repository assets', () => {
  const content = fs.readFileSync(releaseScriptPath, 'utf8');

  for (const pattern of forbiddenPatterns) {
    assert.ok(
      !pattern.test(content),
      `Expected release.cjs to avoid referencing ${pattern}`
    );
  }
});
