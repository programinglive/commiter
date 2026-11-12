#!/usr/bin/env node
'use strict';
// Compatibility wrapper: all entrypoints must use the same release engine.
// The preload keeps the standard-version `fs.F_OK` deprecation quiet in-process;
// the engine also forwards it to the child process through NODE_OPTIONS.
require('./preload/fs-f-ok.cjs');

let engine;
try { engine = require('@programinglive/commiter/lib/release'); }
catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  engine = require('../lib/release');
}
const {runRelease, VALID_RELEASE_TYPES} = engine;

function main(argv = process.argv.slice(2)) {
  const args = argv.slice();
  const type = VALID_RELEASE_TYPES.has(args[0]) ? args.shift() : null;
  const result = runRelease({type, extraArgs:args});
  if (!result.ok) {
    console.error(`[${result.state}] ${result.reason}`);
    process.exitCode = 1;
  } else {
    console.log(result.dryRun ? `PLAN ONLY: ${result.tag}` : `PUBLISHED: ${result.tag} (${result.commit})`);
  }
  return result;
}

if (require.main === module) main();

module.exports = {main};
