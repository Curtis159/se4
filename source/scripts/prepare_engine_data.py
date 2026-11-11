"""Copy original simulation data, without packing the whole Windows install."""
from pathlib import Path
import shutil,sys
source=Path(sys.argv[1]).resolve();dest=Path(sys.argv[2]).resolve()
if not (source/'Data'/'Settings.txt').is_file():raise SystemExit('Original Data/Settings.txt is required')
# An intentionally separate disposable staging folder; do not edit the install.
dest.mkdir(parents=True,exist_ok=True)
for folder in ('Data','Ai','Dsgnname','Empires'):
 base=source/folder
 if base.is_dir():
  for file in base.rglob('*'):
   if file.is_file() and file.suffix.lower() in ('.txt','.emp'):
    target=dest/file.relative_to(source);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
for file in (source/'Pictures'/'Races').rglob('*.txt'):
 target=dest/file.relative_to(source);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
print(dest)
