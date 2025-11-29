const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

test('web update scripts are specific to commiter package', async (t) => {
  await t.test('update-web-version.js reads from local package.json or git tags', () => {
    const scriptPath = path.join(projectRoot, 'scripts', 'update-web-version.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should use git tags or local package.json, not parent directories
    assert.ok(
      content.includes('git describe') || content.includes('package.json'),
      'Script should read version from local source'
    );
    
    // Should NOT hardcode paths to other projects
    assert.ok(
      !content.includes('absen'),
      'Script should not reference other projects'
    );
  });

  await t.test('update-web-releases.js only updates commiter web files', () => {
    const scriptPath = path.join(projectRoot, 'scripts', 'update-web-releases.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Should reference local web directory
    assert.ok(
      content.includes("path.join(__dirname, '..', 'web'") || 
      content.includes('web/index.html'),
      'Script should update local web directory'
    );
    
    // Should NOT reference other projects
    assert.ok(
      !content.includes('absen'),
      'Script should not reference other projects'
    );
  });

  await t.test('release.cjs only calls web updates for commiter', () => {
    const releasePath = path.join(projectRoot, 'scripts', 'release.cjs');
    const content = fs.readFileSync(releasePath, 'utf8');
    
    // Should call the web update scripts
    assert.ok(
      content.includes('update-web-version.js'),
      'release.cjs should call update-web-version.js'
    );
    assert.ok(
      content.includes('update-web-releases.js'),
      'release.cjs should call update-web-releases.js'
    );
    
    // Should NOT have conditional logic that would apply to other projects
    assert.ok(
      !content.includes('absen') && !content.includes('other projects'),
      'release.cjs should not reference other projects'
    );
  });

  await t.test('commiter has web directory with index.html', () => {
    const webDir = path.join(projectRoot, 'web');
    assert.ok(fs.existsSync(webDir), 'web directory should exist');
    
    const indexPath = path.join(webDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'web/index.html should exist');
  });

  await t.test('commiter has release notes file', () => {
    const notesPath = path.join(projectRoot, 'docs', 'release-notes', 'RELEASE_NOTES.md');
    assert.ok(fs.existsSync(notesPath), 'docs/release-notes/RELEASE_NOTES.md should exist');
  });
});
