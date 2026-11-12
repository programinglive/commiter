'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { updateReleaseNotes } = require('./release-notes');

// Every type standard-version accepts as `--release-as`. The `pre*` types were
// rejected by 1.4.0 even though standard-version supports them.
const VALID_RELEASE_TYPES = new Set([
  'patch',
  'minor',
  'major',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease'
]);

// A release without an explicit type is a patch. Letting standard-version
// auto-detect made the bump depend on commit history instead of the operator.
const DEFAULT_RELEASE_TYPE = 'patch';

// standard-version 9.5.0 treats `--first-release` as "do not bump", so the flag
// is mapped to an explicit version instead of being forwarded.
const FIRST_RELEASE_FLAG = '--first-release';
const FIRST_RELEASE_TYPE = '0.0.1';

const STDERR_SUMMARY_LIMIT = 200;

// The helper's default path, written with forward slashes because it is handed
// to `git add` and must stay identical on Windows.
const RELEASE_NOTES_GIT_PATH = 'docs/release-notes/RELEASE_NOTES.md';
const README_GIT_PATH = 'README.md';

// `git diff --cached --quiet` reports "there are staged changes" as exit 1.
const GIT_DIFF_HAS_STAGED_CHANGES = 1;

// The stub npm writes into a fresh package.json. Running it would fail every
// release, so it is treated as "no test script".
const NPM_DEFAULT_FAILING_TEST_SCRIPT = 'echo "Error: no test specified" && exit 1';

