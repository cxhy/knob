#!/usr/bin/env node
// Local shared-source releases. This command never downloads dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const LOCK = 'verification-deps.lock.json';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const serial = value => JSON.stringify(value, null, 2) + '\n';
function requireThat(test, message) { if (!test) throw Error(message); }
function version(value) {
  requireThat(typeof value === 'string' && /^[0-9][A-Za-z0-9_.-]*$/.test(value), 'Invalid explicit version');
  return value;
}
function inventory(dir, prefix = '') {
  const entries = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name, file = path.join(dir, entry.name);
    requireThat(!entry.isSymbolicLink(), 'Symlinks are not accepted in releases: ' + relative);
    if (entry.isDirectory()) Object.assign(entries, inventory(file, relative + '/'));
    else {
      requireThat(entry.isFile(), 'Unsupported release entry: ' + relative);
      entries[relative] = sha(fs.readFileSync(file));
    }
  }
  return entries;
}
function equal(a,b) { return serial(a) === serial(b); }
function release(root, component, selected) {
  requireThat(['uvmf','framework','knob'].includes(component), 'Unknown component');
  return path.join(root, component, version(selected));
}
function verify(root, component, selected) {
  const directory = release(root, component, selected), file = path.join(directory, 'release.json');
  requireThat(fs.existsSync(file), `Missing prepared release: ${component}/${selected}`);
  requireThat(!fs.lstatSync(directory).isSymbolicLink(), 'Release directory must not be a symlink');
  const manifest = read(file);
  requireThat(manifest.schema === 1 && manifest.component === component && manifest.version === selected, 'Release identity mismatch');
  requireThat(equal(inventory(path.join(directory,'payload')), manifest.files), 'Release content mismatch: ' + directory);
  requireThat(sha(serial(manifest.files)) === manifest.content_sha256, 'Invalid content identifier');
  return { component, version: selected, manifest_sha256: sha(fs.readFileSync(file)), content_sha256: manifest.content_sha256 };
}
function layout(component, source, selected) {
  if (component === 'uvmf') {
    const text = fs.readFileSync(path.join(source,'templates/python/uvmf_version.py'),'utf8');
    requireThat(text.match(/version\s*=\s*['"]([^'"]+)/)?.[1] === selected, 'UVMF source version mismatch');
    for (const file of ['scripts/yaml2uvmf.py','uvmf_base_pkg/uvmf_base_pkg.sv','templates/python/legal/Jinja2/LICENSE'])
      requireThat(fs.existsSync(path.join(source,file)), 'Incomplete UVMF source: ' + file);
    return null; // Preserve the supplied upstream tree, including its legal material.
  }
  if (component === 'framework') {
    const meta = read(path.join(source,'release.json'));
    requireThat(meta.component === component && meta.version === selected, 'Framework source version mismatch');
    requireThat(fs.existsSync(path.join(source,'bin/knob-deps.mjs')), 'Missing framework entry');
    return null;
  }
  const files = ['src/knob_pkg.sv','knob.f','LICENSE'];
  for (const file of files) requireThat(fs.existsSync(path.join(source,file)), 'Incomplete knob source: ' + file);
  return files;
}
function publish(options) {
  const {root,component,source} = options, selected = version(options.version);
  requireThat(root && source, 'publish requires --root and --source');
  const directory = release(root,component,selected), payload = path.join(directory,'payload');
  const sourcePath = fs.realpathSync(source), targetPath = path.resolve(directory);
  // Inspect before copying: reject links/special files and avoid partial publication.
  const chosen = layout(component,sourcePath,selected);
  requireThat(targetPath !== sourcePath && (chosen || !targetPath.startsWith(sourcePath + path.sep)), 'Release cannot be inside its source');
  if (!chosen) inventory(sourcePath);
  else for (const file of chosen) requireThat(fs.lstatSync(path.join(sourcePath,file)).isFile(), 'Expected ordinary source file: ' + file);
  fs.mkdirSync(path.dirname(directory),{recursive:true});
  const guard = path.join(path.dirname(directory),'.'+selected+'.publish.lock');
  const fd = fs.openSync(guard,'wx');
  let staging;
  try {
    staging = fs.mkdtempSync(path.join(path.dirname(directory),'.prepare-'));
    fs.mkdirSync(path.join(staging,'payload'));
    if (chosen) for (const file of chosen) {
      const destination = path.join(staging,'payload',file);
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.copyFileSync(path.join(sourcePath,file),destination);
    } else fs.cpSync(sourcePath,path.join(staging,'payload'),{recursive:true});
    const files = inventory(path.join(staging,'payload'));
    const manifest = { schema:1,component,version:selected,content_sha256:sha(serial(files)),files };
    fs.writeFileSync(path.join(staging,'release.json'),serial(manifest));
    if (fs.existsSync(directory)) {
      const existing = verify(root,component,selected);
      requireThat(existing.content_sha256 === manifest.content_sha256, 'Published version already exists with different content; choose a new version');
      return {...existing,status:'already-present'};
    }
    // The per-version guard serializes this tool's writers; never replace a release.
    fs.renameSync(staging,directory);
    staging = undefined;
    return {...verify(root,component,selected),status:'published',path:directory};
  } finally {
    if (staging) fs.rmSync(staging,{recursive:true,force:true});
    fs.closeSync(fd); fs.unlinkSync(guard);
  }
}
function pin(options) {
  requireThat(options.root && options.project && options.uvmf && options.framework, 'pin requires --root --project --uvmf --framework');
  const components = {};
  for (const name of ['uvmf','framework','knob']) if(options[name]) components[name] = verify(options.root,name,options[name]);
  const lock = {schema:1,components};
  fs.mkdirSync(options.project,{recursive:true});
  const file = path.join(options.project,LOCK);
  if (fs.existsSync(file)) {
    if(equal(read(file),lock)) return {status:'unchanged',lock:file};
    requireThat(options.replace === true, 'Project is already pinned; use --replace to explicitly upgrade or roll back');
  }
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try { fs.writeFileSync(temporary,serial(lock),{flag:'wx'}); fs.renameSync(temporary,file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return {status:'pinned',lock:file,components};
}
function check(options) {
  requireThat(options.root && options.project, 'check requires --root --project');
  const lock = read(path.join(options.project,LOCK));
  requireThat(lock.schema === 1 && lock.components?.uvmf && lock.components?.framework, 'Invalid project lock');
  for(const [name,entry] of Object.entries(lock.components)) {
    requireThat(equal(verify(options.root,name,entry.version),entry), 'Pinned release identity changed: '+name);
  }
  const framework = path.join(release(options.root,'framework',lock.components.framework.version),'payload');
  const runtime = read(path.join(framework,'release.json'));
  requireThat(Number(process.versions.node.split('.')[0]) >= runtime.node_minimum_major, 'Node runtime is too old');
  const uvmf = path.join(release(options.root,'uvmf',lock.components.uvmf.version),'payload');
  const cache = options.cache || path.join(options.project,'.verification-cache','uv');
  fs.mkdirSync(cache,{recursive:true});
  const env = {...process.env,UV_CACHE_DIR:path.resolve(cache),UV_PYTHON_DOWNLOADS:'never',PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1'};
  delete env.VIRTUAL_ENV; delete env.PYTHONHOME; delete env.PYTHONPATH;
  const script = `import sys,json,platform\nfrom pathlib import Path\np=Path(sys.argv[1])\nsys.path[:0]=[str(p/'templates/python/python3'),str(p/'templates/python')]\nimport jinja2,markupsafe,yaml,voluptuous\nmods=[jinja2,markupsafe,yaml,voluptuous]\nassert platform.python_version()==sys.argv[2], 'Python version mismatch'\nassert all(Path(m.__file__).resolve().is_relative_to(p.resolve()) for m in mods), 'Dependencies loaded outside UVMF'\nprint(json.dumps({'python':platform.python_version(),'packages':{m.__name__:{'version':getattr(m,'__version__',None),'file':m.__file__} for m in mods}}))`;
  const command = options.uv || 'uv';
  const args = ['run','--no-project','--offline','--python',runtime.python,'python','-c',script,uvmf,runtime.python];
  const result = spawnSync(command,args,{env,encoding:'utf8',timeout:30000});
  requireThat(!result.error && result.status === 0, 'Offline Python readiness failed: '+(result.error?.message || result.stderr));
  return {status:'ready',components:lock.components,runtime:JSON.parse(result.stdout),node:process.versions.node,uv:command};
}
function main() {
  const [action,...args] = process.argv.slice(2), options = {};
  for(let i=0;i<args.length;i++) {
    requireThat(args[i].startsWith('--'), 'Expected named option');
    const name = args[i].slice(2);
    requireThat(!Object.hasOwn(options,name), 'Duplicate option: '+name);
    if(name==='replace') options[name]=true;
    else {requireThat(args[i+1] && !args[i+1].startsWith('--'),'Missing option value: '+name);options[name]=args[++i];}
  }
  const allowed = {publish:['root','component','source','version'],pin:['root','project','uvmf','framework','knob','replace'],check:['root','project','cache','uv']};
  requireThat(allowed[action], 'Usage: node knob-deps.mjs publish|pin|check [named options]');
  for(const name of Object.keys(options)) requireThat(allowed[action].includes(name),'Unknown option: '+name);
  for(const name of ['root','source','project','cache']) if(options[name]) options[name]=path.resolve(options[name]);
  return {publish,pin,check}[action](options);
}
try { console.log(serial(main()).trimEnd()); }
catch(error) { console.error('KNOB_DEPS: '+error.message); process.exitCode=1; }
