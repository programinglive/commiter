const test = require('node:test');
const assert = require('node:assert');

const {
  extractReleaseSections,
  updateIndexHtml
} = require('../scripts/update-web-releases.js');

test('extractReleaseSections parses release metadata from markdown', () => {
  const markdown = `| Version | Date | Highlights |
|---------|------|------------|
| 1.2.2 | 2025-11-27 | update homepage url (556b173) |
| 1.2.1 | 2025-11-26 | fix website automation (abcdef0) |
| 1.2.0 | 2025-11-26 | See CHANGELOG for details. |

## 1.2.2 – 🧹 Chores

Released on **2025-11-27**.

- update homepage url (556b173)

## 1.2.1 – 🐛 Bug Fixes

Released on **2025-11-26**.

- fix website automation (abcdef0)

## 1.2.0

Released on **2025-11-26**.
`;

  const releases = extractReleaseSections(markdown);
  assert.strictEqual(releases.length, 3);

  assert.deepStrictEqual(releases[0], {
    version: '1.2.2',
    releaseType: '🧹 Chores',
    date: '2025-11-27',
    description: 'update homepage url (556b173)'
  });

  assert.deepStrictEqual(releases[1], {
    version: '1.2.1',
    releaseType: '🐛 Bug Fixes',
    date: '2025-11-26',
    description: 'fix website automation (abcdef0)'
  });

  assert.deepStrictEqual(releases[2], {
    version: '1.2.0',
    releaseType: '',
    date: '2025-11-26',
    description: 'See CHANGELOG for details.'
  });
});

test('updateIndexHtml injects rendered releases and marks latest entry', () => {
  const html = `<div class="releases-timeline">
    <!-- RELEASES_TIMELINE:START -->
    <div class="release-item">Old content</div>
    <!-- RELEASES_TIMELINE:END -->
  </div>`;

  const releases = [
    { version: '1.2.2', releaseType: '🧹 Chores', date: '2025-11-27', description: 'update homepage url' },
    { version: '1.2.1', releaseType: '🐛 Bug Fixes', date: '2025-11-26', description: 'fix website automation' }
  ];

  const output = updateIndexHtml({ htmlContent: html, releases, indent: '    ' });

  assert.ok(output.includes('v1.2.2'));
  assert.ok(output.includes('v1.2.1'));
  assert.ok(output.includes('🧹 Chores'));
  assert.ok(output.includes('🐛 Bug Fixes'));

  const badgeCount = (output.match(/release-badge/g) || []).length;
  assert.strictEqual(badgeCount, 1, 'Only one release should have the Latest badge');

  assert.ok(output.includes('<!-- RELEASES_TIMELINE:START -->'));
  assert.ok(output.includes('<!-- RELEASES_TIMELINE:END -->'));
});

test('updateIndexHtml throws when markers are missing', () => {
  assert.throws(() => {
    updateIndexHtml({ htmlContent: '<div>No markers here</div>', releases: [] });
  }, /markers not found/i);
});
