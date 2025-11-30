const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

test('pre-commit hook does not run tests', () => {
  const huskyDir = path.join(__dirname, '..', '.husky');
  const preCommitPath = path.join(huskyDir, 'pre-commit');
  
  assert.ok(fs.existsSync(preCommitPath), 'pre-commit hook should exist');
  
  const content = fs.readFileSync(preCommitPath, 'utf8');
  assert.ok(!content.includes('npm test'), 'pre-commit hook should not contain npm test');
  assert.ok(!content.includes('npm run test'), 'pre-commit hook should not contain npm run test');
  assert.ok(content.includes('Pre-commit hook'), 'pre-commit hook should have explanatory comment');
});

test('pre-commit hook exists and has correct content', () => {
  const huskyDir = path.join(__dirname, '..', '.husky');
  const preCommitPath = path.join(huskyDir, 'pre-commit');
  
  assert.ok(fs.existsSync(preCommitPath), 'pre-commit hook should exist');
  
  const content = fs.readFileSync(preCommitPath, 'utf8');
  assert.ok(content.startsWith('#!/usr/bin/env sh'), 'pre-commit hook should be a shell script');
});

test('commit-msg hook still validates commits', () => {
  const huskyDir = path.join(__dirname, '..', '.husky');
  const commitMsgPath = path.join(huskyDir, 'commit-msg');
  
  assert.ok(fs.existsSync(commitMsgPath), 'commit-msg hook should exist');
  
  const content = fs.readFileSync(commitMsgPath, 'utf8');
  assert.ok(content.includes('commitlint'), 'commit-msg hook should use commitlint');
});

test('setup creates pre-commit hook without tests', () => {
  const preCommitContent = `#!/usr/bin/env sh
# Pre-commit hook - tests are run only during release
`;
  
  assert.ok(!preCommitContent.includes('npm test'), 'setup should not create pre-commit with npm test');
  assert.ok(!preCommitContent.includes('npm run test'), 'setup should not create pre-commit with npm run test');
  assert.ok(preCommitContent.includes('#!/usr/bin/env sh'), 'setup should create valid shell script');
});