// `- **Versi**: 1.4.0 (tag `v1.4.0`)` -> the version and the tag are rewritten.
const README_VERSION_PATTERN = /^(- \*\*Versi\*\*:\s*)\S+(\s*\(tag\s*`v)[^`]+`/m;

// Every child process is asked for text, so the default spawnSync path returns
// strings instead of Buffers.
const SPAWN_OPTIONS = { encoding: 'utf8' };

/**
 * Coerce a spawn result field to text. The default spawnSync returns Buffers
 * unless `encoding` is set, and an injected spawn may return either.
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

/**
 * Reduce a command's stderr to a single, short line safe to embed in a reason.
 * @param {string} stderr
 * @returns {string}
 */
function summarizeStderr(stderr) {
  const text = toText(stderr);
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return '';
  }

  return firstLine.length > STDERR_SUMMARY_LIMIT
    ? `${firstLine.slice(0, STDERR_SUMMARY_LIMIT)}...`
    : firstLine;
}

/**
 * Normalise a spawnSync-shaped result. Fails closed: a missing status stays
 * `null` (never `0`) and `error` is preserved, so a spawn that never ran is
 * never mistaken for a success.
 * @param {{ status?: number|null, stdout?: unknown, stderr?: unknown, error?: Error|null } | undefined} result
 */
function normalizeResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('spawn tidak mengembalikan hasil')
    };
  }

  return {
    status: typeof result.status === 'number' ? result.status : null,
    stdout: toText(result.stdout),
    stderr: toText(result.stderr),
    error: result.error || null
  };
}

/**
 * A command failed when it could not be started, was killed, or exited non-zero.
 * @param {{ status: number|null, error: Error|null }} result
 * @returns {boolean}
 */
function isFailure(result) {
  return Boolean(result.error) || result.status === null || result.status !== 0;
}

/**
 * Short human-readable cause for a failed command.
 * @param {{ stderr: string, error: Error|null }} result
 * @returns {string}
 */
function failureDetail(result) {
  const stderr = summarizeStderr(result.stderr);
  if (stderr) {
    return stderr;
  }

  if (result.error && result.error.message) {
    return summarizeStderr(result.error.message);
  }

  return 'perintah gagal tanpa keluaran';
}

/**
 * Locate the standard-version CLI entry point.
 * @returns {string|null}
 */
function resolveStandardVersionCli() {
  try {
    return require.resolve('standard-version/bin/cli.js');
  } catch (error) {
    return null;
  }
}

/**
 * Build the standard-version invocation. Running the CLI through the current
 * Node binary works on Windows without `shell: true`, which `npx` would need.
 *
 * `--release-as` is always present: the type is resolved before this point, so
 * standard-version never falls back to its own detection.
 *
 * @param {{ type?: string|null, extraArgs?: string[], cliPath: string }} options
 * @returns {{ command: string, args: string[] }}
 */
function buildStandardVersionInvocation({
  type = DEFAULT_RELEASE_TYPE,
  extraArgs = [],
  cliPath
}) {
  return {
    command: process.execPath,
    args: [cliPath, '--release-as', type || DEFAULT_RELEASE_TYPE, ...extraArgs]
  };
}

/**
 * Undo the local side effects of a release whose tag could not be pushed.
 * `--mixed` keeps the operator's file changes in the working tree.
 * @param {{ cwd: string, tag: string, spawn: Function, log: Function }} options
 * @returns {{ tagDeleted: boolean, commitUndone: boolean }}
 */
function rollbackRelease({ cwd, tag, spawn, log }) {
  const tagResult = normalizeResult(spawn('git', ['tag', '-d', tag], { cwd, ...SPAWN_OPTIONS }));
  const tagDeleted = !isFailure(tagResult);

  if (!tagDeleted) {
    log(`Gagal menghapus tag lokal ${tag}: ${failureDetail(tagResult)}`);
  }

  const resetResult = normalizeResult(
    spawn('git', ['reset', '--mixed', 'HEAD~1'], { cwd, ...SPAWN_OPTIONS })
  );
  const commitUndone = !isFailure(resetResult);

  if (!commitUndone) {
    log(`Gagal membatalkan commit rilis: ${failureDetail(resetResult)}`);
  }

  return { tagDeleted, commitUndone };
}

/**
 * Find an argument that would bypass the validated release type or the tag
 * push. `--release-as null` once produced a `vnull` tag, so it is rejected
 * before anything runs rather than silently dropped.
 * @param {string[]} extraArgs
 * @returns {string|null}
 */
function findForbiddenArg(extraArgs) {
  const forbidden = extraArgs.find((arg) => {
    if (typeof arg !== 'string') {
      return false;
    }

    if (arg === '--release-as' || arg.startsWith('--release-as=')) {
      return true;
    }

    if (arg === '--skip.tag' || arg.startsWith('--skip.tag=')) {
      return true;
    }

    // `-r` is the short form of `--release-as`; `-rnull` and `-r=null` too.
    return arg === '-r' || arg.startsWith('-r=') || /^-r[^-]/.test(arg);
  });

  return forbidden || null;
}

/**
 * Read and parse the repository's package.json. Returns `null` when the file is
 * missing or unreadable, so callers can report a clear reason instead of
 * crashing.
 * @param {string} cwd
 * @returns {object|null}
 */
function readPackageJsonFile(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  } catch (error) {
    return null;
  }
}

/**
 * Resolve the release type to hand to standard-version.
 * @param {{ type: string|null, extraArgs: string[] }} options
 * @returns {string}
 */
function resolveReleaseType({ type, extraArgs }) {
  if (extraArgs.includes(FIRST_RELEASE_FLAG)) {
    return FIRST_RELEASE_TYPE;
  }

  return type || DEFAULT_RELEASE_TYPE;
}

/**
 * Read the version standard-version just wrote. The package.json read before
 * the bump still holds the previous version, so it is read again here.
 * @param {{ cwd: string, readPackageJson: Function }} options
 * @returns {string}
 */
function readReleasedVersion({ cwd, readPackageJson }) {
  const packageJson = readPackageJson(cwd);

  if (!packageJson || typeof packageJson.version !== 'string') {
    return '';
  }

  return packageJson.version.trim();
}

/**
 * The command that gates a release. `commiter.release.verify` wins over the
 * `test` script; a repository with neither is not gated.
 * @param {object|null} packageJson
 * @returns {string|null}
 */
function resolveVerifyCommand(packageJson) {
  const configured =
    packageJson && packageJson.commiter && packageJson.commiter.release
      ? packageJson.commiter.release.verify
      : null;

  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim();
  }

  const testScript =
    packageJson && packageJson.scripts ? packageJson.scripts.test : null;

  if (typeof testScript !== 'string' || !testScript.trim()) {
    return null;
  }

  if (testScript.trim() === NPM_DEFAULT_FAILING_TEST_SCRIPT) {
    return null;
  }

  return 'npm test';
}

/**
 * Refuse to release on top of uncommitted work. Untracked files count: they
 * would otherwise be swept into the release commit by a later `git add`.
 * @param {{ cwd: string, spawn: Function }} options
 * @returns {{ clean: boolean, detail: string }}
 */
function checkWorkingTree({ cwd, spawn }) {
  const result = normalizeResult(
    spawn('git', ['status', '--porcelain'], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(result)) {
    return {
      clean: false,
      detail: `status pohon kerja tidak terbaca: ${failureDetail(result)}`
    };
  }

  if (result.stdout.trim()) {
    return {
      clean: false,
      detail: 'pohon kerja kotor: ada perubahan belum ter-commit. Commit atau stash dulu.'
    };
  }

  return { clean: true, detail: '' };
}

/**
 * Rewrite the version line in a README, if it has one.
 * @param {string} content
 * @param {string} version
 * @returns {string}
 */
function applyReadmeVersion(content, version) {
  return content.replace(
    README_VERSION_PATTERN,
    (match, prefix, tagPrefix) => `${prefix}${version}${tagPrefix}${version}\``
  );
}

