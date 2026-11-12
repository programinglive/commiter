const test = require('node:test');
const assert = require('node:assert');
const { runRelease } = require('../lib/release');
const { setupCommiter } = require('../index.js');

test('setupCommiter displays warning and MCP tip when arguments are present', () => {
  const logs = [];
  const originalConsoleError = console.error;
  const originalArgv = process.argv;
  const originalExit = process.exit;

  console.error = (msg) => logs.push(msg);
  process.argv = ['node', 'index.js', 'commit-message'];

  // The real process.exit terminates the process. Throwing here stops
  // setupCommiter from falling through into the full setup, which would run
  // `npm install` inside this repository.
  const exitSignal = new Error('process.exit called');
  process.exit = (code) => {
    exitSignal.exitCode = code;
    throw exitSignal;
  };

  try {
    assert.throws(() => setupCommiter(), (error) => error === exitSignal);
    assert.strictEqual(exitSignal.exitCode, 1);
    const fullLog = logs.join('\n');
    assert.match(fullLog, /WARNING: @programinglive\/commiter is a SETUP and RELEASE tool/);
    assert.match(fullLog, /TIP for AI: Use the `@programinglive\/dev-workflow-mcp-server`/);
  } finally {
    console.error = originalConsoleError;
    process.argv = originalArgv;
    process.exit = originalExit;
  }
});

test('an invalid release type fails closed with a clear reason', () => {
  const result = runRelease({ type: 'invalid-type', extraArgs: [] });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAILED');
  assert.match(result.reason, /Unknown release type/);
});
