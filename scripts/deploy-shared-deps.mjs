// Bootstrap from a checkout. No Git metadata, existing shared tree or download is required.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {publish,verify,inventory} from '../framework/bin/knob-deps.mjs';
const repo=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const content=files=>crypto.createHash('sha256').update(JSON.stringify(files,null,2)+'\n').digest('hex');
function ensure(test,message){if(!test)throw Error(message);}
function command(args){
  const env={...process.env};delete env.TAR_OPTIONS;
  const r=spawnSync('tar',args,{encoding:'utf8',env,maxBuffer:16*1024*1024});
  ensure(!r.error&&r.status===0,'tar failed: '+(r.error?.message||r.stderr));return r.stdout;
}
function main(){
  const[targetArg,inputArg,...extra]=process.argv.slice(2);
  ensure(targetArg&&inputArg&&extra.length===0,'Usage: bash scripts/prepare-shared-deps.sh SHARED_ROOT UVMF_DIRECTORY_OR_TAR_GZ');
  ensure(Number(process.versions.node.split('.')[0])>=20,'Deployment requires Node.js >=20');
  const target=path.resolve(targetArg),input=path.resolve(inputArg),pins=read(repo+'/deployment/inputs.json'),meta=read(repo+'/framework/release.json');
  ensure(pins.schema===1&&pins.uvmf?.version&&pins.knob?.files,'Invalid deployment input records');
  ensure(target!==repo&&!['framework','src','deployment','scripts'].some(p=>target===repo+'/'+p||target.startsWith(repo+'/'+p+'/')),'Deployment target overlaps checkout source');
  ensure(fs.existsSync(input),'UVMF input is required; supply the authorized package explicitly: '+input);
  for(const[file,expected]of Object.entries(pins.knob.files))ensure(hash(repo+'/'+file)===expected,'knob '+pins.knob.version+' source mismatch: '+file);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'knob-deploy-'));
  try{
    let uvmf=input,inputKind='directory';
    if(fs.statSync(input).isFile()){
      ensure(hash(input)===pins.uvmf.archive_sha256,'UVMF archive SHA-256 mismatch');
      const names=command(['-tzf',input]).trim().split('\n');
      ensure(names.every(p=>!path.posix.isAbsolute(p)&&!p.split('/').includes('..')),'Unsafe UVMF archive paths');
      const extracted=scratch+'/unpacked';fs.mkdirSync(extracted);
      command(['-xzf',input,'--no-same-owner','--no-same-permissions','-C',extracted]);
      uvmf=path.join(extracted,pins.uvmf.archive_directory);inputKind='archive';
    }else ensure(fs.statSync(input).isDirectory(),'UVMF input must be a directory or the pinned archive');
    const files=inventory(uvmf);
    ensure(Object.keys(files).length===pins.uvmf.file_count&&content(files)===pins.uvmf.tree_sha256,'UVMF directory content does not match the pinned package');
    const stage=scratch+'/prepared',selections=[['uvmf',pins.uvmf.version,uvmf],['framework',meta.version,repo+'/framework'],['knob',pins.knob.version,repo]];
    const prepared=selections.map(([component,version,source])=>publish({root:stage,component,version,source}));
    // Preflight target conflicts as a set. Publication remains per-version atomic.
    for(const entry of prepared){
      const dir=path.join(target,entry.component,entry.version);
      if(fs.existsSync(dir)){
        verify(target,entry.component,entry.version);
        ensure(content(inventory(dir+'/payload'))===entry.content_sha256,'Existing target version has different content: '+dir);
      }
    }
    const releases=prepared.map(entry=>publish({root:target,component:entry.component,version:entry.version,source:path.join(stage,entry.component,entry.version,'payload')}));
    return{status:'deployed',root:target,input_kind:inputKind,node:process.versions.node,git_required:false,downloaded:false,releases};
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
try{console.log(JSON.stringify(main(),null,2));}
catch(error){console.error('KNOB_DEPLOY: '+error.message);process.exitCode=1;}
