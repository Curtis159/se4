"""Write a Netlify-friendly publish folder. Never delete an existing output directory."""
from pathlib import Path
import gzip,hashlib,json,shutil,sys
root=Path(__file__).resolve().parents[1];web=root/'web';dest=Path(sys.argv[1]).resolve();dest.mkdir(parents=True,exist_ok=True)
def write(name,data):
 f=dest/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data if isinstance(data,bytes) else data.encode('utf-8'))
for name in ['index.html','style.css','manifest.webmanifest','online-config.json','icon.svg','icon-192.png','icon-512.png']:write(name,(web/name).read_bytes() if name.endswith('.png') else (web/name).read_text(encoding='utf-8-sig'))
for f in (web/'src').glob('*.js'):
 text=f.read_text(encoding='utf-8')
 if f.name=='wasm-transport.js':text=text.replace("'./wasm-worker.js'","'./hosted-worker.js'")
 write('src/'+f.name,text)
write('sw.js',(web/'sw-hosted.js').read_text(encoding='utf-8'))
write('engine-hegemon/opense4.mjs',(web/'engine-hegemon/opense4.mjs').read_bytes())
manifest={}
for kind,suffix in [('wasm','wasm'),('data','data')]:
 data=(web/'engine-hegemon'/('opense4.'+suffix)).read_bytes();packed=gzip.compress(data,compresslevel=9,mtime=0);parts=[]
 for i,offset in enumerate(range(0,len(packed),8*1024*1024)):
  name=f'engine-hegemon/{kind}.gzip.part{i}.bin';write(name,packed[offset:offset+8*1024*1024]);parts.append(name)
 manifest[kind]={'parts':parts,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
write('engine-manifest.json',json.dumps(manifest))
def asset(path):
 data=(web/path).read_bytes();name='assets/art/'+hashlib.sha256(data).hexdigest()[:24]+Path(path).suffix;write(name,data);return name
art=json.loads((web/'assets/classic-art.json').read_text(encoding='utf-8'));write('assets/classic-art.json',json.dumps({key:asset(value) for key,value in art.items()}))
races=json.loads((web/'assets/races.json').read_text(encoding='utf-8'))
for race in races:race['image']=asset(race['image'])
write('assets/races.json',json.dumps(races));write('assets/empire-presets.json',(web/'assets/empire-presets.json').read_text(encoding='utf-8'))
write('_headers','/engine-hegemon/*.bin\n  Cache-Control: public, max-age=0, must-revalidate\n/assets/art/*\n  Cache-Control: public, max-age=31536000, immutable\n/sw.js\n  Cache-Control: no-cache\n')
signature=hashlib.sha256(b''.join(hashlib.sha256(f.read_bytes()).digest() for f in sorted(dest.rglob('*')) if f.is_file() and f.name not in ['sw.js','cache-manifest.json','HOSTING_SIZE.json'])).hexdigest()[:16]
write('sw.js',(web/'sw-hosted.js').read_text(encoding='utf-8').replace("opense4-hosted-26'",f"opense4-hosted-26-{signature}'"))
paths=['./'+f.relative_to(dest).as_posix() for f in dest.rglob('*') if f.is_file() and f.name not in ['cache-manifest.json','_headers','HOSTING_SIZE.json']]
write('cache-manifest.json',json.dumps(paths))
files=[f for f in dest.rglob('*') if f.is_file()];sizes={'totalBytes':sum(f.stat().st_size for f in files),'largestBytes':max(f.stat().st_size for f in files),'files':len(files),'indexBytes':(dest/'index.html').stat().st_size,'engineCompression':'gzip chunks, browser DecompressionStream, SHA-256 verification'};assert sizes['largestBytes']<=8*1024*1024
write('HOSTING_SIZE.json',json.dumps(sizes,indent=2));print(json.dumps(sizes))
