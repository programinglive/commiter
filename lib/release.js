'use strict';

const { spawnSync } = require('child_process');

const VALID_RELEASE_TYPES = new Set(['patch', 'minor', 'major']);

const STDERR_SUMMARY_LIMIT = 200;

/**
 * Reduce a command's stderr to a single, short line safe to embed in a reason.
 * @param {string} stderr
 * @returns {string}
 */
function summarizeStderr(stderr) {
  const text = typeof stderr === 'string' ? stderr : '';
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
 * Normalise a spawnSync-shaped result so callers never read from undefined.
 * @param {{ status?: number, stdout?: string, stderr?: string } | undefined} result
 */
function normalizeResult(result) {
  if (!result || typeof result !== 'object') {
    return { status: 0, stdout: '', stderr: '' };
  }

  return {
    status: typeof result.status === 'number' ? result.status : 0,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : ''
  };
}

/**
 * Run a semantic release, push the resulting tag by explicit ref, and verify
 * that origin really advertises it. Never uses `git push --tags`.
 *
 * @param {{
 *   cwd?: string,
 *   type?: null | 'patch' | 'minor' | 'major',
 *   extraArgs?: string[],
 *   spawn?: (cmd: string, args: string[], opts?: object) => { status: number, stdout: string, stderr: string },
 *   log?: (message: string) => void
 * }} [options]
 * @returns {{ ok: boolean, tag: string | null, reason: string | null }}
 */
function runRelease({
  cwd = process.cwd(),
  type = null,
  extraArgs = [],
  spawn = spawnSync,
  log = console.log
} = {}) {
  const releaseType = type === undefined ? null : type;

  if (releaseType !== null && !VALID_RELEASE_TYPES.has(releaseType)) {
    return { ok: false, tag: null, reason: 'invalid release type' };
  }

  const extra = Array.isArray(extraArgs) ? extraArgs : [];
  const standardVersionArgs = [
    'standard-version',
    ...(releaseType ? ['--release-as', releaseType] : []),
    ...extra
  ];

  log(`Running npx ${standardVersionArgs.join(' ')}`);
  const releaseResult = normalizeResult(spawn('npx', standardVersionArgs, { cwd }));

  if (releaseResult.status !== 0) {
    return {
      ok: false,
      tag: null,
      reason: `standard-version gagal: ${summarizeStderr(releaseResult.stderr)}`.trim()
    };
  }

  const describeResult = normalizeResult(
    spawn('git', ['describe', '--tags', '--abbrev=0'], { cwd })
  );
  const tag = describeResult.stdout.trim();

  if (describeResult.status !== 0 || !tag) {
    return {
      ok: false,
      tag: null,
      reason: `tag rilis tidak ditemukan setelah standard-version: ${summarizeStderr(describeResult.stderr)}`.trim()
    };
  }

  const tagRef = `refs/tags/${tag}`;

  log(`Pushing ${tagRef} to origin`);
  const pushResult = normalizeResult(spawn('git', ['push', 'origin', tagRef], { cwd }));

  if (pushResult.status !== 0) {
    return {
      ok: false,
      tag,
      reason: `tag ${tag} gagal didorong: ${summarizeStderr(pushResult.stderr)}`.trim()
    };
  }

  const verifyResult = normalizeResult(
    spawn('git', ['ls-remote', '--tags', 'origin', tagRef], { cwd })
  );

  if (!verifyResult.stdout.trim()) {
    return { ok: false, tag, reason: `tag ${tag} tidak ditemukan di origin` };
  }

  log(`Tag ${tag} terverifikasi di origin`);
  return { ok: true, tag, reason: null };
}

module.exports = {
  runRelease,
  summarizeStderr,
  VALID_RELEASE_TYPES
};
