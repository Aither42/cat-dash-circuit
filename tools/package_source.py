"""Package only authored game sources, public assets, tests and handoff docs."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parent.parent
files=[]
for name in ['app/src','app/public','app/tests','app/scripts','docs','design','tools']:
 for p in (root/name).rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.zip']:
   files.append(p)
for name in ['README.md','app/package.json','app/bun.lock','app/bunfig.toml','app/tsconfig.json','app/vitest.config.ts','app/wrangler.jsonc','app/app.manifest.json']:
 files.append(root/name)
out=root/'app/public/cat-dash-circuit-source.zip'
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 for p in sorted(set(files)):z.write(p,'cat-dash-circuit/'+str(p.relative_to(root)))
with ZipFile(out) as z:
 assert z.testzip() is None
 print(str(out),out.stat().st_size,'bytes',len(z.namelist()),'files, integrity OK')
