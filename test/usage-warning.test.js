const test = require('node:test');
const assert = require('node:assert');
const { runRelease } = require('../scripts/release.cjs');
const { setupCommiter } = require('../index.js');

test('setupCommiter displays warning and MCP tip when arguments are present', () => {
    const logs = [];
    const originalConsoleError = console.error;
    const originalArgv = process.argv;
    const originalExit = process.exit;

    console.error = (msg) => logs.push(msg);
    process.argv = ['node', 'index.js', 'commit-message'];

    let exitCode = null;
    process.exit = (code) => { exitCode = code; };

    try {
        setupCommiter();

        assert.strictEqual(exitCode, 1);
        const fullLog = logs.join('\n');
        assert.match(fullLog, /WARNING: @programinglive\/commiter is a SETUP and RELEASE tool/);
        assert.match(fullLog, /TIP for AI: Use the `@programinglive\/dev-workflow-mcp-server`/);
    } finally {
        console.error = originalConsoleError;
        process.argv = originalArgv;
        process.exit = originalExit;
    }
});

test('runRelease displays warning and MCP tip on invalid release type', () => {
    const logs = [];
    const originalConsoleError = console.error;
    console.error = (msg) => logs.push(msg);

    try {
        assert.throws(() => {
            runRelease({
                argv: ['node', 'scripts/release.cjs', 'invalid-type'],
                env: {},
                spawn: () => ({ status: 0 }),
                dependencies: {
                    isWorkingTreeClean: () => true
                }
            });
        }, /Unknown release type/);

        const fullLog = logs.join('\n');
        assert.match(fullLog, /WARNING: Unknown release type or command detected/);
        assert.match(fullLog, /TIP for AI: Use the `@programinglive\/dev-workflow-mcp-server`/);
    } finally {
        console.error = originalConsoleError;
    }
});
