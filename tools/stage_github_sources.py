#!/usr/bin/env python3
"""Copy the public editable physics sources into an existing Git checkout.

No references, secrets, dependencies, generated output or local Git metadata.
The checkout's history is preserved. Its obsolete transfer bundle is removed.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
PLATFORM = ROOT / 'physics-platform'


def stage(destination: Path) -> None:
    destination = destination.resolve()
    if destination == ROOT or destination.is_relative_to(ROOT):
        raise ValueError('Use a separate temporary clone, not the working project.')
    if not (destination / '.git').is_dir():
        raise ValueError('Destination must be a normal Git clone with its history.')
    directories = [
        'physics-platform/src', 'physics-platform/public',
        'physics-platform/scripts', 'physics-platform/tests',
        'physics-starter/content', 'physics-starter/schema',
        'physics-starter/review', 'physics-starter/assets', 'curriculum',
    ]
    files = [
        'physics-platform/package.json', 'physics-platform/package-lock.json',
        'physics-platform/astro.config.mjs', 'physics-platform/tsconfig.json',
        'physics-platform/README.md', 'physics-platform/LICENSE',
        'physics-platform/LICENSE-CONTENT.md', 'physics-platform/.gitignore',
        'physics-starter/README.md', 'LICENSE', 'LICENSE-CONTENT.md',
        'tools/requirements.txt', 'tools/build_thermal_pilot.py',
        'tools/validate_thermal_pilot.py', 'tools/test_quantity_checker.mjs',
        'tools/publish.sh', 'tools/preview.sh', 'tools/stage_github_sources.py',
        'publication/publish.yml', 'publication/fizika-README.md',
    ]
    for directory in directories:
        source = ROOT / directory
        target = destination / directory
        # Replace only our explicitly owned source directories, not the clone.
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)
    for name in files:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
    shutil.copy2(ROOT / 'publication/fizika-README.md', destination / 'README.md')
    workflow = destination / '.github/workflows/publish.yml'
    workflow.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'publication/publish.yml', workflow)
    (destination / 'bootstrap-pilot.py').unlink(missing_ok=True)
    (destination / 'bootstrap-platform.py').unlink(missing_ok=True)
    (destination / '.gitignore').write_text(
        'node_modules\ndist/\n.cache/\n.astro/\n__pycache__/\n*.pyc\n'
        'physics-starter/site/\noutput/\nresearch/thermal-pilot-validation.json\n'
    )
    (destination / '.gitattributes').write_text('* text=auto\n*.csv text eol=lf\n')
    print('Staged editable physics sources; preserved the existing Git history.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 tools/stage_github_sources.py CLONE_DIRECTORY')
    stage(Path(sys.argv[1]))
