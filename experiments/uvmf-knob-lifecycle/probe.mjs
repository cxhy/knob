import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [action, outputArg] = process.argv.slice(2);
assert(outputArg, 'Usage: probe.mjs prepare|verify OUTPUT');
const root = process.cwd(), output = path.resolve(outputArg);
const source = path.join(root, 'build/uvmf-standalone/repro2');
const read = p => fs.readFileSync(p, 'utf8');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const json = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
function files(p) { return fs.readdirSync(p, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(path.join(p,e.name)):[path.join(p,e.name)]); }
function manifest(p) { return Object.fromEntries(files(p).map(f=>[path.relative(p,f),hash(f)])); }
function edit(relative, marker, replacement) {
  const p = path.join(output,'alu',relative), text = read(p);
  assert.equal(text.split(marker).length, 2, relative + ': marker must be unique');
  fs.writeFileSync(p, text.replace(marker,replacement));
}
if (action === 'prepare') {
  assert(!fs.existsSync(output), 'Refusing existing output');
  fs.mkdirSync(output,{recursive:true});
  json(path.join(output,'inputs.json'),{baseline:source, baseline_alu:manifest(path.join(source,'alu')), upstream:manifest(path.join(source,'upstream')), knob:hash(path.join(root,'src/knob_pkg.sv'))});
  fs.cpSync(path.join(source,'alu'),path.join(output,'alu'),{recursive:true});
  fs.copyFileSync('experiments/uvmf-knob-lifecycle/probe_pkg.sv',path.join(output,'probe_pkg.sv'));
  const input='verification_ip/interface_packages/ALU_in_pkg/src/ALU_in_configuration.svh';
  const marker='// pragma uvmf custom class_item_additional begin';
  edit(input,marker,marker+`
  rand int packet_count;
  rand bit [31:0] probe_word;
  int minimum, maximum;
  bit enabled;
  int pre_calls;
  constraint knob_count {
    if (enabled) packet_count inside {[minimum:maximum]};
    else packet_count == 0;
  }
  function void pre_randomize();
    minimum = int'(lifecycle_probe_pkg::cfg.get_int("minimum"));
    maximum = int'(lifecycle_probe_pkg::cfg.get_int("maximum"));
    enabled = lifecycle_probe_pkg::cfg.get_bool("enabled");
    pre_calls++;
    $display("LC_PRE call=%0d min=%0d max=%0d enabled=%0d", pre_calls, minimum, maximum, enabled);
  endfunction
  function void check_config(string stage);
    if ((enabled && (packet_count < minimum || packet_count > maximum)) ||
        (!enabled && packet_count != 0))
      knob_pkg::knob_fail("LC_OVERWRITE", "configuration value changed outside frozen bounds");
    $display("LC_CONFIG stage=%s count=%0d word=%08h calls=%0d",stage,packet_count,probe_word,pre_calls);
  endfunction
`);
  edit(input,'super.post_randomize();','super.post_randomize();\n    check_config("post_randomize");');
  edit(input,'// pragma uvmf custom initialize end','check_config("initialized");\n    // pragma uvmf custom initialize end');
  const test='project_benches/ALU/tb/tests/src/test_top.svh';
  edit(test,'// pragma uvmf custom build_phase_pre_super begin','// pragma uvmf custom build_phase_pre_super begin\n    lifecycle_probe_pkg::prepare();');
  const seq='project_benches/ALU/tb/sequences/src/ALU_bench_sequence_base.svh';
  edit(seq,'repeat (25) ALU_in_agent_random_seq.start(ALU_in_agent_sequencer);',`begin
        ALU_in_agent_config.check_config("behavior");
        $display("LC_REQUESTS count=%0d",ALU_in_agent_config.packet_count);
        repeat (ALU_in_agent_config.packet_count) ALU_in_agent_random_seq.start(ALU_in_agent_sequencer);
      end`);
  let list=read(path.join(source,'sources.f')).replaceAll(path.join(source,'alu'),path.join(output,'alu'));
  list=path.join(root,'src/knob_pkg.sv')+'\n'+path.join(output,'probe_pkg.sv')+'\n'+list;
  fs.writeFileSync(path.join(output,'sources.f'),list);
  json(path.join(output,'modified-inputs.json'),manifest(path.join(output,'alu')));
  console.log('Prepared isolated probe:',output);
} else if (action === 'verify') {
  const inputs=JSON.parse(read(path.join(output,'inputs.json'))), results={};
  const positive=['a','replay','b','seed202','disabled'];
  for (const name of [...positive,'unknown','missing_seed','duplicate_seed']) {
    const dir=path.join(output,'runs',name),log=read(path.join(dir,'run.log'));
    assert.equal(Number(read(path.join(dir,'raw-exit-code.txt'))),0,name+': abnormal raw exit');
    for(const line of read(path.join(dir,'artifacts-before.sha256')).trim().split('\n')) {
      const [,h,p]=line.match(/^(\w+)  (.+)$/); assert.equal(hash(p),h);
    }
    if(positive.includes(name)) {
      assert.match(log,new RegExp('KNOB_SEED value='+(name==='seed202'?202:101)+'\\b'));
      assert.match(log,/LC_READY/);
      assert.equal(Number(log.match(/^UVM_FATAL\s*:\s*(\d+)/m)?.[1]),0);
      const errors=Number(log.match(/^UVM_ERROR\s*:\s*(\d+)/m)?.[1]);
      // Exploratory disabled-traffic run is NOT a functional pass: preserve
      // the real host scoreboard's mandatory-activity failure.
      assert.equal(errors,name==='disabled'?1:0);
      if(name==='disabled') assert.match(log,/^UVM_ERROR .*\[SCBD\] No Transactions Scoreboarded/m);
      const settings=[...log.matchAll(/LC_CONFIG stage=(\w+) count=(\d+) word=([0-9a-f]+) calls=(\d+)/g)];
      assert(settings.length>=4, name+': missing repeated solve/initialize/behavior checks');
      assert(Number(settings.at(-1)[4])>=2,'child not randomized repeatedly');
      for(const s of settings) {
        const count=Number(s[2]);
        if(name==='disabled') assert.equal(count,0);
        else if(name==='b') assert(count>=11&&count<=15);
        else assert(count>=4&&count<=8);
      }
      assert(log.indexOf('LC_READY')<log.indexOf('LC_PRE'));
      const count=Number(log.match(/LC_REQUESTS count=(\d+)/)?.[1]);
      assert.equal([...log.matchAll(/\[SEQ\] Response:/g)].length,count);
      const board=log.match(/SCOREBOARD_RESULTS:\s+PREDICTED_TRANSACTIONS=(\d+) MATCHES=(\d+) MISMATCHES=(\d+)/);
      assert(board); assert.equal(Number(board[3]),0); assert.equal(board[1],board[2]);
      const arithmetic=[...log.matchAll(/\[MON\] op:0x([0-9a-f]+) /g)].map(m=>parseInt(m[1],16)).filter(op=>op>=1&&op<=4).length;
      assert.equal(arithmetic,Number(board[1]));
      assert.equal([...log.matchAll(/\[MON\] result:/g)].length,Number(board[1]));
      if(name!=='disabled') assert(Number(board[1])>0);
      const trace=log.split('\n').filter(l=>/LC_CONFIG|\[MON\]/.test(l)).map(l=>l.includes('LC_CONFIG')?l:l.slice(l.indexOf('@'))).join('\n');
      results[name]={count,matches:Number(board[2]),uvm_errors:errors,functional_pass:errors===0,trace_sha256:crypto.createHash('sha256').update(trace).digest('hex'),configurations:settings.map(s=>s[0])};
    } else {
      const id=name==='unknown'?'KNOB_UNKNOWN':'KNOB_SEED';
      assert.match(log,new RegExp('^UVM_FATAL .*\\['+id+'\\]','m'));
      assert(!/LC_PRE|LC_REQUESTS|\[SEQ\] Response:|\[MON\]/.test(log));
      results[name]={expected_fatal:id,raw_exit:0};
    }
  }
  assert.equal(results.a.trace_sha256,results.replay.trace_sha256);
  assert.notEqual(results.a.trace_sha256,results.seed202.trace_sha256);
  assert.deepEqual(manifest(path.join(inputs.baseline,'alu')),inputs.baseline_alu);
  assert.deepEqual(manifest(path.join(inputs.baseline,'upstream')),inputs.upstream);
  assert.equal(hash(path.join(root,'src/knob_pkg.sv')),inputs.knob);
  const compile=read(path.join(output,'out/compile.log'));
  assert(!/^Error-/m.test(compile));
  assert.deepEqual([...compile.matchAll(/^Warning-\[([^\]]+)\]/gm)].map(m=>m[1]),['TFIPC','TFIPC']);
  json(path.join(output,'results.json'),{checked_at:new Date().toISOString(),results,original_inputs_unchanged:true,compile_warnings:[...compile.matchAll(/^Warning-\[([^\]]+)\]/gm)].map(m=>m[1])});
  console.log(JSON.stringify(results,null,2));
} else throw Error('Unknown action');
