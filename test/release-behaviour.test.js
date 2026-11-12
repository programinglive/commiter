const test = require('node:test');
const assert = require('node:assert/strict');
const { runRelease, applyReadmeVersion, README_VERSION_PATTERN } = require('../lib/release');

const RELEASE_NOTES_PATH = 'docs/release-notes/RELEASE_NOTES.md';

function fakeSpawn(responses) {
  const calls = [];
  const invocations = [];
  const queues = {};
  const spawn = (cmd, args, opts) => {
    calls.push([cmd, ...args].join(' '));
    invocations.push({ cmd, args, opts });
    const key = [cmd, ...args].find((a) => typeof a === 'string' && responses[a] !== undefined);

    if (key === undefined) {
      return { status: 0, stdout: '', stderr: '' };
    }

    const response = responses[key];

    if (!Array.isArray(response)) {
      return response;
    }

    // An array is a queue: the nth call for this key gets the nth entry, and the
    // last entry repeats so a longer flow still has a defined answer.
    queues[key] = (queues[key] || 0) + 1;
    return response[Math.min(queues[key] - 1, response.length - 1)];
  };
  spawn.calls = calls;
  spawn.invocations = invocations;
  return spawn;
}

function tagMoveInvocation(spawn) {
  return spawn.invocations.find(
    (invocation) => invocation.cmd === 'git' && invocation.args[0] === 'tag' && invocation.args.includes('-a')
  );
}

function packageJson(overrides = {}) {
  return { version: '1.4.0', scripts: { test: 'node --test' }, ...overrides };
}

function happyPath(overrides = {}) {
  return {
    '--porcelain': { status: 0, stdout: '', stderr: '' },
    'npm test': { status: 0, stdout: '', stderr: '' },
    'ls-remote': { status: 0, stdout: '9f1c2ab4d5e6\trefs/tags/v1.4.0\n', stderr: '' },
    ...overrides,
  };
}

function standardVersionInvocation(spawn) {
  return spawn.invocations.find((invocation) => invocation.cmd === process.execPath);
}

test('tanpa tipe, standard-version menerima --release-as patch', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  const invocation = standardVersionInvocation(spawn);
  assert.ok(invocation, `standard-version harus dijalankan, dapat: ${spawn.calls.join(' | ')}`);
  assert.deepEqual(invocation.args.slice(1), ['--release-as', 'patch']);
});

test('--first-release dipetakan ke --release-as 0.0.1, bukan diteruskan mentah', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    extraArgs: ['--first-release'],
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ version: '0.0.1' }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  const invocation = standardVersionInvocation(spawn);
  assert.deepEqual(invocation.args.slice(1), ['--release-as', '0.0.1']);
  assert.ok(
    !invocation.args.includes('--first-release'),
    'flag mentah tidak boleh diteruskan'
  );
});

