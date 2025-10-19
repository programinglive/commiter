const test = require('node:test');
const assert = require('node:assert');
const { ensureSafeTestScript } = require('../index');
const commitlintConfig = require('../commitlint.config.cjs');

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

test('commitlint config ignores release commits', () => {
  assert.deepStrictEqual(commitlintConfig.extends, ['@commitlint/config-conventional']);
  assert.ok(Array.isArray(commitlintConfig.ignores));
  const ignoreFn = commitlintConfig.ignores[0];
  assert.strictEqual(ignoreFn('chore(release): 0.1.0 🚀'), true);
});

test('commitlint config does not ignore conventional commits', () => {
  const ignoreFn = commitlintConfig.ignores[0];
  assert.strictEqual(ignoreFn('feat: add feature'), false);
});
