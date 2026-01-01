#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { runRelease } = require('./release.cjs');

function runCompleteRelease({
  argv = process.argv,
  cwd = process.cwd(),
  spawn = spawnSync
} = {}) {
  console.log('🚀 Starting complete release process...');
  console.log('   This will run the release and automatically commit/push release notes\n');

  // Run the standard release process
  const releaseResult = runRelease({ argv, cwd, spawn });
  
  if (releaseResult && typeof releaseResult.status === 'number' && releaseResult.status !== 0) {
    console.error('❌ Release failed. Aborting complete release process.');
    return releaseResult;
  }

  // Get the current version for commit message
  const packageJsonPath = path.join(cwd, 'package.json');
  let version = 'unknown';
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    version = packageJson.version;
  } catch (error) {
    console.warn('⚠️  Could not read version from package.json');
  }

  // Check if there are staged changes to commit
  const statusResult = spawn('git', ['status', '--porcelain'], { 
    cwd, 
    encoding: 'utf8' 
  });

  if (statusResult.error || (statusResult.status !== 0)) {
    console.warn('⚠️  Could not check git status. Please commit manually.');
    return releaseResult;
  }

  const stagedChanges = statusResult.stdout.split('\n').filter(line => 
    line.trim() && line.startsWith('A ') || line.startsWith('M ')
  );

  if (stagedChanges.length === 0) {
    console.log('✅ No release notes changes to commit. Release complete!');
    return releaseResult;
  }

  console.log(`📝 Found ${stagedChanges.length} staged change(s) to commit:`);
  stagedChanges.forEach(change => {
    const [status, ...filePathParts] = change.trim().split(' ');
    const filePath = filePathParts.join(' ');
    console.log(`   ${status} ${filePath}`);
  });

  // Commit the staged changes
  const commitMessage = `docs: update release notes for v${version} 📋`;
  console.log(`\n🔄 Committing with message: "${commitMessage}"`);
  
  const commitResult = spawn('git', ['commit', '-m', commitMessage], { 
    stdio: 'inherit', 
    cwd 
  });

  if (commitResult.status !== 0) {
    console.error('❌ Failed to commit release notes. Please commit manually.');
    return commitResult;
  }

  console.log('✅ Release notes committed successfully!');

  // Push the changes
  console.log('\n📤 Pushing changes to remote...');
  const pushResult = spawn('git', ['push'], { 
    stdio: 'inherit', 
    cwd 
  });

  if (pushResult.status !== 0) {
    console.error('❌ Failed to push changes. Please push manually.');
    return pushResult;
  }

  console.log('\n🎉 Complete release process finished successfully!');
  console.log('   ✅ Release completed');
  console.log('   ✅ Release notes generated');
  console.log('   ✅ Changes committed');
  console.log('   ✅ Changes pushed');
  console.log(`\n📦 Version ${version} is now live!`);

  return pushResult;
}

if (require.main === module) {
  try {
    const result = runCompleteRelease();
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  } catch (error) {
    console.error(`❌ Complete release failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  runCompleteRelease
};
