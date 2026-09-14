import sys,json
import yaml,jinja2
from pathlib import Path
base=Path(__file__).resolve().parent.parent / '.test-output'
for p in base.rglob('*.yml'):
    yaml.safe_load(p.read_text(encoding='utf8'))
v=yaml.safe_load((base/'group_vars/all.yml').read_text(encoding='utf8'))
env=jinja2.Environment(undefined=jinja2.StrictUndefined)
env.filters['to_json']=json.dumps
env.filters['difference']=lambda a,b:list(set(a)-set(b))
ctx=dict(v,groups={'manager_master':['master'],'manager_worker':['worker'],'lb':['lb1','lb2']},inventory_hostname='master',hostvars={'master':{'ansible_host':'10.0.0.20'},'worker':{'ansible_host':'10.0.0.21'}})
p=base/'roles/dashboard/templates/wazuh.yml.j2'
rendered=yaml.safe_load(env.from_string(p.read_text()).render(ctx))
api=rendered['hosts'][0]['default']
assert api['password']==v['wazuh_api_password']
assert api['url']=='https://10.0.0.20'
for role in ['master','worker']:
    import xml.etree.ElementTree as ET
    xml=env.from_string((base/'roles/manager/templates/cluster.xml.j2').read_text()).render(dict(ctx,inventory_hostname=role))
    r=ET.fromstring(xml)
    assert r.findtext('node_type')==role
    assert r.findtext('nodes/node')=='10.0.0.20'
verify=yaml.safe_load((base/'verify.yml').read_text(encoding='utf8'))
task=next(t for play in verify for t in play.get('tasks',[]) if 'api_nodes'==t.get('register'))
condition=env.compile_expression(task['until'])
assert condition(**dict(ctx,api_nodes={'status':200,'json':{'data':{'affected_items':[{'name':'master'},{'name':'worker'}]}}}))
assert not condition(**dict(ctx,api_nodes={'status':200,'json':{'data':{'affected_items':[{'name':'master'}]}}}))
assert not condition(**dict(ctx,api_nodes={'status':500}))
print('PASS: generated YAML, Jinja credential round-trip, master/worker XML, missing-worker and API-error verification conditions')
