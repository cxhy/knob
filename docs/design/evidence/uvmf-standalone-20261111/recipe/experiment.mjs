// Isolated evaluation harness for the supplied UVMF 2023.4_2 ALU tutorial.
// No external Node dependencies. The official Python generator runs through uv.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const [action, outputArg, upstreamArg] = process.argv.slice(2);
assert(outputArg, 'Usage: node experiment.mjs prepare|fault|regenerate|verify OUTPUT [UPSTREAM]');
const output = path.resolve(outputArg);
assert(!/\s/.test(output), 'This evaluation filelist does not support whitespace in paths');
const upstream = path.join(output, 'upstream');
const alu = path.join(output, 'alu');
const tutorial = path.join(upstream, 'docs/generator_tutorials/alu');
const here = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = name => fs.readFileSync(name, 'utf8');
const writeJSON = (name, data) => fs.writeFileSync(name, JSON.stringify(data, null, 2) + '\n');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))
    .flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
function manifest(dir, filter = () => true) {
  return Object.fromEntries(files(dir).filter(filter).map(p => [path.relative(dir, p), hash(fs.readFileSync(p))]));
}
function generate(log, dest, merge) {
  const yaml = files(path.join(tutorial, 'yaml_config_files')).filter(p => p.endsWith('.yaml'));
  const args = ['run', '--no-project', '--offline', '--python', '3.12.13', 'python',
    path.join(upstream, 'scripts/yaml2uvmf.py'), ...yaml, '-d', dest];
  if (merge) args.push('-m', alu, '--overwrite');
  const env = { ...process.env, UV_CACHE_DIR: path.join(output, 'uv-cache'), PYTHONDONTWRITEBYTECODE: '1' };
  const result = spawnSync('uv', args, { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, 'logs', log + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
  writeJSON(path.join(output, 'logs', log + '-command.json'), { command: ['uv', ...args], env: {
    UV_CACHE_DIR: env.UV_CACHE_DIR, PYTHONDONTWRITEBYTECODE: env.PYTHONDONTWRITEBYTECODE }, raw_exit: result.status });
  if (result.error) throw result.error;
  return result;
}
function filelist() {
  const v = path.join(alu, 'verification_ip'), b = path.join(alu, 'project_benches/ALU');
  const dirs = [upstream + '/uvmf_base_pkg', v + '/interface_packages/ALU_in_pkg',
    v + '/interface_packages/ALU_out_pkg', v + '/environment_packages/ALU_env_pkg',
    b + '/tb/parameters', b + '/tb/sequences', b + '/tb/tests'];
  const sources = [upstream + '/uvmf_base_pkg/uvmf_base_pkg_hdl.sv', upstream + '/uvmf_base_pkg/uvmf_base_pkg.sv'];
  for (const n of ['ALU_in', 'ALU_out']) sources.push(`${v}/interface_packages/${n}_pkg/${n}_pkg_hdl.sv`);
  for (const n of ['ALU_in', 'ALU_out']) sources.push(`${v}/interface_packages/${n}_pkg/${n}_pkg.sv`,
    ...['if', 'monitor_bfm', 'driver_bfm'].map(s => `${v}/interface_packages/${n}_pkg/src/${n}_${s}.sv`));
  sources.push(v + '/environment_packages/ALU_env_pkg/ALU_env_pkg.sv', b + '/tb/parameters/ALU_parameters_pkg.sv',
    b + '/tb/sequences/ALU_sequences_pkg.sv', b + '/tb/tests/ALU_tests_pkg.sv', b + '/rtl/verilog/alu.v',
    b + '/tb/testbench/hdl_top.sv', b + '/tb/testbench/hvl_top.sv');
  for (const source of sources) assert(fs.existsSync(source), source);
  fs.writeFileSync(path.join(output, 'sources.f'), [...dirs.map(d => '+incdir+' + d), ...sources].join('\n') + '\n');
}

if (action === 'prepare') {
  assert(upstreamArg, 'UPSTREAM is required');
  const original = path.resolve(upstreamArg);
  assert(!fs.existsSync(output), 'Use a new output directory; existing evidence is never overwritten');
  assert(!output.startsWith(original + path.sep), 'Output must be outside the supplied package');
  assert.match(read(path.join(original, 'templates/python/uvmf_version.py')), /version\s*=\s*['"]2023\.4_2['"]/);
  fs.mkdirSync(path.join(output, 'logs'), { recursive: true });
  writeJSON(path.join(output, 'upstream-before.json'), { original, files: manifest(original) });
  fs.cpSync(original, upstream, { recursive: true });
  for (const name of ['experiment.mjs', 'compile.sh', 'run.sh']) fs.copyFileSync(path.join(here, name), path.join(output, name));
  assert.equal(generate('generate', path.join(output, 'generated')).status, 0, 'Fresh generation failed');
  fs.cpSync(path.join(tutorial, 'completed_solution/completed_uvmf_template_output'), alu, { recursive: true });
  const result = generate('merge-original-tutorial', path.join(output, 'merge-output'), true);
  assert.notEqual(result.status, 0, 'Expected the known old-tutorial missing-end-marker failure');
  assert.match(result.stdout + result.stderr, /Reached end of file while still in custom block/);
  // Repair only the experiment copy of the 2020.2 tutorial, not the vendor input.
  const monitor = path.join(alu, 'verification_ip/interface_packages/ALU_in_pkg/src/ALU_in_monitor_bfm.sv');
  const text = read(monitor);
  const marker = text.indexOf('// pragma uvmf custom do_monitor begin');
  assert(marker >= 0 && !text.includes('// pragma uvmf custom do_monitor end'));
  const end = text.indexOf('  endtask', marker);
  assert(end > marker);
  fs.writeFileSync(monitor, text.slice(0, end) + '    // pragma uvmf custom do_monitor end\n' + text.slice(end));
  assert.equal(generate('merge-repaired-tutorial', path.join(output, 'merge-output'), true).status, 0);
  filelist();
  writeJSON(path.join(output, 'alu-before.json'), manifest(alu));
  console.log('Prepared standalone ALU with current generator and tutorial business customizations:', output);
} else if (action === 'fault') {
  const dut = path.join(alu, 'project_benches/ALU/rtl/verilog/alu.v');
  const text = read(dut);
  assert.equal(text.split('assign result = result_o;').length, 2);
  const faulty = path.join(output, 'alu-fault.v');
  fs.writeFileSync(faulty, text.replace('assign result = result_o;', "assign result = result_o ^ 16'h0001;"));
  assert.equal(read(path.join(output, 'sources.f')).split(dut).length, 2);
  fs.writeFileSync(path.join(output, 'fault.f'), read(path.join(output, 'sources.f')).replace(dut, faulty));
  console.log('Created separate DUT fault: flip result bit 0 on every result');
} else if (action === 'regenerate') {
  const before = manifest(alu, p => /\.(sv|svh|v)$/.test(p));
  assert.equal(generate('regenerate', path.join(output, 'regenerated-output'), true).status, 0);
  const after = manifest(alu, p => /\.(sv|svh|v)$/.test(p));
  writeJSON(path.join(output, 'regeneration-check.json'), { before, after, equal: JSON.stringify(before) === JSON.stringify(after) });
  assert.deepEqual(after, before, 'Regeneration changed HDL/business files; inspect before compiling');
  console.log('Regeneration preserved every HDL/business file:', Object.keys(before).length);
} else if (action === 'verify') {
  const results = {};
  for (const name of ['baseline', 'replay', 'seed202', 'fault', 'regenerated']) {
    const dir = path.join(output, 'runs', name), log = read(path.join(dir, 'run.log'));
    const raw = Number(read(path.join(dir, 'raw-exit-code.txt')));
    assert.equal(raw, 0, name + ': abnormal simulator exit');
    assert.match(log, /\$finish at simulation time/);
    assert.equal(Number(log.match(/^UVM_FATAL\s*:\s*(\d+)/m)?.[1]), 0);
    const errors = Number(log.match(/^UVM_ERROR\s*:\s*(\d+)/m)?.[1]);
    const warnings = [...log.matchAll(/^UVM_WARNING .*?\[([^\]]+)\]/gm)].map(m => m[1]);
    assert.deepEqual(warnings.sort(), ['COVERAGE_MODEL_REVIEW', 'PREDICTOR_REVIEW']);
    const m = log.match(/SCOREBOARD_RESULTS:\s+PREDICTED_TRANSACTIONS=(\d+) MATCHES=(\d+) MISMATCHES=(\d+)/);
    assert(m, name + ': no scoreboard results');
    const [predicted, matches, mismatches] = m.slice(1).map(Number);
    assert(predicted > 0 && matches + mismatches === predicted);
    assert.equal([...log.matchAll(/\[SEQ\] Response:/g)].length, 25, 'Not all tutorial requests completed');
    const inputs = [...log.matchAll(/\[MON\] op:0x([0-9a-f]+) /g)].map(m => Number.parseInt(m[1], 16));
    assert.equal(inputs.filter(op => op >= 1 && op <= 4).length, predicted, 'Unaccounted arithmetic input');
    assert.equal([...log.matchAll(/\[MON\] result:/g)].length, predicted, 'Unaccounted output');
    if (name === 'fault') {
      assert.equal(matches, 0); assert.equal(mismatches, predicted); assert.equal(errors, predicted);
      assert.match(log, /^UVM_ERROR .*?\[SCBD\].*MISMATCH/gm);
    } else { assert.equal(errors, 0); assert.equal(mismatches, 0); assert.equal(matches, predicted); }
    const trace = log.split('\n').filter(l => /\[MON\]/.test(l)).map(l => l.slice(l.indexOf('@'))).join('\n');
    const artifactLines = read(path.join(dir, 'artifacts-before.sha256')).trim().split('\n');
    for (const line of artifactLines) {
      const [_, expected, filename] = line.match(/^([a-f0-9]{64})  (.+)$/);
      assert.equal(hash(fs.readFileSync(filename)), expected, 'Simulation artifact changed');
    }
    results[name] = { raw_exit: raw, errors, warnings, predicted, matches, mismatches, trace_sha256: hash(trace),
      simv_sha256: artifactLines[0].slice(0, 64) };
  }
  assert.equal(results.baseline.trace_sha256, results.replay.trace_sha256);
  assert.equal(results.baseline.trace_sha256, results.regenerated.trace_sha256);
  assert.notEqual(results.baseline.trace_sha256, results.seed202.trace_sha256);
  for (const name of ['replay', 'seed202']) assert.equal(results.baseline.simv_sha256, results[name].simv_sha256);
  const before = JSON.parse(read(path.join(output, 'upstream-before.json')));
  assert.deepEqual(manifest(before.original), before.files, 'Original UVMF package changed');
  assert.deepEqual(manifest(upstream), before.files, 'Working copy of UVMF library/generator changed');
  assert.equal(JSON.parse(read(path.join(output, 'regeneration-check.json'))).equal, true);
  for (const variant of ['out', 'fault', 'regenerated']) {
    const compile = read(path.join(output, variant, 'compile.log'));
    assert(!/^Error-/m.test(compile));
    assert(!/knob_pkg\.sv|libknob|knob\.cfg/.test(compile), 'Unexpected knob compilation dependency');
    const ids = [...compile.matchAll(/^Warning-\[([^\]]+)\]/gm)].map(m => m[1]);
    assert.deepEqual(ids, ['TFIPC', 'TFIPC']);
  }
  assert(!/knob_pkg|KNOB_ROOT|knob\.f/.test(read(path.join(output, 'sources.f'))));
  for (const name of Object.keys(results)) {
    assert(!fs.existsSync(path.join(output, 'runs', name, 'knob.cfg')));
  }
  writeJSON(path.join(output, 'results.json'), { evaluated_at: new Date().toISOString(),
    release: read(path.join(upstream, 'release.INFO')).trim(), results,
    original_package_unchanged: true, working_library_unchanged: true, regeneration_hdl_equal: true,
    compile_warning_ids: ['TFIPC', 'TFIPC'], no_knob_inputs: true });
  console.log(JSON.stringify(results, null, 2));
} else { throw new Error('Unknown action: ' + action); }
