#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {pin,verify,check} from './knob-deps.mjs';

const home=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const metadata=JSON.parse(fs.readFileSync(path.join(home,'release.json'),'utf8'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const json=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const hash=p=>sha(fs.readFileSync(p));
function ensure(value,message){if(!value)throw Error(message);}
function identifier(value){ensure(typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value),'Invalid directory label');return value;}
function inside(project,relative){const p=path.resolve(project,relative);ensure(p.startsWith(project+path.sep),'Expected project-relative path: '+relative);return p;}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{
  ensure(!e.isSymbolicLink(),'Tracked trees must not contain symlinks: '+path.join(dir,e.name));
  if(e.isDirectory())return files(path.join(dir,e.name));
  ensure(e.isFile(),'Unsupported input file');return[path.join(dir,e.name)];
});}
function tree(dir){return Object.fromEntries(files(dir).map(p=>[path.relative(dir,p),hash(p)]));}
function context(o){
  ensure(o.root&&o.project,'--root and --project are required');
  const project=path.resolve(o.project),root=path.resolve(o.root),lock=read(project+'/verification-deps.lock.json');
  ensure(lock.schema===1&&lock.components?.uvmf&&lock.components?.framework,'Invalid project dependency lock');
  for(const[n,e]of Object.entries(lock.components))ensure(JSON.stringify(verify(root,n,e.version))===JSON.stringify(e),'Dependency pin changed: '+n);
  ensure(lock.components.framework.version===metadata.version,'Use the project-pinned framework version');
  ensure(!lock.components.knob,'This release provides the no-knob project path; optional integration follows separately');
  const config=read(project+'/project.json');
  ensure(config.schema===1&&Array.isArray(config.yaml)&&config.yaml.length>0,'project.json requires schema=1 and yaml inputs');
  ensure(config.build&&Array.isArray(config.build.sources)&&Array.isArray(config.build.tracked_inputs)&&config.build.tracked_inputs.length>0,'Declare build.sources and build.tracked_inputs');
  ensure(['skeleton','functional'].includes(config.verification?.kind),'Declare verification.kind as skeleton or functional');
  if(config.verification.kind==='functional')ensure(config.verification.checks?.length>0,'Functional status requires explicit checking rules');
  const uvmf=path.join(root,'uvmf',lock.components.uvmf.version,'payload');
  const c={o,project,root,lock,config,uvmf,generated:project+'/generated'};
  c.expand=value=>{
    ensure(typeof value==='string','Expected a path string');
    const p=value.replaceAll('${PROJECT}',project).replaceAll('${UVMF}',uvmf).replaceAll('${GENERATED}',c.generated);
    ensure(!p.includes('${'),'Unknown path placeholder: '+value);
    return path.resolve(project,p);
  };
  return c;
}
function execute(command,args,dir,cwd,env=process.env,timeout=180000){
  fs.mkdirSync(dir,{recursive:true});json(dir+'/command.json',{command,args,cwd});
  const r=spawnSync(command,args,{cwd,env,encoding:'utf8',timeout,maxBuffer:32*1024*1024});
  fs.writeFileSync(dir+'/console.log',(r.stdout??'')+(r.stderr??''));
  json(dir+'/process.json',{raw_exit:r.status,signal:r.signal,error:r.error?.message??null});
  return r;
}
function offline(c){
  const env={...process.env,UV_CACHE_DIR:c.project+'/.verification/uv-cache',UV_PYTHON_DOWNLOADS:'never',PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1'};
  delete env.VIRTUAL_ENV;delete env.PYTHONHOME;delete env.PYTHONPATH;return env;
}
function generationInput(c){
  const inputs=Object.fromEntries(c.config.yaml.map(f=>[f,hash(inside(c.project,f))]));
  const templates=c.config.generation?.template_dir;
  return sha(JSON.stringify({inputs,templates:templates?tree(c.expand(templates)):null,uvmf:c.lock.components.uvmf,framework:c.lock.components.framework}));
}
function fingerprint(c){
  const tracked=new Set([c.project+'/project.json',c.project+'/verification-deps.lock.json',...c.config.yaml.map(f=>inside(c.project,f)),c.expand(c.config.build.rtl_filelist)]);
  for(const entry of [...c.config.build.tracked_inputs,'generated']){
    const p=c.expand(entry);ensure(fs.existsSync(p),'Missing tracked input: '+p);
    for(const f of fs.statSync(p).isDirectory()?files(p):[p])tracked.add(f);
  }
  for(const p of c.config.build.sources.map(c.expand))tracked.add(p);
  const values=Object.fromEntries([...tracked].sort().map(p=>[p,hash(p)]));
  return {sha256:sha(JSON.stringify(values)),files:values};
}
function init(o){
  ensure(o.root&&o.project&&o.template,'init requires --root --project --template');
  const project=path.resolve(o.project),root=path.resolve(o.root);
  ensure(!/\s/.test(project+root),'Current VCS filelist adapter requires paths without whitespace');
  ensure(!fs.existsSync(project),'Project directory already exists');
  fs.mkdirSync(path.dirname(project),{recursive:true});
  const staging=fs.mkdtempSync(path.join(path.dirname(project),'.init-'));
  try{
    pin({root,project:staging,uvmf:o.uvmf||'2023.4_2',framework:metadata.version});
    const lock=read(staging+'/verification-deps.lock.json'),uvmf=path.join(root,'uvmf',lock.components.uvmf.version,'payload');
    if(o.template==='alu'){
      const tutorial=uvmf+'/docs/generator_tutorials/alu';
      fs.mkdirSync(staging+'/config');
      for(const f of fs.readdirSync(tutorial+'/yaml_config_files').filter(f=>f.endsWith('.yaml')))fs.copyFileSync(tutorial+'/yaml_config_files/'+f,staging+'/config/'+f);
      fs.copyFileSync(home+'/templates/alu/project.json',staging+'/project.json');
      fs.cpSync(tutorial+'/completed_solution/completed_uvmf_template_output',staging+'/generated',{recursive:true});
      // Explicit adapter for the previously verified legacy tutorial marker defect.
      const monitor=staging+'/generated/verification_ip/interface_packages/ALU_in_pkg/src/ALU_in_monitor_bfm.sv';
      const text=fs.readFileSync(monitor,'utf8'),begin=text.indexOf('// pragma uvmf custom do_monitor begin');
      ensure(begin>=0&&!text.includes('// pragma uvmf custom do_monitor end'),'Unexpected tutorial marker layout');
      const end=text.indexOf('  endtask',begin);ensure(end>begin,'Missing tutorial task end');
      fs.writeFileSync(monitor,text.slice(0,end)+'    // pragma uvmf custom do_monitor end\n'+text.slice(end));
      fs.mkdirSync(staging+'/rtl');fs.copyFileSync(staging+'/generated/project_benches/ALU/rtl/verilog/alu.v',staging+'/rtl/alu.v');
      fs.writeFileSync(staging+'/rtl/design.f','alu.v\n');
      json(staging+'/template-origin.json',{template:'alu',uvmf:lock.components.uvmf,legacy_monitor_marker_repair:true,business:'Upstream completed tutorial custom blocks; not automatic protocol synthesis',dut_connection:'Existing tutorial connection; graph-driven mapping not yet implemented'});
    }else{
      const source=fs.realpathSync(o.template);files(source); // Reject links before copying a project/team template.
      ensure(fs.existsSync(source+'/project.json'),'Custom template requires project.json');
      for(const name of fs.readdirSync(source)){
        ensure(!['verification-deps.lock.json','.verification','build','runs'].includes(name),'Template must not supply locks or generated evidence');
        fs.cpSync(source+'/'+name,staging+'/'+name,{recursive:true});
      }
      json(staging+'/template-origin.json',{template:source,content:tree(source)});
    }
    fs.mkdirSync(staging+'/handwritten',{recursive:true});
    fs.writeFileSync(staging+'/.gitignore','/.verification/\n/build/\n/runs/\n');
    context({...o,project:staging});
    fs.renameSync(staging,project);
    return{status:'initialized',project,framework:metadata.version,next:'generate'};
  }catch(error){fs.rmSync(staging,{recursive:true,force:true});throw error;}
}
function generate(c){
  check({root:c.root,project:c.project,uv:c.o.uv||'uv',cache:c.project+'/.verification/uv-cache'});
  const dir=fs.mkdtempSync(c.project+'/.verification/generation-'),candidate=dir+'/candidate',fresh=dir+'/fresh';
  const previous=fs.existsSync(c.generated)?tree(c.generated):null;
  if(previous)fs.cpSync(c.generated,candidate,{recursive:true});
  const args=['run','--no-project','--offline','--python',metadata.python,'python',c.uvmf+'/scripts/yaml2uvmf.py',...c.config.yaml.map(f=>inside(c.project,f)),'-d',fresh];
  if(previous)args.push('-m',candidate,'--overwrite');
  if(c.config.generation?.template_dir)args.push('-t',c.expand(c.config.generation.template_dir));
  const r=execute(c.o.uv||'uv',args,dir,c.project,offline(c));
  if(r.error||r.status!==0){json(dir+'/result.json',{status:'merge_failed',original_preserved:true});throw Error('Generation/merge failed; original preserved. Inspect '+dir);}
  const result=previous?candidate:fresh;
  ensure(fs.existsSync(result),'Generator did not produce output');
  const after=tree(result);
  const backup=c.project+'/.verification/previous-'+crypto.randomUUID();
  if(previous)fs.renameSync(c.generated,backup);
  try{fs.renameSync(result,c.generated);}catch(error){if(previous)fs.renameSync(backup,c.generated);throw error;}
  const report={status:'generated',input_sha256:generationInput(c),previous,after,backup:previous?backup:null,evidence:dir};
  json(dir+'/result.json',report);json(c.project+'/.verification/generation.json',{input_sha256:report.input_sha256,evidence:dir});
  return{status:'generated',evidence:dir,backup:report.backup};
}
function artifacts(dir){
  ensure(fs.existsSync(dir+'/simv'),'Missing compiled simv');
  const shared=fs.readdirSync(dir+'/simv.daidir').filter(f=>f.endsWith('.so')).sort();
  ensure(shared.length>0,'Missing VCS shared artifacts');
  return Object.fromEntries(['simv',...shared.map(f=>'simv.daidir/'+f)].map(f=>[f,hash(dir+'/'+f)]));
}
function compile(c){
  const current=read(c.project+'/.verification/generation.json');
  ensure(current.input_sha256===generationInput(c),'YAML or generator inputs changed; run generate first');
  ensure(c.o.env&&c.o.vcs,'compile requires explicit --env and --vcs tool paths');
  const build=c.project+'/build/'+identifier(c.o.build||'main');
  ensure(!fs.existsSync(build),'Build label already exists; choose a new --build label');
  const inputs=fingerprint(c),filelist=build+'/sources.f';
  const paths=[...(c.config.build.incdirs||[]).map(p=>'+incdir+'+c.expand(p)),...c.config.build.sources.map(c.expand),'-F '+c.expand(c.config.build.rtl_filelist)];
  ensure(paths.every(p=>!/[\r\n]/.test(p)&&!(/\s/.test(p)&&!p.startsWith('-F '))),'VCS filelist paths must not contain whitespace');
  ensure(!/\s/.test(c.expand(c.config.build.rtl_filelist)),'RTL filelist path must not contain whitespace');
  fs.mkdirSync(build,{recursive:true});fs.writeFileSync(filelist,paths.join('\n')+'\n');
  const args=[home+'/adapters/vcs-compile.sh',path.resolve(c.o.env),path.resolve(c.o.vcs),build,filelist,...c.config.build.tops.flatMap(t=>['-top',t]),...(c.config.build.args||[])];
  const r=execute('bash',args,build,c.project);
  ensure(!r.error&&r.status===0,'Compilation failed; inspect '+build);
  ensure(fs.existsSync(build+'/compile.log')&&!/^Error-/m.test(fs.readFileSync(build+'/compile.log','utf8')),'Compiler diagnostics contain errors');
  ensure(fingerprint(c).sha256===inputs.sha256,'Inputs changed while compiling; build not admitted');
  const report={status:'compiled',fingerprint:inputs.sha256,inputs:inputs.files,artifacts:artifacts(build),environment:path.resolve(c.o.env),compiler:path.resolve(c.o.vcs)};
  json(build+'/build.json',report);return{status:'compiled',build,fingerprint:inputs.sha256};
}
export function verdict(log,raw,verification){
  const reasons=[];
  if(raw!==0)reasons.push('abnormal_process_exit');
  const errors=log.match(/^UVM_ERROR\s*:\s*(\d+)/m),fatals=log.match(/^UVM_FATAL\s*:\s*(\d+)/m);
  if(!errors||!fatals)reasons.push('missing_uvm_summary');
  if(Number(errors?.[1])>0||/^UVM_ERROR\s+.+\[/m.test(log))reasons.push('uvm_error');
  if(Number(fatals?.[1])>0||/^UVM_FATAL\s+.+\[/m.test(log))reasons.push('uvm_fatal');
  if(!/\$finish at simulation time/.test(log))reasons.push('missing_simulation_finish');
  for(const rule of verification.checks||[]){
    const matches=[...log.matchAll(new RegExp(rule.pattern,'gm'))];
    if(matches.length<(rule.minimum_matches??1))reasons.push('required_check_missing');
    for(const m of matches){
      if((rule.positive_groups||[]).some(g=>!(Number(m[g])>0)))reasons.push('positive_check_failed');
      if((rule.zero_groups||[]).some(g=>Number(m[g])!==0))reasons.push('zero_check_failed');
      if((rule.equal_groups||[]).some(([a,b])=>!Number.isFinite(Number(m[a]))||Number(m[a])!==Number(m[b])))reasons.push('comparison_check_failed');
    }
  }
  const ok=reasons.length===0;
  return{status:ok?(verification.kind==='functional'?'passed':'skeleton_ok'):'failed',functional_pass:ok&&verification.kind==='functional',reasons};
}
function run(c,override={}){
  const o={...c.o,...override},selected=identifier(o.build||'main'),build=c.project+'/build/'+selected,info=read(build+'/build.json');
  ensure(info.fingerprint===fingerprint(c).sha256,'Build inputs changed; compile explicitly before running');
  ensure(JSON.stringify(artifacts(build))===JSON.stringify(info.artifacts),'Compiled artifact changed');
  ensure(typeof o.seed==='string'&&/^-?\d+$/.test(o.seed)&&BigInt(o.seed)>=-2147483648n&&BigInt(o.seed)<=2147483647n,'Provide one signed32 decimal --seed');
  ensure(!(c.config.run.args||[]).some(a=>/^\+ntb_random_seed/.test(a)),'Native seed belongs in --seed, not run.args');
  const dir=c.project+'/runs/'+identifier(o.name),before=artifacts(build);
  ensure(!fs.existsSync(dir),'Run directory already exists');
  const args=[home+'/adapters/vcs-run.sh',info.environment,dir,String(c.config.run.timeout_seconds||60),build+'/simv','+UVM_TESTNAME='+c.config.run.test,'+ntb_random_seed='+o.seed,'+UVM_VERBOSITY=UVM_HIGH',...(c.config.run.args||[])];
  const r=execute('bash',args,dir,c.project,process.env,90000);
  fs.writeFileSync(dir+'/raw-exit-code.txt',String(r.status)+'\n');
  json(dir+'/artifacts-before.json',before);json(dir+'/artifacts-after.json',artifacts(build));
  const log=fs.existsSync(dir+'/run.log')?fs.readFileSync(dir+'/run.log','utf8'):'';
  const result={...verdict(log,r.status,c.config.verification),seed:o.seed,build:selected,fingerprint:info.fingerprint,kind:c.config.verification.kind,raw_exit:r.status};
  if(JSON.stringify(before)!==JSON.stringify(artifacts(build))){result.status='failed';result.functional_pass=false;result.reasons.push('artifact_changed');}
  json(dir+'/result.json',result);return{...result,evidence:dir};
}
function regress(c){
  ensure(c.o.seeds,'regress requires comma-separated --seeds');identifier(c.o.name);
  const seeds=c.o.seeds.split(',');ensure(seeds.length>0&&new Set(seeds).size===seeds.length,'Use unique regression seeds');
  const report=c.project+'/runs/'+c.o.name+'-regression.json';ensure(!fs.existsSync(report),'Regression report already exists');
  const results=[];
  for(let i=0;i<seeds.length;i++)results.push(run(c,{name:c.o.name+'-'+i,seed:seeds[i]}));
  const result={status:results.every(r=>r.status!=='failed')?'completed':'failed',functional_pass:results.every(r=>r.functional_pass),results};
  json(report,result);return{...result,evidence:report};
}
function main(){
  const[action,...args]=process.argv.slice(2),o={};
  const allowed={init:['root','project','template','uvmf'],generate:['root','project','uv'],compile:['root','project','build','env','vcs'],run:['root','project','build','name','seed'],regress:['root','project','build','name','seeds']};
  ensure(allowed[action],'Usage: knob-project.mjs init|generate|compile|run|regress [named options]');
  for(let i=0;i<args.length;i++){
    const key=args[i].slice(2);ensure(args[i].startsWith('--')&&allowed[action].includes(key),'Unknown option: '+args[i]);
    ensure(!Object.hasOwn(o,key)&&args[i+1]&&!args[i+1].startsWith('--'),'Missing/duplicate option: '+key);o[key]=args[++i];
  }
  if(action==='init')return init(o);
  const c=context(o);fs.mkdirSync(c.project+'/.verification',{recursive:true});
  const guard=c.project+'/.verification/action.lock',fd=fs.openSync(guard,'wx');
  try{return {generate,compile,run,regress}[action](c);}finally{fs.closeSync(fd);fs.unlinkSync(guard);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=main();console.log(JSON.stringify(result,null,2));if(result.status==='failed')process.exitCode=1;}
  catch(error){console.error('KNOB_PROJECT: '+error.message);process.exitCode=1;}
}
