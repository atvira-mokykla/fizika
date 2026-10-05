#!/usr/bin/env bash
# Build/check and publish with the same gh-clone/git-push route as mathematics.
# Usage: bash tools/publish.sh; DRY_RUN=1 bash tools/publish.sh
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
public_repo="${PUBLIC_REPO:-atvira-mokykla/fizika}"
cd "$project_root"

# Fail early when ordinary terminal connectivity is unavailable.
if [[ "${DRY_RUN:-}" != 1 ]]; then
  git ls-remote --exit-code "https://github.com/${public_repo}.git" refs/heads/main >/dev/null
fi

publish_checkout="$(mktemp -d "${TMPDIR:-/tmp}/fizika-publish.XXXXXX")"
trap 'rm -rf -- "$publish_checkout"' EXIT
if [[ "${DRY_RUN:-}" == 1 ]]; then
  git init --quiet --initial-branch=main "$publish_checkout/site"
else
  gh repo clone "$public_repo" "$publish_checkout/site" -- --depth 1 --branch main
fi
python3 tools/stage_github_sources.py "$publish_checkout/site"
git -C "$publish_checkout/site" add -A
git -C "$publish_checkout/site" diff --cached --check

python3 tools/build_thermal_pilot.py
python3 tools/validate_thermal_pilot.py
node tools/test_quantity_checker.mjs
(
  cd physics-platform
  export ASTRO_TELEMETRY_DISABLED=1
  npm test
  npm run check
  npm run build
  python3 scripts/stage-publication.py
  python3 scripts/check-physics.py
)

if [[ "${DRY_RUN:-}" == 1 ]]; then
  echo 'All local checks passed. DRY_RUN: no GitHub changes.'
  exit 0
fi

cd "$publish_checkout/site"
if git diff --cached --quiet; then
  echo 'GitHub sources are already up to date.'
  exit 0
fi
git -c user.name='atvira-mokykla publisher' \
    -c user.email='noreply@users.noreply.github.com' \
    commit -q -m "Publish bilingual physics platform ($(date -u +%Y-%m-%dT%H:%MZ))"
git push origin HEAD:main
echo "Pushed sources to https://github.com/${public_repo}. GitHub Actions will verify and deploy Pages."
