'use strict';

const { spawnSync } = require('child_process');

const VALID_RELEASE_TYPES = new Set(['patch', 'minor', 'major']);

const STDERR_SUMMARY_LIMIT = 200;

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
 * @param {{ type?: string|null, extraArgs?: string[], cliPath: string }} options
 * @returns {{ command: string, args: string[] }}
 */
function buildStandardVersionInvocation({ type = null, extraArgs = [], cliPath }) {
  return {
    command: process.execPath,
    args: [cliPath, ...(type ? ['--release-as', type] : []), ...extraArgs]
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
 * Run a semantic release, push the resulting tag by explicit ref, and verify
 * that origin really advertises it. Never uses `git push --tags`.
 *
 * @param {{
 *   cwd?: string,
 *   type?: null | 'patch' | 'minor' | 'major',
 *   extraArgs?: string[],
 *   spawn?: (cmd: string, args: string[], opts?: object) => { status: number|null, stdout: unknown, stderr: unknown, error?: Error|null },
 *   log?: (message: string) => void,
 *   resolveStandardVersion?: () => string | null
 * }} [options]
 * @returns {{ ok: boolean, tag: string | null, reason: string | null }}
 */
function runRelease({
  cwd = process.cwd(),
  type = null,
  extraArgs = [],
  spawn = spawnSync,
  log = console.log,
  resolveStandardVersion = resolveStandardVersionCli
} = {}) {
  const releaseType = type === undefined ? null : type;

  if (releaseType !== null && !VALID_RELEASE_TYPES.has(releaseType)) {
    return { ok: false, tag: null, reason: 'invalid release type' };
  }

  const cliPath = resolveStandardVersion();

  if (!cliPath) {
    return { ok: false, tag: null, reason: 'standard-version tidak terpasang' };
  }

  const extra = Array.isArray(extraArgs) ? extraArgs : [];
  const invocation = buildStandardVersionInvocation({
    type: releaseType,
    extraArgs: extra,
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

  const describeResult = normalizeResult(
    spawn('git', ['describe', '--tags', '--abbrev=0'], { cwd, ...SPAWN_OPTIONS })
  );
  const tag = describeResult.stdout.trim();

  if (isFailure(describeResult) || !tag) {
    return {
      ok: false,
      tag: null,
      reason: `tag rilis tidak ditemukan setelah standard-version: ${failureDetail(describeResult)}`
    };
  }

  const tagRef = `refs/tags/${tag}`;

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
  VALID_RELEASE_TYPES
};
