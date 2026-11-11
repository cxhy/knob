const {spawn}=require('node:child_process');
const fs=require('node:fs');
const p=spawn('/home/guodz/.local/bin/hdl-kgraph',['serve','--mcp'],{cwd:'/tmp/knob-hdl-mcp-smoke'});
let buf='',err='',seq=0;const pending=new Map();const report={};
p.stderr.on('data',x=>err+=x);
p.stdout.on('data',x=>{buf+=x;let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i);buf=buf.slice(i+1);try{const m=JSON.parse(line);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}}catch{}}});
function req(method,params){return new Promise(resolve=>{const id=++seq;pending.set(id,resolve);p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
const timer=setTimeout(()=>{console.error(err);p.kill();process.exit(1);},20000);
(async()=>{report.initialize=await req('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'knob-integration-check',version:'1'}});if(report.initialize.error)throw Error(JSON.stringify(report.initialize));p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');report.tools=await req('tools/list',{});for(const [name,args] of [['find_module',{name:'probe_*'}],['get_hierarchy',{top:'probe_top'}],['port_map',{module:'probe_leaf',instance:'u_leaf'}]]){report[name]=await req('tools/call',{name,arguments:args});if(report[name].error||report[name].result?.isError)throw Error(JSON.stringify(report[name]));}fs.writeFileSync('/tmp/knob-hdl-mcp-smoke/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));clearTimeout(timer);p.stdin.end();p.kill();})().catch(e=>{console.error(e,err);clearTimeout(timer);p.kill();process.exitCode=1;});