/**
 * Sync the README version line with the released version. A missing README or a
 * README without the pattern is skipped, never fatal.
 * @param {{ rootDir?: string, version: string, readFile?: Function, writeFile?: Function }} options
 * @returns {boolean} whether the file was rewritten
 */
function syncReadmeVersion({
  rootDir = process.cwd(),
  version,
  readFile = fs.readFileSync,
  writeFile = fs.writeFileSync
} = {}) {
  const readmePath = path.join(rootDir, README_GIT_PATH);

  let content;
  try {
    content = toText(readFile(readmePath, 'utf8'));
  } catch (error) {
    return false;
  }

  const updated = applyReadmeVersion(content, version);

  if (updated === content) {
    return false;
  }

  try {
    writeFile(readmePath, updated);
  } catch (error) {
    return false;
  }

  return true;
}

/**
 * Stage a file and report a staging failure as a hard error.
 * @param {{ cwd: string, gitPath: string, spawn: Function }} options
 * @returns {{ ok: boolean, detail: string }}
 */
function stageFile({ cwd, gitPath, spawn }) {
  const addResult = normalizeResult(
    spawn('git', ['add', gitPath], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(addResult)) {
    return { ok: false, detail: `${gitPath} gagal di-stage: ${failureDetail(addResult)}` };
  }

  return { ok: true, detail: '' };
}

/**
 * Refresh the release notes and the README version line, stage both, and fold
 * them into the release commit so the tag points at a commit that really
 * contains the new version.
 *
 * A notes file without a table is skipped with a warning: the shape of a
 * document must never fail a release. The amend only happens when staging
 * produced changes, so a repository with neither file is left untouched.
 *
 * @param {{
 *   cwd: string,
 *   tag: string,
 *   version: string,
 *   spawn: Function,
 *   log: Function,
 *   updateNotes: Function,
 *   syncReadme: Function
 * }} options
 * @returns {{ ok: boolean, detail: string }}
 */
function embedReleaseArtifacts({
  cwd,
  tag,
  version,
  spawn,
  log,
  updateNotes,
  syncReadme
}) {
  const staged = [];

  let notesUpdated = false;
  try {
    notesUpdated = updateNotes({ rootDir: cwd }) === true;
  } catch (error) {
    log(`Peringatan: release notes dilewati: ${error.message}`);
  }

  if (notesUpdated) {
    const stagedNotes = stageFile({ cwd, gitPath: RELEASE_NOTES_GIT_PATH, spawn });
    if (!stagedNotes.ok) {
      return stagedNotes;
    }
    staged.push(RELEASE_NOTES_GIT_PATH);
  }

  let readmeUpdated = false;
  try {
    readmeUpdated = syncReadme({ rootDir: cwd, version }) === true;
  } catch (error) {
    log(`Peringatan: README tidak disinkronkan: ${error.message}`);
  }

  if (readmeUpdated) {
    const stagedReadme = stageFile({ cwd, gitPath: README_GIT_PATH, spawn });
    if (!stagedReadme.ok) {
      return stagedReadme;
    }
    staged.push(README_GIT_PATH);
  }

  if (staged.length === 0) {
    return { ok: true, detail: 'tidak ada berkas tambahan' };
  }

  const diffResult = normalizeResult(
    spawn('git', ['diff', '--cached', '--quiet'], { cwd, ...SPAWN_OPTIONS })
  );

  // Exit 0 means nothing is staged. Anything above 1 is a real git error.
  const diffUnreadable =
    Boolean(diffResult.error) ||
    diffResult.status === null ||
    diffResult.status > GIT_DIFF_HAS_STAGED_CHANGES;

  if (diffUnreadable) {
    return {
      ok: false,
      detail: `status perubahan ter-stage tidak terbaca: ${failureDetail(diffResult)}`
    };
  }

  if (diffResult.status === 0) {
    return { ok: true, detail: 'tidak ada perubahan ter-stage' };
  }

  const amendResult = normalizeResult(
    spawn('git', ['commit', '--amend', '--no-edit'], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(amendResult)) {
    return {
      ok: false,
      detail: `commit rilis gagal di-amend: ${failureDetail(amendResult)}`
    };
  }

  const moveTagResult = normalizeResult(
    spawn('git', ['tag', '-f', tag], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(moveTagResult)) {
    return {
      ok: false,
      detail: `tag ${tag} gagal digeser ke commit hasil amend: ${failureDetail(moveTagResult)}`
    };
  }

  log(`${staged.join(' dan ')} ikut masuk ke commit ${tag}`);
  return { ok: true, detail: 'berkas tambahan masuk ke commit rilis' };
}

/**
 * Run a semantic release, push the resulting tag by explicit ref, and verify
 * that origin really advertises it. Never uses `git push --tags`.
 *
 * The steps run in order and stop at the first failure: working tree guard,
 * test gate, standard-version, release notes, README sync, amend and tag move,
 * tag push, remote verification, rollback on a rejected push.
 *
 * @param {{
 *   cwd?: string,
 *   type?: null | 'patch' | 'minor' | 'major' | 'premajor' | 'preminor' | 'prepatch' | 'prerelease',
 *   extraArgs?: string[],
 *   spawn?: (cmd: string, args: string[], opts?: object) => { status: number|null, stdout: unknown, stderr: unknown, error?: Error|null },
 *   log?: (message: string) => void,
 *   resolveStandardVersion?: () => string | null,
 *   readPackageJson?: (cwd: string) => object | null,
 *   updateNotes?: (options: { rootDir: string }) => boolean,
 *   syncReadme?: (options: { rootDir: string, version: string }) => boolean
 * }} [options]
 * @returns {{ ok: boolean, tag: string | null, reason: string | null }}
 */
function runRelease({
  cwd = process.cwd(),
  type = null,
  extraArgs = [],
  spawn = spawnSync,
  log = console.log,
  resolveStandardVersion = resolveStandardVersionCli,
  readPackageJson = readPackageJsonFile,
  updateNotes = updateReleaseNotes,
  syncReadme = syncReadmeVersion
} = {}) {
  const releaseType = type === undefined ? null : type;

  if (releaseType !== null && !VALID_RELEASE_TYPES.has(releaseType)) {
    return { ok: false, tag: null, reason: 'invalid release type' };
  }

  const extra = Array.isArray(extraArgs) ? extraArgs : [];
  const forbidden = findForbiddenArg(extra);

  if (forbidden) {
    return { ok: false, tag: null, reason: `${forbidden} tidak boleh diteruskan` };
  }

  const cliPath = resolveStandardVersion();

  if (!cliPath) {
    return { ok: false, tag: null, reason: 'standard-version tidak terpasang' };
  }

  const tree = checkWorkingTree({ cwd, spawn });

  if (!tree.clean) {
    return { ok: false, tag: null, reason: tree.detail };
  }

  const packageJson = readPackageJson(cwd);
  const verifyCommand = resolveVerifyCommand(packageJson);

  if (verifyCommand) {
    log(`Running ${verifyCommand}`);
    const verifyResult = normalizeResult(
      spawn(verifyCommand, [], { cwd, ...SPAWN_OPTIONS, shell: true })
    );

    if (isFailure(verifyResult)) {
      return {
        ok: false,
        tag: null,
        reason: `gerbang uji gagal (${verifyCommand}): ${failureDetail(verifyResult)}`
      };
    }
  }

  const effectiveType = resolveReleaseType({ type: releaseType, extraArgs: extra });
  const forwardedArgs = extra.filter((arg) => arg !== FIRST_RELEASE_FLAG);
  const invocation = buildStandardVersionInvocation({
    type: effectiveType,
    extraArgs: forwardedArgs,
    cliPath
  });

  log(`Running ${invocation.command} ${invocation.args.join(' ')}`);
  const releaseResult = normalizeResult(
    spawn(invocation.command, invocation.args, { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(releaseResult)) {
    return {
      ok: false,
      tag: null,
      reason: `standard-version gagal: ${failureDetail(releaseResult)}`
    };
  }

  const version = readReleasedVersion({ cwd, readPackageJson });

  if (!version) {
    return {
      ok: false,
      tag: null,
      reason: 'versi rilis tidak terbaca dari package.json setelah standard-version'
    };
  }

  // The tag comes from package.json, never from `git describe`: describe can
  // point at the previous release tag and move it instead of creating a new one.
  const tag = `v${version}`;
  const tagRef = `refs/tags/${tag}`;

  const artifacts = embedReleaseArtifacts({
    cwd,
    tag,
    version,
    spawn,
    log,
    updateNotes,
    syncReadme
  });

  if (!artifacts.ok) {
    return {
      ok: false,
      tag,
      reason:
        `tag ${tag} belum didorong: ${artifacts.detail}. ` +
        'Periksa commit rilis dan tag lokal secara manual.'
    };
  }

  log(`Pushing ${tagRef} to origin`);
  const pushResult = normalizeResult(
    spawn('git', ['push', 'origin', tagRef], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(pushResult)) {
    const rollback = rollbackRelease({ cwd, tag, spawn, log });
    const rollbackNote =
      rollback.tagDeleted && rollback.commitUndone
        ? 'Tag lokal dihapus dan commit rilis dibatalkan (git reset --mixed HEAD~1); perubahan masih ada di working tree.'
        : 'Rollback tidak lengkap; periksa tag lokal dan commit rilis secara manual.';

    return {
      ok: false,
      tag,
      reason: `tag ${tag} gagal didorong: ${failureDetail(pushResult)}. ${rollbackNote}`
    };
  }

  const verifyResult = normalizeResult(
    spawn('git', ['ls-remote', '--tags', 'origin', tagRef], { cwd, ...SPAWN_OPTIONS })
  );

  if (isFailure(verifyResult) || !verifyResult.stdout.trim()) {
    return { ok: false, tag, reason: `tag ${tag} tidak ditemukan di origin` };
  }

  log(`Tag ${tag} terverifikasi di origin`);
  return { ok: true, tag, reason: null };
}

module.exports = {
  runRelease,
  summarizeStderr,
  normalizeResult,
  isFailure,
  buildStandardVersionInvocation,
  resolveStandardVersionCli,
  resolveReleaseType,
  resolveVerifyCommand,
  readReleasedVersion,
  checkWorkingTree,
  findForbiddenArg,
  applyReadmeVersion,
  syncReadmeVersion,
  embedReleaseArtifacts,
  readPackageJsonFile,
  VALID_RELEASE_TYPES,
  DEFAULT_RELEASE_TYPE,
  FIRST_RELEASE_TYPE,
  README_VERSION_PATTERN,
  RELEASE_NOTES_GIT_PATH,
  README_GIT_PATH
};
