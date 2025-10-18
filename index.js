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

    // Add scripts
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.prepare = 'husky';
    packageJson.scripts.release = 'standard-version';
    packageJson.scripts['release:major'] = 'npm run release -- --release-as major';
    packageJson.scripts['release:minor'] = 'npm run release -- --release-as minor';
    packageJson.scripts['release:patch'] = 'npm run release -- --release-as patch';

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

    // Determine commitlint config format based on project module type
    const isEsmProject = packageJson.type === 'module';
    const commitlintConfigFile = isEsmProject ? 'commitlint.config.js' : 'commitlint.config.cjs';
    const commitlintConfigContent = isEsmProject
      ? `export default { extends: ['@commitlint/config-conventional'] }\n`
      : `module.exports = { extends: ['@commitlint/config-conventional'] }\n`;

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
    console.log('  npm run release:major  - Create a major release (1.0.0 → 2.0.0)');
    console.log('  npm run release:minor  - Create a minor release (1.0.0 → 1.1.0)');
    console.log('  npm run release:patch  - Create a patch release (1.0.0 → 1.0.1)');
    console.log('  npm run release        - Auto-detect version bump\n');
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

module.exports = { setupCommiter };
