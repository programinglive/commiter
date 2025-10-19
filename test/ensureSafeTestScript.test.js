const test = require('node:test');
const assert = require('node:assert');
const { ensureSafeTestScript } = require('../index');

test('sets default test script when none provided', () => {
  const scripts = ensureSafeTestScript();
  assert.strictEqual(scripts.test, 'echo "No tests specified"');
});

test('replaces failing default test script', () => {
  const scripts = ensureSafeTestScript({
    test: 'echo "Error: no test specified" && exit 1',
  });

  assert.strictEqual(scripts.test, 'echo "No tests specified"');
});

test('leaves custom test script untouched', () => {
  const scripts = ensureSafeTestScript({ test: 'npm run lint' });

  assert.strictEqual(scripts.test, 'npm run lint');
});
