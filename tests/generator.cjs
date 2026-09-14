const fs=require('fs'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8');
const source=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
new vm.Script(source);
let declarations=[];
for(const m of source.matchAll(/^(?:async )?function \w+\(/gm)){
 const tail=source.slice(m.index);
 for(const e of tail.matchAll(/^}/gm)){
  const candidate=tail.slice(0,e.index+1);
  try{new vm.Script('('+candidate+')');declarations.push(candidate);break;}catch{}
 }
}
const c=vm.createContext({console,TextEncoder,Uint8Array,Date,JSON,crypto:require('crypto').webcrypto});
vm.runInContext(declarations.join('\n'),c);
const host=(name,ip)=>({name,ip,vmid:'101',cpu:2,ram:4,osdisk:50,datadisk:50});
const data={customerName:'test',sshUser:'test',sshPass:'',clusterKey:'a'.repeat(32),wazuhApiPassword:'Quote"\\Dollar$`\'!# secret',vip:'10.0.0.100',vipCidr:'24',dnsServer:'10.0.0.1',gateway:'10.0.0.1',platform:'pve',opensearchPass:'Test-only2*',dashboardPassword:'Service-pass2*',needsVip:true,idx:[host('idx','10.0.0.10')],mgr:[host('master','10.0.0.20'),host('worker','10.0.0.21')],dash:[host('dash','10.0.0.30')],lb:[host('lb1','10.0.0.40'),host('lb2','10.0.0.41')],nids:[],allInOne:{enabled:false}};
const out=root+'/.test-output';fs.mkdirSync(out,{recursive:true});
const write=(p,v)=>{fs.mkdirSync(out+'/'+p.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(out+'/'+p,v)};
assert.equal(c.validate(data).length,0);
assert(c.validate({...data,wazuhApiPassword:''}).length>0);
assert(c.validate({...data,mgr:Object.assign([...data.mgr],{incomplete:true})}).length>0);
assert(c.validate({...data,mgr:[data.mgr[0],data.mgr[0]]}).length>0);
assert(c.validate({...data,clusterKey:'short'}).length>0);
assert(c.validate({...data,mgr:[host('master','999.0.0.1')]}).length>0);
assert(c.buildInventory({...data,mgr:data.mgr.slice(0,1),lb:[]}).includes('[manager_worker]\n\n'));
assert(c.buildInventory({...data,lb:[]}).includes('[lb]\n\n'));
for(const lb of [[],data.lb.slice(0,1),data.lb]){
 const d={...data,lb,needsVip:lb.length>1};
 const vars=c.buildGroupVars(d);
 assert(vars.includes('wazuh_api_address: "10.0.0.20"'));
 const expected=lb.length>1?data.vip:lb.length?lb[0].ip:data.mgr[0].ip;
 assert(vars.includes('agent_connect_address: "'+expected+'"'));

}
write('group_vars/all.yml',c.buildGroupVars(data));
write('verify.yml',c.buildVerifyPlaybook());
write('roles/manager/tasks/main.yml',c.buildManagerRole());
write('roles/dashboard/tasks/main.yml',c.buildDashboardRole());
for(const [p,v] of Object.entries(c.buildTemplates()))write(p,v);
write('merge-cluster.py',c.buildClusterMergeScript());
write('00-set-static-ip.sh',c.buildPveStage0Script({...data,idx:[host('idx','10.0.0.10')],mgr:[],dash:[],lb:[]}));
for(const [role,fn] of Object.entries({certs_bootstrap:'buildCertsBootstrapRole',indexer:'buildIndexerRole',indexer_security_init:'buildIndexerSecurityInitRole',loadbalancer:'buildLbRole',nids:'buildNidsRole'}))write('roles/'+role+'/tasks/main.yml',c[fn]());
assert(c.buildPveStage0Script(data).includes('exit 1'));
assert(!html.includes('kpartx'));
assert(!html.includes('frontend syslog_frontend'));
assert(c.buildCertsBootstrapRole().includes('wazuh-certificates/*.pem'));
assert(c.buildIndexerSecurityInitRole().includes('wazuh-passwords-tool.sh'));
assert(c.buildDashboardRole().includes('owner: wazuh-dashboard'));
assert(!c.buildManagerRole().includes('/var/lib/filebeat/registry'));
assert(!c.buildManagerRole().includes('<interval>'));
assert(c.buildManagerRole().includes('notify: restart wazuh-manager'));
assert(c.buildVerifyPlaybook().includes('/security/user/authenticate?raw=true'));
assert(c.buildVerifyPlaybook().includes('/cluster/nodes?limit=1000'));
console.log('PASS: generator syntax, 0/1/2 LB routing, credential escaping, validation, PVE API/enrollment routes, restart and verification generation');
