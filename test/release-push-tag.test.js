const test = require('node:test');
const assert = require('node:assert/strict');
const { runRelease } = require('../lib/release');

function fakeSpawn(responses) {
  const calls = [];
  const spawn = (cmd, args, opts) => {
    calls.push([cmd, ...args].join(' '));
    const key = [cmd, ...args].find((a) => typeof a === 'string' && responses[a] !== undefined);
    return responses[key] ?? { status: 0, stdout: '', stderr: '' };
  };
  spawn.calls = calls;
  return spawn;
}

test('push memakai ref tag eksplisit, bukan --tags', () => {
  const spawn = fakeSpawn({
    'describe': { status: 0, stdout: 'v1.4.0\n', stderr: '' },
    // Happy path: origin advertises the tag this run just pushed.
    'ls-remote': { status: 0, stdout: '9f1c2ab4d5e6\trefs/tags/v1.4.0\n', stderr: '' },
  });
  const result = runRelease({ cwd: '/repo', type: 'patch', spawn, log: () => {} });

  assert.equal(result.ok, true);
  const push = spawn.calls.find((c) => c.startsWith('git push'));
  assert.ok(push, 'harus ada git push');
  assert.match(push, /refs\/tags\/v1\.4\.0/);
  assert.doesNotMatch(push, /--tags\b/);
});

test('push tag yang ditolak menggagalkan rilis', () => {
  const spawn = fakeSpawn({
    'describe': { status: 0, stdout: 'v1.4.0\n', stderr: '' },
    'refs/tags/v1.4.0': { status: 1, stdout: '', stderr: '! [rejected] already exists' },
  });
  const result = runRelease({ cwd: '/repo', type: 'patch', spawn, log: () => {} });

  assert.equal(result.ok, false);
  assert.match(result.reason, /rejected|gagal/i);
});

test('tag harus terbukti ada di origin', () => {
  const spawn = fakeSpawn({
    'describe': { status: 0, stdout: 'v1.4.0\n', stderr: '' },
    'ls-remote': { status: 0, stdout: '', stderr: '' },
  });
  const result = runRelease({ cwd: '/repo', type: 'patch', spawn, log: () => {} });

  assert.equal(result.ok, false);
  assert.match(result.reason, /tidak ditemukan di origin/i);
});

test('ref tag memakai garis miring biasa, juga di Windows', () => {
  const spawn = fakeSpawn({
    'describe': { status: 0, stdout: 'v1.4.0\n', stderr: '' },
    'ls-remote': { status: 0, stdout: '', stderr: '' },
  });
  runRelease({ cwd: 'C:\\repo', type: 'patch', spawn, log: () => {} });

  const push = spawn.calls.find((c) => c.startsWith('git push'));
  assert.match(push, /refs\/tags\/v1\.4\.0/);
  assert.doesNotMatch(push, /refs\\tags/);
});

test('tipe rilis tidak sah ditolak sebelum standard-version jalan', () => {
  const spawn = fakeSpawn({});
  const result = runRelease({ cwd: '/repo', type: 'v1', spawn, log: () => {} });

  assert.equal(result.ok, false);
  assert.equal(spawn.calls.length, 0, 'tidak boleh menjalankan perintah apa pun');
});
