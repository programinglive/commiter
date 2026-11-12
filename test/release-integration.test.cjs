'use strict';
// Runs against the temporary test-only standard-version stub created by the QA harness.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync}=require('node:child_process');
const {runRelease}=require('../lib/release');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'commiter-integration-')); t.after(()=>fs.rmSync(root,{force:true,recursive:true}));
 const cwd=path.join(root,'repo'), origin=path.join(root,'origin.git'); fs.mkdirSync(cwd);git(root,'init','--bare',origin);
 git(cwd,'init','-b','main');git(cwd,'config','user.name','Test');git(cwd,'config','user.email','test@example.com');
 fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({name:'fixture',version:'1.0.0',scripts:{test:'echo ok'}},null,2)+'\n');
 fs.writeFileSync(path.join(cwd,'README.md'),'- **Versi**: 1.0.0 (tag `v1.0.0`)\n');
 git(cwd,'add','.');git(cwd,'commit','-m','init');git(cwd,'remote','add','origin',origin);git(cwd,'push','-u','origin','main');
 return {cwd,origin};
}
test('published release atomically advances remote branch and annotated tag',t=>{
 const {cwd,origin}=fixture(t);
 const before=git(cwd,'rev-parse','HEAD');
 const result=runRelease({cwd, log:()=>{}});
 assert.equal(result.ok,true,result.reason);assert.equal(result.state,'PUBLISHED');assert.equal(result.tag,'v1.0.1');
 const remoteBranch=git(cwd,'ls-remote','origin','refs/heads/main').split(/\s+/)[0];
 const remoteTag=git(cwd,'ls-remote','origin','refs/tags/v1.0.1').split(/\s+/)[0];
 assert.equal(remoteBranch,result.commit);assert.equal(remoteTag,git(cwd,'rev-parse','refs/tags/v1.0.1'));
 assert.notEqual(remoteBranch,before);
 assert.equal(git(cwd,'cat-file','-t','refs/tags/v1.0.1'),'tag');
 assert.match(fs.readFileSync(path.join(cwd,'README.md'),'utf8'),/v1.0.1/);
});
test('rejected atomic push rolls back commit while preserving generated files',t=>{
 const {cwd,origin}=fixture(t);
 const before=git(cwd,'rev-parse','HEAD');
 const hooks=path.join(origin,'hooks');
 fs.writeFileSync(path.join(hooks,'pre-receive'),'#!/bin/sh\nexit 1\n',{mode:0o755});
 const result=runRelease({cwd,log:()=>{}});
 assert.equal(result.ok,false);assert.equal(result.state,'REJECTED',result.reason);
 assert.equal(git(cwd,'rev-parse','HEAD'),before);
 assert.equal(git(cwd,'tag','-l'),'');
 assert.equal(git(cwd,'ls-remote','origin','refs/tags/v1.0.1'),'');
 assert.equal(git(cwd,'ls-remote','origin','refs/heads/main').split(/\s+/)[0],before);
 assert.match(git(cwd,'status','--short'),/package.json/);
});
