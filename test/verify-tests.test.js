const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We will require verify-tests.cjs once created
let verifyTestsModule;
try {
  verifyTestsModule = require('../scripts/verify-tests.cjs');
} catch (e) {
  verifyTestsModule = null;
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'commiter-test-'));
}

function cleanupTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
}

test('verify-tests module is defined and exports expected functions', () => {
  assert.ok(verifyTestsModule, 'verify-tests.cjs should exist and be loadable');
  assert.strictEqual(typeof verifyTestsModule.findTestFiles, 'function');
  assert.strictEqual(typeof verifyTestsModule.detectTestCommand, 'function');
  assert.strictEqual(typeof verifyTestsModule.verifyTests, 'function');
});

test('findTestFiles returns empty array when directory has no test files', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'index.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'dummy' }));

    const testFiles = verifyTestsModule.findTestFiles(tempDir);
    assert.deepStrictEqual(testFiles, []);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('findTestFiles detects *.test.js and *.spec.ts files', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'app.test.js'), 'test');
    fs.writeFileSync(path.join(tempDir, 'service.spec.ts'), 'test');
    fs.writeFileSync(path.join(tempDir, 'normal.js'), 'code');

    const testFiles = verifyTestsModule.findTestFiles(tempDir);
    assert.strictEqual(testFiles.length, 2);
    const basenames = testFiles.map(f => path.basename(f)).sort();
    assert.deepStrictEqual(basenames, ['app.test.js', 'service.spec.ts']);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('findTestFiles detects files inside test/ or tests/ directories', () => {
  const tempDir = createTempDir();
  try {
    const subtestDir = path.join(tempDir, 'test');
    fs.mkdirSync(subtestDir, { recursive: true });
    fs.writeFileSync(path.join(subtestDir, 'sample.js'), 'test code');

    const testFiles = verifyTestsModule.findTestFiles(tempDir);
    assert.strictEqual(testFiles.length, 1);
    assert.ok(testFiles[0].includes('sample.js'));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('findTestFiles ignores node_modules, .git, and dist directories', () => {
  const tempDir = createTempDir();
  try {
    const nodeModulesDir = path.join(tempDir, 'node_modules', 'some-pkg');
    fs.mkdirSync(nodeModulesDir, { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'ignored.test.js'), 'test code');

    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'ignored.test.js'), 'test code');

    const distDir = path.join(tempDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'bundle.test.js'), 'test code');

    const testFiles = verifyTestsModule.findTestFiles(tempDir);
    assert.deepStrictEqual(testFiles, []);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('detectTestCommand identifies valid npm test script', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'my-project',
      scripts: { test: 'node --test' }
    }));

    const result = verifyTestsModule.detectTestCommand({ cwd: tempDir, env: {} });
    assert.ok(result);
    assert.strictEqual(result.command, 'npm');
    assert.deepStrictEqual(result.args, ['test']);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('detectTestCommand detects placeholder/empty test script as invalid', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'my-project',
      scripts: { test: 'echo "No tests specified"' }
    }));

    const result = verifyTestsModule.detectTestCommand({ cwd: tempDir, env: {} });
    assert.strictEqual(result, null);
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('verifyTests fails when no test files exist in project', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'my-project',
      scripts: { test: 'node --test' }
    }));
    fs.writeFileSync(path.join(tempDir, 'index.js'), 'console.log("no tests");');

    const logs = [];
    const mockLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => logs.push(msg)
    };

    const result = verifyTestsModule.verifyTests({
      cwd: tempDir,
      env: {},
      logger: mockLogger,
      spawn: () => ({ status: 0 })
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'NO_TEST_CASES');
    assert.ok(logs.some(l => l.includes('No test cases found')));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('verifyTests fails when test command fails (exit code !== 0)', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'my-project',
      scripts: { test: 'node --test' }
    }));
    fs.writeFileSync(path.join(tempDir, 'sample.test.js'), 'test');

    const logs = [];
    const mockLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => logs.push(msg)
    };

    const result = verifyTestsModule.verifyTests({
      cwd: tempDir,
      env: {},
      logger: mockLogger,
      spawn: () => ({ status: 1 })
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'TESTS_FAILED');
    assert.ok(logs.some(l => l.includes('Test suite failed')));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('verifyTests succeeds when test files exist and tests pass', () => {
  const tempDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'my-project',
      scripts: { test: 'node --test' }
    }));
    fs.writeFileSync(path.join(tempDir, 'sample.test.js'), 'test');

    const logs = [];
    const mockLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => logs.push(msg)
    };

    let spawnedCommand = null;
    let spawnedArgs = null;
    const result = verifyTestsModule.verifyTests({
      cwd: tempDir,
      env: {},
      logger: mockLogger,
      spawn: (cmd, args) => {
        spawnedCommand = cmd;
        spawnedArgs = args;
        return { status: 0 };
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(spawnedCommand, 'npm');
    assert.deepStrictEqual(spawnedArgs, ['test']);
    assert.ok(logs.some(l => l.includes('passed')));
  } finally {
    cleanupTempDir(tempDir);
  }
});
