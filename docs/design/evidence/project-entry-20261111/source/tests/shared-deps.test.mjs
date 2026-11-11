import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const cli=path.resolve('framework/bin/knob-deps.mjs');
function execute(args, expected=0) {
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(r.status,expected,r.stderr || r.stdout);
  return expected===0?JSON.parse(r.stdout):r.stderr;
}
function write(root,file,content){const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);}
function setup(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'knob-deps-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const source=path.join(dir,'sources'),root=path.join(dir,'shared'),project=path.join(dir,'project');
  for(const [p,c]of Object.entries({'templates/python/uvmf_version.py':"version='2023.4_2'",'scripts/yaml2uvmf.py':'# fixture','uvmf_base_pkg/uvmf_base_pkg.sv':'// fixture','templates/python/legal/Jinja2/LICENSE':'fixture'}))write(source+'/uvmf',p,c);
  for(const v of ['0.1.0','0.1.1']) {
    write(source+'/'+v,'release.json',JSON.stringify({component:'framework',version:v,python:'3.12.13',node_minimum_major:20}));
    write(source+'/'+v,'bin/knob-deps.mjs','// fixture '+v);
  }
  const publish=(component,version,src)=>execute(['publish','--root',root,'--component',component,'--version',version,'--source',src]);
  publish('uvmf','2023.4_2',source+'/uvmf');
  publish('framework','0.1.0',source+'/0.1.0');
  const pin=(v='0.1.0',extra=[])=>execute(['pin','--root',root,'--project',project,'--uvmf','2023.4_2','--framework',v,...extra]);
  return {dir,source,root,project,publish,pin};
}
test('same release is idempotent; differing content cannot replace it',t=>{
  const s=setup(t),before=fs.readFileSync(s.root+'/framework/0.1.0/release.json');
  assert.equal(s.publish('framework','0.1.0',s.source+'/0.1.0').status,'already-present');
  write(s.source+'/0.1.0','bin/knob-deps.mjs','changed');
  assert.match(execute(['publish','--root',s.root,'--component','framework','--version','0.1.0','--source',s.source+'/0.1.0'],1),/already exists with different content/);
  assert.deepEqual(fs.readFileSync(s.root+'/framework/0.1.0/release.json'),before);
});
test('project without knob is independent; explicit upgrade and rollback preserve old releases',t=>{
  const s=setup(t);s.pin();const lock=s.project+'/verification-deps.lock.json',before=fs.readFileSync(lock);
  assert.equal(Object.hasOwn(JSON.parse(before).components,'knob'),false);
  s.publish('framework','0.1.1',s.source+'/0.1.1');
  assert.deepEqual(fs.readFileSync(lock),before,'new public version implicitly changed old project');
  assert.match(execute(['pin','--root',s.root,'--project',s.project,'--uvmf','2023.4_2','--framework','0.1.1'],1),/use --replace/);
  s.pin('0.1.1',['--replace']);assert.equal(JSON.parse(fs.readFileSync(lock)).components.framework.version,'0.1.1');
  s.pin('0.1.0',['--replace']);assert.deepEqual(fs.readFileSync(lock),before);
});
test('missing target does not change project lock',t=>{
  const s=setup(t);s.pin();const file=s.project+'/verification-deps.lock.json',before=fs.readFileSync(file);
  assert.match(execute(['pin','--root',s.root,'--project',s.project,'--uvmf','2023.4_2','--framework','9.9.9','--replace'],1),/Missing prepared release/);
  assert.deepEqual(fs.readFileSync(file),before);
});
test('tampered or extra payload files are rejected before use',t=>{
  const s=setup(t);s.pin();write(s.root+'/framework/0.1.0/payload','unexpected.txt','extra');
  assert.match(execute(['check','--root',s.root,'--project',s.project],1),/Release content mismatch/);
});
test('manifest changes cannot silently alter a project pin',t=>{
  const s=setup(t);s.pin();const file=s.root+'/framework/0.1.0/release.json',data=JSON.parse(fs.readFileSync(file));
  data.extra='changed manifest';fs.writeFileSync(file,JSON.stringify(data));
  assert.match(execute(['check','--root',s.root,'--project',s.project],1),/Pinned release identity changed/);
});
test('source symlinks and path traversal versions are rejected',t=>{
  const s=setup(t);fs.symlinkSync('release.json',s.source+'/0.1.1/link');
  assert.match(execute(['publish','--root',s.root,'--component','framework','--version','0.1.1','--source',s.source+'/0.1.1'],1),/Symlinks are not accepted/);
  assert.match(execute(['pin','--root',s.root,'--project',s.project,'--uvmf','../escape','--framework','0.1.0'],1),/Invalid explicit version/);
});
test('external runtime missing gives an offline readiness failure',t=>{
  const s=setup(t);s.pin();
  assert.match(execute(['check','--root',s.root,'--project',s.project,'--uv',s.dir+'/not-installed'],1),/Offline Python readiness failed/);
});
test('shared root can relocate without editing project lock',t=>{
  const s=setup(t);s.pin();const before=fs.readFileSync(s.project+'/verification-deps.lock.json');
  fs.renameSync(s.root,s.dir+'/relocated');
  assert.equal(execute(['pin','--root',s.dir+'/relocated','--project',s.project,'--uvmf','2023.4_2','--framework','0.1.0']).status,'unchanged');
  assert.deepEqual(fs.readFileSync(s.project+'/verification-deps.lock.json'),before);
});
