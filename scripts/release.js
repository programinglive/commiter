#!/usr/bin/env node

const { spawnSync } = require('child_process');

const VALID_RELEASE_TYPES = new Set([
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease'
]);

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function getCliArguments(argv = process.argv) {
  const rawArgs = argv.slice(2);
  if (rawArgs.length === 0) {
    return { releaseType: undefined, extraArgs: [] };
  }

  if (rawArgs[0].startsWith('-')) {
    return { releaseType: undefined, extraArgs: rawArgs };
  }

  const [firstArg, ...rest] = rawArgs;
  return { releaseType: firstArg, extraArgs: rest };
}

function getNpmRunArgument(env = process.env) {
  try {
    const npmArgs = JSON.parse(env.npm_config_argv || '{}');
    const original = npmArgs.original || [];
    const releaseIndex = original.lastIndexOf('release');
    if (releaseIndex !== -1) {
      return original[releaseIndex + 1];
    }
  } catch (error) {
    // Ignore JSON parsing issues and fall back to defaults
  }
  return undefined;
}

function buildStandardVersionArgs({ releaseType, extraArgs }) {
  const args = [];
  if (releaseType) {
    const normalized = releaseType.trim();
    const isValid = VALID_RELEASE_TYPES.has(normalized) || SEMVER_REGEX.test(normalized);
    if (!isValid) {
      const allowed = Array.from(VALID_RELEASE_TYPES).join(', ');
      throw new Error(`Unknown release type "${normalized}". Use one of ${allowed} or a valid semver version.`);
    }
    args.push('--release-as', normalized);
  }

  if (Array.isArray(extraArgs) && extraArgs.length > 0) {
    args.push(...extraArgs);
  }

  return args;
}

function runRelease({ argv = process.argv, env = process.env, spawn = spawnSync } = {}) {
  const { releaseType: cliReleaseType, extraArgs } = getCliArguments(argv);
  const inferredReleaseType = cliReleaseType || getNpmRunArgument(env);
  const standardVersionArgs = buildStandardVersionArgs({
    releaseType: inferredReleaseType,
    extraArgs
  });

  const standardVersionBin = require.resolve('standard-version/bin/cli.js');
  return spawn(process.execPath, [standardVersionBin, ...standardVersionArgs], {
    stdio: 'inherit'
  });
}

if (require.main === module) {
  try {
    const result = runRelease();
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  VALID_RELEASE_TYPES,
  SEMVER_REGEX,
  getCliArguments,
  getNpmRunArgument,
  buildStandardVersionArgs,
  runRelease
};
