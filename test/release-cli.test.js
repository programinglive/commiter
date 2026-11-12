const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReleaseArgs } = require('../index');

test('commiter release with no type means patch', () => {
  assert.deepEqual(parseReleaseArgs(['release']), { type: null, extraArgs: [] });
});

test('commiter release minor forwards the type', () => {
  assert.deepEqual(parseReleaseArgs(['release', 'minor']), { type: 'minor', extraArgs: [] });
});

test('other arguments are forwarded unchanged', () => {
  assert.deepEqual(parseReleaseArgs(['release', '--dry-run']), { type: null, extraArgs: ['--dry-run'] });
});
