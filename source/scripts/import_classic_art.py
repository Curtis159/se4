"""Losslessly convert original SE4 bitmap assets for the browser. Private use."""
from pathlib import Path
import sys,json
from PIL import Image
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1])
manifest={}
for folder in ['Planets','Facilities','Components','Races']:
 for path in (source/'Pictures'/folder).rglob('*'):
  if path.suffix.lower()!='.bmp':continue
  stem=path.stem.lower()
  if folder=='Planets' and not (stem.startswith('p') and stem[1:].isdigit()):continue
  if folder=='Facilities' and not stem.startswith('facil_'):continue
  if folder=='Components' and not stem.startswith('comp_'):continue
  if folder=='Races' and '_portrait_' not in stem and '_mini_' not in stem:continue
  rel=path.relative_to(source/'Pictures').with_suffix('.webp').as_posix().lower()
  out=root/'web/assets/classic'/rel;out.parent.mkdir(parents=True,exist_ok=True)
  image=Image.open(path).convert('RGBA');image.putdata([(r,g,b,0 if (r,g,b)==(0,0,0) else a) for r,g,b,a in image.getdata()]);out=out.with_suffix('.png');image.save(out,'PNG')
  manifest[rel]='assets/classic/'+str(Path(rel).with_suffix('.png')).replace('\\','/')
(root/'web/assets/classic-art.json').write_text(json.dumps(manifest,separators=(',',':')))
print('Converted original assets:',len(manifest))
