// End-to-end checkout/deployment verification using real local Git and tar.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync}from'node:child_process';
import{pathToFileURL}from'node:url';
const[archiveArg,outArg]=process.argv.slice(2);assert(archiveArg&&outArg,'Usage: deployment-portability.mjs UVMF_ARCHIVE NEW_OUTPUT');
const repo=process.cwd(),archive=path.resolve(archiveArg),out=path.resolve(outArg);assert(!fs.existsSync(out),'Use a new output');fs.mkdirSync(out,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const json=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const gitEnv={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'};for(const n of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE'])delete gitEnv[n];
function exec(label,command,args,{cwd=out,env=gitEnv,expected=0}={}){
  const r=spawnSync(command,args,{cwd,env,encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});
  fs.writeFileSync(out+'/'+label+'.log',(r.stdout??'')+(r.stderr??''));json(out+'/'+label+'-command.json',{command,args,cwd,raw_exit:r.status,environment_profile:env===gitEnv?'git-isolated':'bootstrap-tools-only'});
  assert.equal(r.status,expected,label+': '+r.stderr);return r.stdout;
}
const pins=JSON.parse(fs.readFileSync(repo+'/deployment/inputs.json'));
assert.equal(sha(archive),pins.uvmf.archive_sha256);
const candidate=out+'/candidate',clone=out+'/clean checkout',inputs=out+'/inputs',tools=out+'/tools';
fs.mkdirSync(candidate);fs.mkdirSync(inputs);fs.mkdirSync(tools);
for(const relative of pins.checkout_paths){const target=candidate+'/'+relative;fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(repo+'/'+relative,target,{recursive:true});}
json(out+'/candidate-source-hashes.json',Object.fromEntries(files(candidate).map(f=>[path.relative(candidate,f),sha(f)])));
exec('git-init','git',['init','-b','master',candidate]);exec('git-add','git',['-C',candidate,'add','.']);
exec('git-commit','git',['-C',candidate,'-c','user.name=Deployment fixture','-c','user.email=fixture@invalid.local','commit','-m','Candidate deployment fixture']);
exec('git-clone','git',['clone','--depth','1','--no-local',pathToFileURL(candidate).href,clone]);
assert.equal(exec('git-shallow','git',['-C',clone,'rev-parse','--is-shallow-repository']).trim(),'true');
assert.equal(exec('git-tags','git',['-C',clone,'tag','--list']).trim(),'');
assert(!fs.existsSync(clone+'/build')&&!fs.existsSync(clone+'/runs'));
// Deployment gets only the explicitly required tools, with no Git/uv/VCS on PATH.
for(const[name,target]of [['bash','/bin/bash'],['node',process.execPath],['tar','/usr/bin/tar'],['gzip','/usr/bin/gzip']])fs.symlinkSync(target,tools+'/'+name);
const environment={PATH:tools,LANG:'C',LC_ALL:'C'};
const input=inputs+'/UVMF_2023.4_2.tar.gz';fs.copyFileSync(archive,input);
const bootstrap=clone+'/scripts/prepare-shared-deps.sh',target=out+'/selected-shared';
function deploy(label,destination,source,expected=0,env=environment){return exec(label,'/bin/bash',[bootstrap,destination,source],{env,expected});}
const deployed=JSON.parse(deploy('archive-deploy',target,input));assert.equal(deployed.git_required,false);assert.equal(deployed.downloaded,false);assert.equal(deployed.input_kind,'archive');
const initial=Object.fromEntries(deployed.releases.map(r=>[r.component,sha(target+'/'+r.component+'/'+r.version+'/release.json')]));
const repeated=JSON.parse(deploy('repeat-deploy',target,input));assert(repeated.releases.every(r=>r.status==='already-present'));
for(const r of repeated.releases)assert.equal(sha(target+'/'+r.component+'/'+r.version+'/release.json'),initial[r.component]);
const directory=target+'/uvmf/2023.4_2/payload',other=out+'/other locale shared';
const asDirectory=JSON.parse(deploy('directory-other-locale',other,directory,0,{...environment,LANG:'sv_SE.UTF-8',LC_ALL:'sv_SE.UTF-8'}));
assert.equal(asDirectory.input_kind,'directory');for(const r of asDirectory.releases)assert.equal(sha(other+'/'+r.component+'/'+r.version+'/release.json'),initial[r.component]);
const gitMetadata=out+'/saved-git';fs.renameSync(clone+'/.git',gitMetadata);
deploy('no-git-metadata',out+'/source-export-shared',directory);
fs.renameSync(gitMetadata,clone+'/.git');
deploy('missing-input',out+'/missing-target',inputs+'/missing.tar.gz',1);assert(!fs.existsSync(out+'/missing-target'));
const bad=inputs+'/bad.tar.gz';fs.copyFileSync(input,bad);fs.appendFileSync(bad,'wrong');
deploy('bad-archive',out+'/bad-archive-target',bad,1);assert(!fs.existsSync(out+'/bad-archive-target'));
fs.mkdirSync(inputs+'/incomplete');fs.writeFileSync(inputs+'/incomplete/partial','x');
deploy('bad-directory',out+'/bad-directory-target',inputs+'/incomplete',1);assert(!fs.existsSync(out+'/bad-directory-target'));
const knobFile=clone+'/src/knob_pkg.sv',knob=fs.readFileSync(knobFile);fs.appendFileSync(knobFile,'\n// modified');
deploy('bad-knob',out+'/bad-knob-target',input,1);assert(!fs.existsSync(out+'/bad-knob-target'));fs.writeFileSync(knobFile,knob);
const entry=clone+'/framework/bin/knob-project.mjs',saved=out+'/saved-entry';fs.renameSync(entry,saved);
deploy('incomplete-framework',out+'/incomplete-framework-target',input,1);assert(!fs.existsSync(out+'/incomplete-framework-target'));fs.renameSync(saved,entry);
const {publish,inventory}=await import(pathToFileURL(clone+'/framework/bin/knob-deps.mjs'));
const conflictSource=out+'/conflict-source',conflict=out+'/conflict-target';fs.cpSync(clone+'/framework',conflictSource,{recursive:true});fs.appendFileSync(conflictSource+'/README.md','\nDifferent fixture content\n');
const meta=JSON.parse(fs.readFileSync(conflictSource+'/release.json'));
publish({root:conflict,component:'framework',version:meta.version,source:conflictSource});const before=inventory(conflict);
deploy('existing-version-conflict',conflict,input,1);assert.deepEqual(inventory(conflict),before);assert(!fs.existsSync(conflict+'/uvmf'));
// Older releases may serialize the same file map in another order. Preserve them.
const legacy=out+'/legacy-order-target';fs.cpSync(target,legacy,{recursive:true});
const legacyFile=legacy+'/uvmf/2023.4_2/release.json',legacyManifest=JSON.parse(fs.readFileSync(legacyFile));
legacyManifest.files=Object.fromEntries(Object.entries(legacyManifest.files).reverse());
legacyManifest.content_sha256=crypto.createHash('sha256').update(JSON.stringify(legacyManifest.files,null,2)+'\n').digest('hex');
json(legacyFile,legacyManifest);const legacyHash=sha(legacyFile);
const legacyResult=JSON.parse(deploy('legacy-manifest-order',legacy,input));assert(legacyResult.releases.every(r=>r.status==='already-present'));assert.equal(sha(legacyFile),legacyHash);
const relativeResult=JSON.parse(exec('from-script-directory','/bin/bash',['prepare-shared-deps.sh',target,directory],{cwd:clone+'/scripts',env:environment}));assert(relativeResult.releases.every(r=>r.status==='already-present'));
assert.equal(exec('git-clean','git',['-C',clone,'status','--porcelain']).trim(),'');
const report={checked_at:new Date().toISOString(),candidate_clone:true,product_repository_committed:false,clone,shared_root:target,source_archive:input,shallow:true,tags:[],bootstrap_without_git_uv_python_vcs:true,deployment_cases:12,all_expected_results:true,releases:deployed.releases,source_hashes:JSON.parse(fs.readFileSync(out+'/candidate-source-hashes.json'))};
json(out+'/results.json',report);console.log(JSON.stringify({clone,target,cases:12,status:'passed',results:out+'/results.json'},null,2));
