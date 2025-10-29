const test = require('node:test');
const assert = require('node:assert');
const {
  getCliArguments,
  getNpmRunArgument,
  buildStandardVersionArgs,
  runRelease,
  VALID_RELEASE_TYPES,
  SEMVER_REGEX
} = require('../scripts/release');

const DEFAULT_ARGV = ['node', 'scripts/release.js'];

test('getCliArguments returns undefined release type with no args', () => {
  const result = getCliArguments(DEFAULT_ARGV);
  assert.deepStrictEqual(result, { releaseType: undefined, extraArgs: [] });
});

test('getCliArguments treats leading option as extra arg', () => {
  const argv = [...DEFAULT_ARGV, '--prerelease', 'alpha'];
  const result = getCliArguments(argv);
  assert.deepStrictEqual(result, { releaseType: undefined, extraArgs: ['--prerelease', 'alpha'] });
});

test('getCliArguments parses release type followed by extra args', () => {
  const argv = [...DEFAULT_ARGV, 'major', '--prerelease', 'beta'];
  const result = getCliArguments(argv);
  assert.deepStrictEqual(result, { releaseType: 'major', extraArgs: ['--prerelease', 'beta'] });
});

test('getNpmRunArgument reads release type from npm_config_argv', () => {
  const env = {
    npm_config_argv: JSON.stringify({ original: ['run', 'release', 'minor'] })
  };
  const result = getNpmRunArgument(env);
  assert.strictEqual(result, 'minor');
});

test('getNpmRunArgument returns undefined on malformed JSON', () => {
  const env = { npm_config_argv: '{invalid' };
  const result = getNpmRunArgument(env);
  assert.strictEqual(result, undefined);
});

test('buildStandardVersionArgs accepts known release type', () => {
  const args = buildStandardVersionArgs({ releaseType: 'patch', extraArgs: [] });
  assert.deepStrictEqual(args, ['--release-as', 'patch']);
});

test('buildStandardVersionArgs accepts explicit semver', () => {
  const args = buildStandardVersionArgs({ releaseType: '1.2.3', extraArgs: [] });
  assert.deepStrictEqual(args, ['--release-as', '1.2.3']);
});

test('buildStandardVersionArgs rejects unknown release type', () => {
  assert.throws(() => {
    buildStandardVersionArgs({ releaseType: 'weird', extraArgs: [] });
  }, /Unknown release type/);
});

test('buildStandardVersionArgs appends extra args', () => {
  const args = buildStandardVersionArgs({ releaseType: 'minor', extraArgs: ['--prerelease', 'alpha'] });
  assert.deepStrictEqual(args, ['--release-as', 'minor', '--prerelease', 'alpha']);
});

test('VALID_RELEASE_TYPES contains expected entries', () => {
  const expected = ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'];
  for (const type of expected) {
    assert.ok(VALID_RELEASE_TYPES.has(type), `Expected ${type} to be allowed`);
  }
});

test('SEMVER_REGEX matches standard versions', () => {
  assert.ok(SEMVER_REGEX.test('1.0.0'));
  assert.ok(SEMVER_REGEX.test('2.3.4-beta.1'));
  assert.ok(!SEMVER_REGEX.test('not-a-version'));
});

test('runRelease infers release type from argv', () => {
  const calls = [];
  const spawn = (...args) => {
    calls.push(args);
    return { status: 0 };
  };

  runRelease({
    argv: [...DEFAULT_ARGV, 'minor'],
    env: {},
    spawn
  });

  assert.strictEqual(calls.length, 1);
  const [execPath, [bin, ...args]] = calls[0];
  assert.strictEqual(execPath, process.execPath);
  assert.strictEqual(bin, require.resolve('standard-version/bin/cli.js'));
  assert.deepStrictEqual(args, ['--release-as', 'minor']);
});

test('runRelease uses npm argv when CLI type absent', () => {
  let spawnArgs;
  const spawn = (...args) => {
    spawnArgs = args;
    return { status: 0 };
  };

  runRelease({
    argv: DEFAULT_ARGV,
    env: {
      npm_config_argv: JSON.stringify({ original: ['run', 'release', 'patch'] })
    },
    spawn
  });

  const [, [, ...args]] = spawnArgs;
  assert.deepStrictEqual(args, ['--release-as', 'patch']);
});

test('runRelease throws on invalid release type', () => {
  assert.throws(() => {
    runRelease({
      argv: [...DEFAULT_ARGV, 'invalid'],
      env: {},
      spawn: () => ({ status: 0 })
    });
  }, /Unknown release type/);
});
