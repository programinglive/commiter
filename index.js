#!/usr/bin/env node

/**
 * Commiter - Commit convention tooling for standard-version releases
 * 
 * This package helps enforce conventional commits and automate releases
 * with beautiful changelogs featuring icons for each commit type.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureSafeTestScript(scripts = {}) {
  const defaultFailingTestScript = 'echo "Error: no test specified" && exit 1';
  if (!scripts.test || scripts.test === defaultFailingTestScript) {
    scripts.test = 'echo "No tests specified"';
  }
  return scripts;
}

function setupCommiter() {
  console.log('🚀 Setting up Commiter...\n');

  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ Error: package.json not found. Please run this in a Node.js project directory.');
    process.exit(1);
  }

  try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install --save-dev standard-version @commitlint/cli @commitlint/config-conventional husky', {
      stdio: 'inherit'
    });

    // Read package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    packageJson.scripts = ensureSafeTestScript(packageJson.scripts || {});
    // Add scripts
    packageJson.scripts.prepare = 'husky';
    packageJson.scripts.release = 'node scripts/release.js';
    packageJson.scripts['release:major'] = 'node scripts/release.js major';
    packageJson.scripts['release:minor'] = 'node scripts/release.js minor';
    packageJson.scripts['release:patch'] = 'node scripts/release.js patch';

    // Add standard-version config
    packageJson['standard-version'] = {
      releaseCommitMessageFormat: 'chore(release): {{currentTag}} 🚀',
      types: [
        { type: 'feat', section: '✨ Features' },
        { type: 'fix', section: '🐛 Bug Fixes' },
        { type: 'perf', section: '⚡ Performance' },
        { type: 'refactor', section: '♻️ Refactors' },
        { type: 'docs', section: '📝 Documentation' },
        { type: 'style', section: '💄 Styles' },
        { type: 'test', section: '✅ Tests' },
        { type: 'build', section: '🏗️ Build System' },
        { type: 'ci', section: '👷 Continuous Integration' },
        { type: 'chore', section: '🧹 Chores' },
        { type: 'revert', section: '⏪ Reverts' }
      ]
    };

    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    // Create release helper script
    console.log('🛠️  Creating release helper script...');
    const releaseScriptDir = path.join(process.cwd(), 'scripts');
    if (!fs.existsSync(releaseScriptDir)) {
      fs.mkdirSync(releaseScriptDir, { recursive: true });
    }

    const releaseScriptPath = path.join(releaseScriptDir, 'release.js');
    const releaseScriptContent = [
      '#!/usr/bin/env node',
      '',
      "const { spawnSync } = require('child_process');",
      '',
      'const VALID_RELEASE_TYPES = new Set([',
      "  'major',",
      "  'minor',",
      "  'patch',",
      "  'premajor',",
      "  'preminor',",
      "  'prepatch',",
      "  'prerelease'",
      ']);',
      '',
      "const SEMVER_REGEX = /^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$/;",
      '',
      'function getCliArguments(argv = process.argv) {',
      '  const rawArgs = argv.slice(2);',
      '  if (rawArgs.length === 0) {',
      '    return { releaseType: undefined, extraArgs: [] };',
      '  }',
      '',
      "  if (rawArgs[0].startsWith('-')) {",
      '    return { releaseType: undefined, extraArgs: rawArgs };',
      '  }',
      '',
      '  const [firstArg, ...rest] = rawArgs;',
      '  return { releaseType: firstArg, extraArgs: rest };',
      '}',
      '',
      'function getNpmRunArgument(env = process.env) {',
      '  try {',
      "    const npmArgs = JSON.parse(env.npm_config_argv || '{}');",
      '    const original = npmArgs.original || [];',
      "    const releaseIndex = original.lastIndexOf('release');",
      '    if (releaseIndex !== -1) {',
      '      return original[releaseIndex + 1];',
      '    }',
      '  } catch (error) {',
      '    // Ignore JSON parsing issues and fall back to defaults',
      '  }',
      '  return undefined;',
      '}',
      '',
      'function buildStandardVersionArgs({ releaseType, extraArgs }) {',
      '  const args = [];',
      '  if (releaseType) {',
      '    const normalized = releaseType.trim();',
      '    const isValid = VALID_RELEASE_TYPES.has(normalized) || SEMVER_REGEX.test(normalized);',
      '    if (!isValid) {',
      '      const allowed = Array.from(VALID_RELEASE_TYPES).join(", ");',
      '      throw new Error(`Unknown release type "${normalized}". Use one of ${allowed} or a valid semver version.`);',
      '    }',
      "    args.push('--release-as', normalized);",
      '  }',
      '',
      '  if (Array.isArray(extraArgs) && extraArgs.length > 0) {',
      '    args.push(...extraArgs);',
      '  }',
      '',
      '  return args;',
      '}',
      '',
      'function runRelease({ argv = process.argv, env = process.env, spawn = spawnSync } = {}) {',
      '  const { releaseType: cliReleaseType, extraArgs } = getCliArguments(argv);',
      '  const inferredReleaseType = cliReleaseType || getNpmRunArgument(env);',
      '  const standardVersionArgs = buildStandardVersionArgs({',
      '    releaseType: inferredReleaseType,',
      '    extraArgs',
      '  });',
      '',
      "  const standardVersionBin = require.resolve('standard-version/bin/cli.js');",
      '  return spawn(process.execPath, [standardVersionBin, ...standardVersionArgs], {',
      "    stdio: 'inherit'",
      '  });',
      '}',
      '',
      'if (require.main === module) {',
      '  try {',
      '    const result = runRelease();',
      '    if (result.status !== 0) {',
      '      process.exit(result.status ?? 1);',
      '    }',
      '  } catch (error) {',
      '    console.error(`❌ ${error.message}`);',
      '    process.exit(1);',
      '  }',
      '}',
      '',
      'module.exports = {',
      '  VALID_RELEASE_TYPES,',
      '  SEMVER_REGEX,',
      '  getCliArguments,',
      '  getNpmRunArgument,',
      '  buildStandardVersionArgs,',
      '  runRelease',
      '};'
    ].join('\n');

    fs.writeFileSync(releaseScriptPath, releaseScriptContent + '\n');
    try {
      fs.chmodSync(releaseScriptPath, 0o755);
    } catch (error) {
      // Ignore chmod errors on non-POSIX systems
    }

    // Determine commitlint config format based on project module type
    const isEsmProject = packageJson.type === 'module';
    const commitlintConfigFile = isEsmProject ? 'commitlint.config.js' : 'commitlint.config.cjs';
    const commitlintConfigContent = isEsmProject
      ? `export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message.startsWith('chore(release):')]
}\n`
      : `module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message.startsWith('chore(release):')]
}\n`;

    const legacyCommitlintConfigFile = isEsmProject ? 'commitlint.config.cjs' : 'commitlint.config.js';
    if (fs.existsSync(legacyCommitlintConfigFile)) {
      fs.rmSync(legacyCommitlintConfigFile);
    }

    console.log(`⚙️  Creating commitlint config (${commitlintConfigFile})...`);
    fs.writeFileSync(commitlintConfigFile, commitlintConfigContent);

    // Initialize Husky
    console.log('🐶 Setting up Husky...');
    execSync('npx husky init', { stdio: 'inherit' });

    // Create commit-msg hook
    const huskyDir = path.join(process.cwd(), '.husky');
    if (!fs.existsSync(huskyDir)) {
      fs.mkdirSync(huskyDir, { recursive: true });
    }

    const commitMsgHook = `#!/usr/bin/env sh

npx --no -- commitlint --edit "$1"
`;
    fs.writeFileSync(path.join(huskyDir, 'commit-msg'), commitMsgHook);
    fs.chmodSync(path.join(huskyDir, 'commit-msg'), 0o755);

    console.log('\n✅ Commiter setup complete!\n');
    console.log('📚 Available commands:');
    console.log('  npm run release major  - Create a major release (1.0.0 → 2.0.0)');
    console.log('  npm run release minor  - Create a minor release (1.0.0 → 1.1.0)');
    console.log('  npm run release patch  - Create a patch release (1.0.0 → 1.0.1)');
    console.log('  npm run release        - Auto-detect version bump');
    console.log('  npm run release -- --prerelease beta  - Create a beta prerelease\n');
    console.log('🎯 Commit format: type(scope): subject');
    console.log('   Example: feat(auth): add user login\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupCommiter();
}

module.exports = { setupCommiter, ensureSafeTestScript };
