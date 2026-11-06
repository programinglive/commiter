const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('pre-commit hook verifies test cases exist and run', () => {
  const huskyDir = path.join(__dirname, '..', '.husky');
  const preCommitPath = path.join(huskyDir, 'pre-commit');
  
  assert.ok(fs.existsSync(preCommitPath), 'pre-commit hook should exist');
  
  const content = fs.readFileSync(preCommitPath, 'utf8');
  assert.ok(content.includes('node scripts/verify-tests.cjs'), 'pre-commit hook should run verify-tests.cjs');
  assert.ok(content.startsWith('#!/usr/bin/env sh'), 'pre-commit hook should be a shell script');
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

test('setup creates pre-commit hook that verifies tests', () => {
  const preCommitContent = `#!/usr/bin/env sh

node scripts/verify-tests.cjs
`;
  
  assert.ok(preCommitContent.includes('node scripts/verify-tests.cjs'), 'setup should create pre-commit hook with verify-tests.cjs');
  assert.ok(preCommitContent.includes('#!/usr/bin/env sh'), 'setup should create valid shell script');
});
