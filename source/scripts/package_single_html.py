"""Package the same compiled engine and private data into an offline HTML file."""
from pathlib import Path
import base64,json,re,sys
root=Path(__file__).resolve().parents[1]
web=root/'web'
hegemon='--hegemon' in sys.argv
engine_dir=web/('engine-hegemon' if hegemon else 'engine')
def b64(p):return base64.b64encode(p.read_bytes()).decode()
module=(engine_dir/'opense4.mjs').read_text(encoding='utf-8').replace('export default createOpenSE4;','')
# Local-file module workers are not supported consistently by embedded browsers.
# This bundle has no imports: run it as a classic Blob worker instead.
module=module.replace('import.meta.url','self.location.href')
worker=module+'''
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let ready,pending=Promise.resolve();
self.onmessage=({data})=>{
 if(data.boot){const wasm=decode(data.wasm),assets=decode(data.assets);ready=createOpenSE4({wasmBinary:wasm,locateFile:path=>path,getPreloadedPackage:()=>assets.buffer,printErr:console.warn});ready.catch(()=>{});return;}
 const {id,method,args}=data;
 pending=pending.then(async()=>{try{const engine=await ready;const result=JSON.parse(await engine.ccall('se4_call','string',['string','string'],[method,JSON.stringify(args)]__CALL_OPTIONS__));if(typeof result.error==='string'&&!('accepted'in result))throw new Error(result.error);self.postMessage({id,result});}
 catch(error){self.postMessage({id,error:error.message,stack:error.stack});}});
};
'''
worker=worker.replace('__CALL_OPTIONS__',',{async:true}' if hegemon else '')
transport=(web/'src/wasm-transport.js').read_text(encoding='utf-8').replace('export class','class')
transport=transport.replace("new URL('./wasm-worker.js',import.meta.url)","URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}))")
transport=transport.replace(",{type:'module'}","")
transport=transport.replace('this.nextId=0;',"this.worker.postMessage({boot:true,wasm:wasmBase64,assets:assetsBase64});this.nextId=0;")
js='\n'.join((web/'src'/f).read_text(encoding='utf-8') for f in ['build-info.js','design-parts.js','app-updates.js','research-model.js','route-selection.js','design-types.js','construction-filters.js','bridge.js','presets.js','turn-guide.js','sector-markers.js','online-games.js','local-saves.js'])
js=re.sub(r'\bexport ', '',js)
app=(web/'src/app.js').read_text(encoding='utf-8');app=re.sub(r'^import .*?;\n','',app,flags=re.M)
for name,var in [('races','racesData'),('empire-presets','presetsData'),('classic-art','classicArtData'),('../online-config','onlineConfigData')]:
 app=app.replace("fetch('./assets/"+name+".json').then(r=>r.json())",'Promise.resolve('+var+')')
app=app.replace("fetch('./online-config.json').then(r=>r.json())","(location.protocol==='file:'?Promise.resolve(onlineConfigData):fetch('./online-config.json').then(r=>r.json()))")
races=json.loads((web/'assets/races.json').read_text(encoding='utf-8'))
for race in races:
 race['image']='data:image/png;base64,'+b64(web/race['image'])
classic_art=json.loads((web/'assets/classic-art.json').read_text(encoding='utf-8'))
for key,path in classic_art.items():classic_art[key]='data:image/'+('png' if path.endswith('.png') else 'webp')+';base64,'+b64(web/path)
preamble='const onlineConfigData='+(web/'online-config.json').read_text(encoding='utf-8')+';\n'+'const classicArtData='+json.dumps(classic_art)+';\nconst workerSource='+json.dumps(worker)+';\nconst wasmBase64='+json.dumps(b64(engine_dir/'opense4.wasm'))+';\nconst assetsBase64='+json.dumps(b64(engine_dir/'opense4.data'))+';\nconst racesData='+json.dumps(races)+';\nconst presetsData='+(web/'assets/empire-presets.json').read_text(encoding='utf-8')+';\n'
html=(web/'index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="style.css">','<style>'+(web/'style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('OpenSE4 Browser</title>','OpenSE4 Browser — '+('Hegemon · Combat and Fleets Update 28' if hegemon else 'Combat and Fleets Update 28')+'</title>')
script=preamble+js+'\n'+transport+'\n'+app
html=html.replace('<script type="module" src="src/app.js"></script>','<script type="module">'+script.replace('</script','<\\/script')+'</script>')
out=root/('OpenSE4_Hegemon_WASM.html' if hegemon else 'OpenSE4_Headless_WASM.html');out.write_text(html,encoding='utf-8',newline='\n');print(out)