test('-r null ditolak sebelum perintah apa pun dijalankan', () => {
  const spawn = fakeSpawn({});
  const result = runRelease({
    cwd: '/repo',
    extraArgs: ['-r', 'null'],
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.tag, null);
  assert.equal(spawn.calls.length, 0, `tidak boleh spawn, dapat: ${spawn.calls.join(' | ')}`);
});

test('--release-as di extraArgs ditolak sebelum perintah apa pun dijalankan', () => {
  const spawn = fakeSpawn({});
  const result = runRelease({
    cwd: '/repo',
    extraArgs: ['--release-as', 'null'],
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.equal(spawn.calls.length, 0, `tidak boleh spawn, dapat: ${spawn.calls.join(' | ')}`);
});

test('--skip.tag ditolak sebelum standard-version jalan', () => {
  const spawn = fakeSpawn({});
  const result = runRelease({
    cwd: '/repo',
    extraArgs: ['--skip.tag'],
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.equal(spawn.calls.length, 0, `tidak boleh spawn, dapat: ${spawn.calls.join(' | ')}`);
});

test('tipe preminor diterima', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    type: 'preminor',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ version: '1.5.0-beta.0' }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  const invocation = standardVersionInvocation(spawn);
  assert.deepEqual(invocation.args.slice(1), ['--release-as', 'preminor']);
});

test('pohon kerja kotor menggagalkan rilis sebelum standard-version', () => {
  const spawn = fakeSpawn(
    happyPath({ '--porcelain': { status: 0, stdout: ' M lib/release.js\n', stderr: '' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /kotor|belum ter-commit/i);
  assert.equal(standardVersionInvocation(spawn), undefined, 'standard-version tidak boleh jalan');
  assert.ok(!spawn.calls.some((call) => call.startsWith('git push')));
});

test('berkas belum terlacak juga dianggap pohon kotor', () => {
  const spawn = fakeSpawn(
    happyPath({ '--porcelain': { status: 0, stdout: '?? notes.txt\n', stderr: '' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.equal(standardVersionInvocation(spawn), undefined);
});

test('gerbang uji yang gagal membatalkan rilis tanpa push', () => {
  const spawn = fakeSpawn(
    happyPath({ 'npm test': { status: 1, stdout: '', stderr: 'not ok 1 - boom' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /uji|test/i);
  assert.equal(standardVersionInvocation(spawn), undefined, 'standard-version tidak boleh jalan');
  assert.ok(!spawn.calls.some((call) => call.startsWith('git push')));
});

test('gerbang uji yang mengotori pohon kerja membatalkan rilis sebelum standard-version', () => {
  const spawn = fakeSpawn(
    happyPath({
      '--porcelain': [
        { status: 0, stdout: '', stderr: '' },
        { status: 0, stdout: ' M package-lock.json\n', stderr: '' },
      ],
    })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /gerbang uji/i);
  assert.match(result.reason, /meninggalkan perubahan/i);
  assert.equal(standardVersionInvocation(spawn), undefined, 'standard-version tidak boleh jalan');
  assert.ok(!spawn.calls.includes('git commit --amend --no-edit'), 'tidak boleh ada commit');
  assert.ok(!spawn.calls.some((call) => call.startsWith('git push')));
});

test('pohon kerja diperiksa ulang setelah gerbang uji, sebelum standard-version', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  const statusCalls = spawn.calls.filter((call) => call === 'git status --porcelain');
  assert.equal(statusCalls.length, 2, `dapat: ${spawn.calls.join(' | ')}`);
  const secondStatus = spawn.calls.lastIndexOf('git status --porcelain');
  const verifyIndex = spawn.calls.indexOf('npm test');
  const releaseIndex = spawn.invocations.findIndex(
    (invocation) => invocation.cmd === process.execPath
  );
  assert.ok(secondStatus > verifyIndex, 'pemeriksaan ulang harus setelah gerbang uji');
  assert.ok(
    releaseIndex >= 0 && spawn.calls.slice(0, releaseIndex).length > secondStatus,
    'pemeriksaan ulang harus sebelum standard-version'
  );
});

test('commiter.release.verify dipakai menggantikan npm test', () => {
  const spawn = fakeSpawn(happyPath({ 'npm run verify': { status: 0, stdout: '', stderr: '' } }));
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ commiter: { release: { verify: 'npm run verify' } } }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.ok(spawn.calls.includes('npm run verify'), `dapat: ${spawn.calls.join(' | ')}`);
  assert.ok(!spawn.calls.includes('npm test'), 'npm test tidak boleh dipakai bila verify disetel');
});

test('repo tanpa skrip test tetap menjalankan npm test', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ scripts: {} }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.ok(spawn.calls.includes('npm test'), `dapat: ${spawn.calls.join(' | ')}`);
});

test('repo tanpa skrip test membatalkan rilis bila npm test gagal', () => {
  const spawn = fakeSpawn(
    happyPath({ 'npm test': { status: 1, stdout: '', stderr: 'Missing script: "test"' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ scripts: {} }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /gerbang uji/i);
  assert.equal(standardVersionInvocation(spawn), undefined, 'standard-version tidak boleh jalan');
  assert.ok(!spawn.calls.includes('git commit --amend --no-edit'), 'tidak boleh ada commit');
  assert.ok(!spawn.calls.some((call) => call.startsWith('git push')));
});

test('skrip test bawaan npm tetap dijalankan dan kegagalannya membatalkan rilis', () => {
  const spawn = fakeSpawn(
    happyPath({
      'npm test': { status: 1, stdout: '', stderr: 'Error: no test specified' }
    })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () =>
      packageJson({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.ok(spawn.calls.includes('npm test'), `dapat: ${spawn.calls.join(' | ')}`);
  assert.equal(result.ok, false);
  assert.equal(standardVersionInvocation(spawn), undefined, 'standard-version tidak boleh jalan');
});

test('release notes tanpa tabel tidak menggagalkan rilis', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => {
      throw new Error('Unable to locate release notes table header.');
    },
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.ok(spawn.calls.some((call) => call.startsWith('git push')));
});

test('README dengan pola versi ikut di-stage', () => {
  const spawn = fakeSpawn(happyPath({ '--cached': { status: 1, stdout: '', stderr: '' } }));
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  assert.ok(
    spawn.calls.includes('git add README.md'),
    `harus men-stage README, dapat: ${spawn.calls.join(' | ')}`
  );
  const addIndex = spawn.calls.indexOf('git add README.md');
  const amendIndex = spawn.calls.indexOf('git commit --amend --no-edit');
  assert.ok(amendIndex > addIndex, 'amend harus setelah README di-stage');
});

test('README tanpa pola versi tidak di-stage', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.ok(!spawn.calls.includes('git add README.md'));
});

test('tag diambil dari package.json, bukan git describe', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ version: '2.0.0' }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.tag, 'v2.0.0');
  assert.ok(
    !spawn.calls.some((call) => call.startsWith('git describe')),
    `git describe tidak boleh dipakai, dapat: ${spawn.calls.join(' | ')}`
  );
  const push = spawn.calls.find((call) => call.startsWith('git push'));
  assert.match(push, /refs\/tags\/v2\.0\.0/);
});

test('versi dibaca ulang setelah standard-version, bukan versi lama', () => {
  const spawn = fakeSpawn(happyPath());
  const versions = ['1.4.0', '1.4.1'];
  let reads = 0;

  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson({ version: versions[Math.min(reads++, versions.length - 1)] }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.tag, 'v1.4.1', 'tag harus memakai versi hasil standard-version');
  const push = spawn.calls.find((call) => call.startsWith('git push'));
  assert.match(push, /refs\/tags\/v1\.4\.1/);
});

test('package.json tanpa versi menggagalkan rilis tanpa push', () => {
  const spawn = fakeSpawn(happyPath());
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => ({ scripts: { test: 'node --test' } }),
    updateNotes: () => false,
    syncReadme: () => false,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /versi/i);
  assert.ok(!spawn.calls.some((call) => call.startsWith('git push')));
});

test('release notes dan README sama-sama masuk ke commit rilis', () => {
  const spawn = fakeSpawn(happyPath({ '--cached': { status: 1, stdout: '', stderr: '' } }));
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => true,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  const notesIndex = spawn.calls.indexOf(`git add ${RELEASE_NOTES_PATH}`);
  const readmeIndex = spawn.calls.indexOf('git add README.md');
  const amendIndex = spawn.calls.indexOf('git commit --amend --no-edit');
  const pushIndex = spawn.calls.findIndex((call) => call.startsWith('git push'));

  assert.ok(notesIndex >= 0, `dapat: ${spawn.calls.join(' | ')}`);
  assert.ok(readmeIndex > notesIndex, 'README di-stage setelah release notes');
  assert.ok(amendIndex > readmeIndex, 'amend setelah kedua berkas di-stage');
  const tagMove = spawn.calls.findIndex((call) => call.startsWith(`git tag -f -a ${result.tag}`));
  assert.ok(tagMove > amendIndex, 'tag digeser setelah amend');
  assert.ok(pushIndex > tagMove, 'push setelah tag digeser');
});

test('tag digeser sebagai tag annotated dengan pesan tag lama', () => {
  const message = 'chore(release): 1.4.0 🚀';
  const spawn = fakeSpawn(
    happyPath({
      '--cached': { status: 1, stdout: '', stderr: '' },
      '--format=%(contents)': { status: 0, stdout: `${message}\n`, stderr: '' },
    })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  const move = tagMoveInvocation(spawn);
  assert.ok(move, `harus menggeser tag dengan -a, dapat: ${spawn.calls.join(' | ')}`);
  assert.deepEqual(move.args.slice(0, 4), ['tag', '-f', '-a', 'v1.4.0']);
  assert.ok(move.args.includes('-m'), `harus memakai -m, dapat: ${move.args.join(' ')}`);
  assert.equal(move.args[move.args.indexOf('-m') + 1], message, 'pesan tag lama dipertahankan');
});

test('tag digeser dengan pesan bawaan bila tag lama tanpa anotasi', () => {
  const spawn = fakeSpawn(
    happyPath({
      '--cached': { status: 1, stdout: '', stderr: '' },
      '--format=%(contents)': { status: 0, stdout: '', stderr: '' },
    })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  const move = tagMoveInvocation(spawn);
  assert.ok(move, `harus menggeser tag dengan -a, dapat: ${spawn.calls.join(' | ')}`);
  assert.equal(move.args[move.args.indexOf('-m') + 1], 'chore(release): 1.4.0');
});

test('amend tidak dipanggil ketika tidak ada perubahan ter-stage', () => {
  const spawn = fakeSpawn(
    happyPath({ '--cached': { status: 0, stdout: '', stderr: '' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => true,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  assert.ok(
    !spawn.calls.includes('git commit --amend --no-edit'),
    `amend tidak boleh dipanggil, dapat: ${spawn.calls.join(' | ')}`
  );
  assert.equal(tagMoveInvocation(spawn), undefined, 'tag tidak boleh digeser tanpa amend');
});

test('amend dipanggil ketika ada perubahan ter-stage', () => {
  const spawn = fakeSpawn(
    happyPath({ '--cached': { status: 1, stdout: '', stderr: '' } })
  );
  const result = runRelease({
    cwd: '/repo',
    spawn,
    log: () => {},
    readPackageJson: () => packageJson(),
    updateNotes: () => false,
    syncReadme: () => true,
  });

  assert.equal(result.ok, true);
  assert.ok(
    spawn.calls.includes('git commit --amend --no-edit'),
    `amend harus dipanggil, dapat: ${spawn.calls.join(' | ')}`
  );
});

// --- README version pattern ---

test('pola versi README diganti dengan versi baru', () => {
  const content = [
    '# Proyek',
    '',
    '- **Versi**: 1.4.0 (tag `v1.4.0`)',
    '- **Lisensi**: MIT',
    '',
  ].join('\n');

  const updated = applyReadmeVersion(content, '1.5.0');

  assert.match(updated, /- \*\*Versi\*\*: 1\.5\.0 \(tag `v1\.5\.0`\)/);
  assert.match(updated, /- \*\*Lisensi\*\*: MIT/);
});

test('README tanpa pola versi dikembalikan apa adanya', () => {
  const content = '# Proyek\n\nTidak ada baris versi.\n';
  assert.equal(applyReadmeVersion(content, '1.5.0'), content);
});

test('pola versi README tidak cocok pada baris lain', () => {
  const content = '- **Versi**: 1.4.0 tanpa tag\n';
  assert.equal(applyReadmeVersion(content, '1.5.0'), content);
  assert.equal(README_VERSION_PATTERN.test(content), false);
});
