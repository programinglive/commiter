const test = require('node:test');
const assert = require('node:assert/strict');
const { runRelease } = require('../lib/release');

const STANDARD_VERSION_CLI = require.resolve('standard-version/bin/cli.js');

function fakeSpawn(responses) {
  const calls = [];
  const invocations = [];
  const spawn = (cmd, args, opts) => {
    calls.push([cmd, ...args].join(' '));
    invocations.push({ cmd, args, opts });
    const key = [cmd, ...args].find((a) => typeof a === 'string' && responses[a] !== undefined);
    return responses[key] ?? { status: 0, stdout: '', stderr: '' };
  };
  spawn.calls = calls;
  spawn.invocations = invocations;
  return spawn;
}

// The tag now comes from package.json, and the release notes/README steps are
// injected so these tests stay focused on the tag push. `scripts: {}` keeps the
// test gate out of the way.
function release(options = {}) {
  return runRelease({
    readPackageJson: () => ({ version: '1.4.0', scripts: {} }),
    updateNotes: () => false,
    syncReadme: () => false,
    log: () => {},
    ...options,
  });
}

function standardVersionInvocation(spawn) {
  return spawn.invocations.find((invocation) => invocation.cmd === process.execPath);
}

test('push memakai ref tag eksplisit, bukan --tags', () => {
  const spawn = fakeSpawn({
    // Happy path: origin advertises the tag this run just pushed.
    'ls-remote': { status: 0, stdout: '9f1c2ab4d5e6\trefs/tags/v1.4.0\n', stderr: '' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, true);
  const push = spawn.calls.find((c) => c.startsWith('git push'));
  assert.ok(push, 'harus ada git push');
  assert.match(push, /refs\/tags\/v1\.4\.0/);
  assert.doesNotMatch(push, /--tags\b/);
});

test('push tag yang ditolak menggagalkan rilis', () => {
  const spawn = fakeSpawn({
    'refs/tags/v1.4.0': { status: 1, stdout: '', stderr: '! [rejected] already exists' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, false);
  assert.match(result.reason, /rejected|gagal/i);
  assert.match(result.reason, /v1\.4\.0/);
});

test('tag harus terbukti ada di origin', () => {
  const spawn = fakeSpawn({
    'ls-remote': { status: 0, stdout: '', stderr: '' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, false);
  assert.match(result.reason, /tidak ditemukan di origin/i);
});

test('ref tag memakai garis miring biasa, juga di Windows', () => {
  const spawn = fakeSpawn({
    'ls-remote': { status: 0, stdout: '', stderr: '' },
  });
  release({ cwd: 'C:\\repo', type: 'patch', spawn });

  const push = spawn.calls.find((c) => c.startsWith('git push'));
  assert.match(push, /refs\/tags\/v1\.4\.0/);
  assert.doesNotMatch(push, /refs\\tags/);
});

test('tipe rilis tidak sah ditolak sebelum standard-version jalan', () => {
  const spawn = fakeSpawn({});
  const result = release({ cwd: '/repo', type: 'v1', spawn });

  assert.equal(result.ok, false);
  assert.equal(spawn.calls.length, 0, 'tidak boleh menjalankan perintah apa pun');
});

// --- C1 / C2 / I1: the default spawn path must be real, not just fake-friendly ---

test('standard-version dijalankan lewat process.execPath dan cli yang terpasang', () => {
  const spawn = fakeSpawn({
    'ls-remote': { status: 0, stdout: '9f1c2ab4d5e6\trefs/tags/v1.4.0\n', stderr: '' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, true);
  const first = standardVersionInvocation(spawn);
  assert.ok(first, `standard-version harus dijalankan, dapat: ${spawn.calls.join(' | ')}`);
  assert.equal(first.cmd, process.execPath, 'harus memakai process.execPath, bukan npx');
  assert.equal(first.args[0], STANDARD_VERSION_CLI, 'argumen pertama harus cli standard-version');
  assert.deepEqual(first.args.slice(1), ['--release-as', 'patch']);
  assert.equal(first.opts.cwd, '/repo');
  assert.equal(first.opts.encoding, 'utf8', 'encoding wajib agar stdout berupa string, bukan Buffer');
  assert.ok(
    !spawn.calls.some((c) => /\bnpx\b/.test(c)),
    'npx tidak boleh dipakai lagi'
  );
});

test('standard-version yang tidak terpasang dilaporkan tanpa menjalankan perintah', () => {
  const spawn = fakeSpawn({});
  const result = release({
    cwd: '/repo',
    type: 'patch',
    spawn,
    resolveStandardVersion: () => null,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /tidak terpasang/i);
  assert.equal(spawn.calls.length, 0);
});

test('status null dari spawn dianggap gagal, bukan sukses', () => {
  const spawn = fakeSpawn({
    '--release-as': { status: null, stdout: '', stderr: '' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, false);
  assert.match(result.reason, /gagal/i);
  assert.ok(
    !spawn.calls.some((c) => c.startsWith('git push')),
    'tidak boleh lanjut ke git setelah standard-version gagal'
  );
});

test('error spawn (ENOENT) dianggap gagal dan dilaporkan', () => {
  const spawn = fakeSpawn({
    '--release-as': {
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('spawnSync npx ENOENT'),
    },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, false);
  assert.match(result.reason, /ENOENT/);
});

test('stdout berupa Buffer dari spawn tetap terbaca', () => {
  const spawn = fakeSpawn({
    'ls-remote': {
      status: 0,
      stdout: Buffer.from('9f1c2ab4d5e6\trefs/tags/v1.4.0\n'),
      stderr: Buffer.alloc(0),
    },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, true);
  assert.equal(result.tag, 'v1.4.0');
});

// --- I2: a rejected push must not leave a version commit and tag behind ---

test('push ditolak menghapus tag lokal dan membatalkan commit rilis', () => {
  const spawn = fakeSpawn({
    'refs/tags/v1.4.0': { status: 1, stdout: '', stderr: '! [rejected] already exists' },
  });
  const result = release({ cwd: '/repo', type: 'patch', spawn });

  assert.equal(result.ok, false);
  assert.ok(
    spawn.calls.includes('git tag -d v1.4.0'),
    `harus menghapus tag lokal, dapat: ${spawn.calls.join(' | ')}`
  );
  assert.ok(
    spawn.calls.includes('git reset --mixed HEAD~1'),
    `harus membatalkan commit rilis, dapat: ${spawn.calls.join(' | ')}`
  );
  assert.ok(
    !spawn.calls.some((c) => c.includes('--hard')),
    'dilarang memakai git reset --hard'
  );
  assert.match(result.reason, /working tree/i);
});

// --- I4: every child process must carry the explicit cwd ---

test('setiap perintah membawa cwd eksplisit', () => {
  const spawn = fakeSpawn({
    'ls-remote': { status: 0, stdout: '9f1c2ab4d5e6\trefs/tags/v1.4.0\n', stderr: '' },
  });
  release({ cwd: '/repo', type: 'patch', spawn });

  assert.ok(spawn.invocations.length > 0, 'harus ada perintah yang dijalankan');
  for (const invocation of spawn.invocations) {
    assert.equal(invocation.opts.cwd, '/repo');
  }
});
