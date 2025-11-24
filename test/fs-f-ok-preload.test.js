const test = require('node:test');
const assert = require('node:assert');

const releaseModulePath = require.resolve('../scripts/release.cjs');
const preloadModulePath = require.resolve('../scripts/preload/fs-f-ok.cjs');

test('fs.F_OK aligns with fs.constants.F_OK after preload', () => {
  delete require.cache[releaseModulePath];
  delete require.cache[preloadModulePath];

  const fs = require('fs');

  require('../scripts/release.cjs');

  assert.strictEqual(fs.F_OK, fs.constants.F_OK);
});
