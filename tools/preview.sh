#!/usr/bin/env bash
# Build and serve the physics site locally, preserving its /fizika/ URL base.
# Run in an ordinary terminal: bash tools/preview.sh
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root/physics-platform"
npm run build
python3 scripts/stage-publication.py
preview_dir="$(mktemp -d "${TMPDIR:-/tmp}/fizika-preview.XXXXXX")"
trap 'rm -rf -- "$preview_dir"' EXIT
ln -s "$project_root/physics-platform/dist" "$preview_dir/fizika"
echo 'Physics preview: http://127.0.0.1:4173/fizika/lt/9/thermal/specific-heat-and-graphs/'
echo 'Keep this terminal open while reviewing. Ctrl+C stops the preview.'
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$preview_dir"
