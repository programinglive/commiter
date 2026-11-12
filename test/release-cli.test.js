const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReleaseArgs } = require('../index');

test('commiter release tanpa tipe berarti patch', () => {
  assert.deepEqual(parseReleaseArgs(['release']), { type: null, extraArgs: [] });
});

test('commiter release minor meneruskan tipe', () => {
  assert.deepEqual(parseReleaseArgs(['release', 'minor']), { type: 'minor', extraArgs: [] });
});

test('argumen lain diteruskan apa adanya', () => {
  assert.deepEqual(parseReleaseArgs(['release', '--dry-run']), { type: null, extraArgs: ['--dry-run'] });
});
