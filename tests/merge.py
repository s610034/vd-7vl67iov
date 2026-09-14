from pathlib import Path
import subprocess,sys,xml.etree.ElementTree as ET
base=Path(__file__).resolve().parent.parent / '.test-output'
folder=base/'merge-tests';folder.mkdir(exist_ok=True)
target=folder/'ossec.conf';desired=folder/'cluster.xml'
helper=str(base/'merge-cluster.py')
original='''<!-- preserve comment -->
<ossec_config><global><jsonout_output>yes</jsonout_output></global><cluster><nodes><node /></nodes></cluster><localfile><location>/var/log/auth.log</location></localfile></ossec_config>
<ossec_config><cluster><disabled>yes</disabled></cluster><ruleset><rule_dir>etc/rules</rule_dir></ruleset></ossec_config>'''
desired.write_text('<cluster><name>test</name><nodes><node>10.0.0.20</node></nodes><disabled>no</disabled></cluster>')
target.write_text(original)
def run(): return subprocess.run([sys.executable,helper,str(target),str(desired)],capture_output=True,text=True)
r=run();assert r.returncode==0,r.stderr
assert r.stdout.strip()=='CHANGED'
result=target.read_text();root=ET.fromstring('<root>'+result+'</root>')
assert len(root.findall('.//cluster'))==1
assert root.findtext('.//cluster/nodes/node')=='10.0.0.20'
assert root.findtext('.//global/jsonout_output')=='yes'
assert root.findtext('.//localfile/location')=='/var/log/auth.log'
assert root.findtext('.//ruleset/rule_dir')=='etc/rules'
assert '<!-- preserve comment -->' in result
assert any(p.read_text()==original for p in folder.glob('ossec.conf.backup-*'))
r=run();assert r.returncode==0 and r.stdout.strip()=='UNCHANGED',r.stderr+r.stdout
assert target.read_text()==result
desired.write_text('<cluster><nodes><node /></nodes></cluster>')
r=run();assert r.returncode!=0 and target.read_text()==result
target.write_text('<ossec_config><broken>')
r=run();assert r.returncode!=0 and target.read_text()=='<ossec_config><broken>'
print('PASS: duplicate removal, Master IP, unrelated configuration/comments, backup, idempotency, empty IP and malformed XML rejection')
