'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {runRelease, parseReleaseOptions, predictVersion, syncReadme} = require('../lib/release');
const git = (cwd, ...args) => execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'commiter-v2-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const origin=path.join(root,'origin.git'),cwd=path.join(root,'repo');
  fs.mkdirSync(cwd); git(root,'init','--bare',origin);
  git(cwd,'init','-b','main'); git(cwd,'config','user.name','Test'); git(cwd,'config','user.email','test@example.com');
  fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({name:'fixture',version:'1.0.0',scripts:{test:'node -e "process.exit(0)"'}},null,2)+'\n');
  git(cwd,'add','package.json'); git(cwd,'commit','-m','initial'); git(cwd,'remote','add','origin',origin); git(cwd,'push','-u','origin','main');
  return {cwd,origin};
}
test('forbid all unrecognized flags including unsafe standard-version forwarding',()=>{
  for (const flag of ['--dry-run=true','--first-release=true','--skip.commit','--skip.tag','--tag-prefix=foo','--release-as=major','-rmajor']) {
    assert.throws(()=>parseReleaseOptions({extraArgs:[flag]}));
  }
});
test('allow simple safe flags and reject duplicate',()=>{
  assert.equal(parseReleaseOptions({extraArgs:['--dry-run']}).dryRun,true);
  assert.throws(()=>parseReleaseOptions({extraArgs:['--dry-run','--dry-run']}));
});
test('predict semantic versions',()=>{
  assert.equal(predictVersion('1.2.3','patch'),'1.2.4');
  assert.equal(predictVersion('1.2.3','minor'),'1.3.0');
  assert.equal(predictVersion('1.2.3','major'),'2.0.0');
  assert.equal(predictVersion('1.2.3','prepatch'),'1.2.4-0');
  assert.equal(predictVersion('1.2.3-0','prerelease'),'1.2.3-1');
});
test('dry run leaves local files, HEAD and refs untouched',t=>{
  const {cwd}=fixture(t);
  const before=git(cwd,'rev-parse','HEAD');
  const result=runRelease({cwd,extraArgs:['--dry-run'],log:()=>{}});
  assert.equal(result.ok,true); assert.equal(result.tag,'v1.0.1');
  assert.equal(git(cwd,'rev-parse','HEAD'),before);
  assert.equal(git(cwd,'status','--porcelain'),'');
  assert.equal(git(cwd,'tag','-l'),'');
});
test('dirty tree and stale branch are rejected',t=>{
  const {cwd}=fixture(t);
  fs.writeFileSync(path.join(cwd,'dirty.tmp'),'dirty');
  assert.equal(runRelease({cwd,extraArgs:['--dry-run'],log:()=>{}}).ok,false);
  fs.rmSync(path.join(cwd,'dirty.tmp'));
  git(cwd,'commit','--allow-empty','-m','local only');
  const result=runRelease({cwd,extraArgs:['--dry-run'],log:()=>{}});
  assert.equal(result.ok,false);
  assert.match(result.reason,/tidak identik/);
});
test('sync README replaces all version lines',t=>{
  const {cwd}=fixture(t);
  fs.writeFileSync(path.join(cwd,'README.md'),'- **Versi**: 1.0.0 (tag `v1.0.0`)\n- **Versi**: 1.0.0 (tag `v1.0.0`)\n');
  syncReadme(cwd,'1.0.1');
  assert.equal(fs.readFileSync(path.join(cwd,'README.md'),'utf8').match(/v1\.0\.1/g).length,2);
});
