// Real public CLI integration exercise; no simulator substitutes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const [rootArg,projectArg,cliArg]=process.argv.slice(2);
assert(rootArg&&projectArg,'Usage: validate.mjs SHARED_ROOT NEW_PROJECT [CLI]');
const root=path.resolve(rootArg),project=path.resolve(projectArg),cli=path.resolve(cliArg||'framework/bin/knob-project.mjs');
const audit=project+'-audit';assert(!fs.existsSync(project)&&!fs.existsSync(audit),'Use fresh project/audit directories');fs.mkdirSync(audit,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');
const json=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
function hdl(){return Object.fromEntries(files(project+'/generated').filter(p=>/\.(sv|svh|v)$/.test(p)).map(p=>[path.relative(project+'/generated',p),hash(p)]));}
const actions=[];
function call(label,action,args=[],failure=false){
  const command=[cli,action,'--root',root,'--project',project,...args];
  const r=spawnSync(process.execPath,command,{encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024});
  fs.writeFileSync(audit+'/'+label+'.log',(r.stdout??'')+(r.stderr??''));
  json(audit+'/'+label+'-command.json',{command:[process.execPath,...command],raw_exit:r.status});
  if(failure){assert.equal(r.status,1,label);actions.push({label,status:'expected_failure'});return r.stderr;}
  assert.equal(r.status,0,label+': '+r.stderr);const result=JSON.parse(r.stdout);actions.push({label,status:result.status});return result;
}
const compile=(label)=>call('compile-'+label,'compile',['--build',label,'--env','/home/guodz/install_vcs/vcs_env.sh','--vcs','/home/guodz/install_vcs/bin/vcs']);
const run=(label,build,seed='101')=>call(label,'run',['--build',build,'--name',label,'--seed',seed]);
call('init','init',['--template','alu']);call('generate-initial','generate',['--uv','/home/guodz/bin/uv']);
const cfg=project+'/project.json',config=JSON.parse(read(cfg));
fs.writeFileSync(project+'/handwritten/site_banner.sv','module site_banner; initial $display("INDEPENDENT_EXTENSION retained"); endmodule\n');
config.build.tops.push('site_banner');config.build.sources.push('${PROJECT}/handwritten/site_banner.sv');
json(cfg,config);
const test=project+'/generated/project_benches/ALU/tb/tests/src/test_top.svh';
fs.writeFileSync(test,read(test).replace('// pragma uvmf custom configuration_settings_post_randomize begin','// pragma uvmf custom configuration_settings_post_randomize begin\n    $display("CUSTOM_EXTENSION retained");'));
const handwritten=hash(project+'/handwritten/site_banner.sv');
compile('baseline');run('baseline','baseline');run('replay','baseline');
call('regress','regress',['--build','baseline','--name','batch','--seeds','101,202']);
const before=hdl();json(audit+'/hdl-before.json',before);
call('generate-same','generate',['--uv','/home/guodz/bin/uv']);assert.deepEqual(hdl(),before,'Same YAML changed HDL');
assert.equal(hash(project+'/handwritten/site_banner.sv'),handwritten);
compile('same');run('same','same');
const yaml=project+'/config/ALU_environment.yaml';let yamlText=read(yaml);
assert(yamlText.includes('config_vars: []'));
yamlText=yamlText.replace('config_vars: []',"config_vars:\n      - name: audit_marker\n        type: int\n        isrand: 'False'\n        value: '17'");fs.writeFileSync(yaml,yamlText);
assert.match(call('reject-stale-yaml','run',['--build','same','--name','should-not-run','--seed','101'],true),/Build inputs changed/);
assert(!fs.existsSync(project+'/runs/should-not-run'));
assert.match(call('reject-unregenerated','compile',['--build','should-not-compile','--env','/home/guodz/install_vcs/vcs_env.sh','--vcs','/home/guodz/install_vcs/bin/vcs'],true),/run generate first/);
call('generate-delta','generate',['--uv','/home/guodz/bin/uv']);
assert.match(read(project+'/generated/verification_ip/environment_packages/ALU_env_pkg/src/ALU_env_configuration.svh'),/audit_marker/);
assert.match(read(test),/CUSTOM_EXTENSION retained/);assert.equal(hash(project+'/handwritten/site_banner.sv'),handwritten);
fs.writeFileSync(test,read(test).replace('$display("CUSTOM_EXTENSION retained");','$display("CUSTOM_EXTENSION retained");\n    if (configuration.audit_marker != 17) `uvm_fatal("DELTA", "new configuration field missing")\n    $display("DELTA_FIELD audit_marker=%0d", configuration.audit_marker);'));
compile('delta');run('delta','delta');
const intact=read(test),generationBefore=read(project+'/.verification/generation.json');
fs.writeFileSync(test,intact.replace('// pragma uvmf custom external end','// pragma uvmf custom external end\n// pragma uvmf custom orphan_for_conflict begin\n// user code\n// pragma uvmf custom orphan_for_conflict end'));
const conflictBefore=hdl();
assert.match(call('reject-merge-conflict','generate',['--uv','/home/guodz/bin/uv'],true),/original preserved/);
assert.deepEqual(hdl(),conflictBefore,'Failed merge changed original');assert.equal(read(project+'/.verification/generation.json'),generationBefore);
fs.writeFileSync(test,intact);call('generate-after-dv-repair','generate',['--uv','/home/guodz/bin/uv']);
// Deliberately declare skeleton mode: even a clean functional fixture must not be reported functional-pass.
const skeleton=JSON.parse(read(cfg));skeleton.verification={kind:'skeleton',checks:[]};json(cfg,skeleton);
compile('skeleton');assert.equal(run('skeleton','skeleton').functional_pass,false);
const runs={};for(const name of ['baseline','replay','batch-0','batch-1','same','delta','skeleton']){
  const dir=project+'/runs/'+name,log=read(dir+'/run.log'),result=JSON.parse(read(dir+'/result.json'));
  assert.equal(result.raw_exit,0);assert.equal(result.status,name==='skeleton'?'skeleton_ok':'passed');
  assert.match(log,/CUSTOM_EXTENSION retained/);assert.match(log,/INDEPENDENT_EXTENSION retained/);
  if(['delta','skeleton'].includes(name))assert.match(log,/DELTA_FIELD audit_marker=17/);
  assert.equal([...log.matchAll(/\[SEQ\] Response:/g)].length,25);
  const m=log.match(/PREDICTED_TRANSACTIONS=(\d+) MATCHES=(\d+) MISMATCHES=(\d+)/);assert(m);assert.equal(m[1],m[2]);assert.equal(Number(m[3]),0);
  const trace=log.split('\n').filter(l=>/\[MON\]/.test(l)).map(l=>l.slice(l.indexOf('@'))).join('\n');
  runs[name]={...result,matches:Number(m[2]),trace_sha256:crypto.createHash('sha256').update(trace).digest('hex')};
  assert.deepEqual(JSON.parse(read(dir+'/artifacts-before.json')),JSON.parse(read(dir+'/artifacts-after.json')));
}
assert.equal(runs.baseline.trace_sha256,runs.replay.trace_sha256);assert.equal(runs.baseline.trace_sha256,runs['batch-0'].trace_sha256);
assert.notEqual(runs['batch-0'].trace_sha256,runs['batch-1'].trace_sha256);
for(const name of ['baseline','same','delta','skeleton']){
  const list=read(project+'/build/'+name+'/sources.f');assert(!/knob_pkg|knob\.f/.test(list));assert(list.includes('-F '+project+'/rtl/design.f'));
  assert.deepEqual([...read(project+'/build/'+name+'/compile.log').matchAll(/^Warning-\[([^\]]+)\]/gm)].map(m=>m[1]),['TFIPC','TFIPC']);
}
json(audit+'/results.json',{checked_at:new Date().toISOString(),project,root,actions,runs,same_yaml_hdl_files:Object.keys(before).length,handwritten_sha256:handwritten,delta_field:'audit_marker=17',merge_failure_preserved_original:true,explicit_dv_repair:true,no_knob:true});
console.log(JSON.stringify({actions:actions.length,runs:7,compiles:4,same_yaml_hdl_files:Object.keys(before).length,results:audit+'/results.json'},null,2));
