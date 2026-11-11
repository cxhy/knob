import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [outputArg,sharedArg]=process.argv.slice(2);
assert(outputArg&&sharedArg,'Usage: verify-smoke.mjs OUTPUT SHARED_ROOT');
const out=path.resolve(outputArg),root=path.resolve(sharedArg);
const read=p=>fs.readFileSync(p,'utf8');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const list=read(out+'/sources.f');
assert(list.includes(root+'/uvmf/2023.4_2/payload/uvmf_base_pkg/uvmf_base_pkg.sv'));
assert(!/knob_pkg|knob\.f/.test(list));
const lock=JSON.parse(read(out+'/verification-deps.lock.json'));
assert(!lock.components.knob);
const results={};
for(const name of ['baseline','replay']) {
  const dir=out+'/runs/'+name,log=read(dir+'/run.log');
  assert.equal(Number(read(dir+'/raw-exit-code.txt')),0);
  assert.equal(Number(log.match(/^UVM_ERROR\s*:\s*(\d+)/m)?.[1]),0);
  assert.equal(Number(log.match(/^UVM_FATAL\s*:\s*(\d+)/m)?.[1]),0);
  const m=log.match(/SCOREBOARD_RESULTS:\s+PREDICTED_TRANSACTIONS=(\d+) MATCHES=(\d+) MISMATCHES=(\d+)/);
  assert(m);assert(Number(m[1])>0);assert.equal(m[1],m[2]);assert.equal(Number(m[3]),0);
  assert.equal([...log.matchAll(/\[SEQ\] Response:/g)].length,25);
  assert(!fs.existsSync(dir+'/knob.cfg'));
  const trace=log.split('\n').filter(l=>/\[MON\]/.test(l)).map(l=>l.slice(l.indexOf('@'))).join('\n');
  const artifacts=read(dir+'/artifacts-before.sha256').trim().split('\n');
  for(const line of artifacts){const[,expected,file]=line.match(/^(\w+)  (.+)$/);assert.equal(hash(file),expected);}
  results[name]={seed:101,matches:Number(m[2]),requests:25,trace_sha256:crypto.createHash('sha256').update(trace).digest('hex'),artifacts};
}
assert.equal(results.baseline.trace_sha256,results.replay.trace_sha256);
assert.deepEqual(results.baseline.artifacts,results.replay.artifacts);
for(const[name,ref]of Object.entries(lock.components)){
  const dir=path.join(root,name,ref.version),manifestFile=dir+'/release.json',manifest=JSON.parse(read(manifestFile));
  assert.equal(hash(manifestFile),ref.manifest_sha256);
  for(const[file,expected]of Object.entries(manifest.files))assert.equal(hash(dir+'/payload/'+file),expected);
}
const compile=read(out+'/out/compile.log');assert(!/^Error-/m.test(compile));
const warning_ids=[...compile.matchAll(/^Warning-\[([^\]]+)\]/gm)].map(m=>m[1]);assert.deepEqual(warning_ids,['TFIPC','TFIPC']);
const result={checked_at:new Date().toISOString(),shared_root:root,results,compile_warning_ids:warning_ids,shared_releases_unchanged:true,no_knob:true};
fs.writeFileSync(out+'/shared-results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
