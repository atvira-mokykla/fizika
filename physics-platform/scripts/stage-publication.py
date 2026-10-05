"""Retain the earlier pilot and publish editable originals; never writes to git."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil
root=Path(__file__).resolve().parents[2];p=root/'physics-platform';dist=p/'dist';old=root/'physics-starter/site'
archive=dist/'archive/pilot-v0.2'
shutil.copytree(old,archive,dirs_exist_ok=True)
(dist/'downloads').mkdir(exist_ok=True)
for name in ['thermal-pupil-workbook.pdf','thermal-teacher-guide.pdf']:
 shutil.copy2(old/'downloads'/name,dist/'downloads'/name)
paths=[p/'src',p/'public',p/'scripts',p/'tests',p/'package.json',p/'package-lock.json',p/'astro.config.mjs',p/'tsconfig.json',p/'README.md',p/'LICENSE',p/'LICENSE-CONTENT.md',p/'.gitignore',root/'physics-starter/content',root/'physics-starter/schema',root/'physics-starter/review',root/'physics-starter/assets',root/'tools',root/'curriculum',root/'publication/publish.yml',root/'publication/fizika-README.md',root/'LICENSE',root/'LICENSE-CONTENT.md']
with ZipFile(dist/'downloads/physics-original-sources.zip','w',ZIP_DEFLATED) as z:
 for path in paths:
  for f in path.rglob('*') if path.is_dir() else [path]:
   if f.is_file() and '__pycache__' not in f.parts:z.write(f,str(f.relative_to(root)))
(dist/'.nojekyll').touch()
print('Staged original sources ZIP and labelled pilot-v0.2 archive.')
