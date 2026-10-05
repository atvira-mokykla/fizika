# Physics learning platform

This adapts the existing Atvira mokykla mathematics platform for Lithuania’s physics curriculum. It has paired English and Lithuanian interfaces, grades 9–12 year outlines, topic pages and four original grade 9 thermal lessons. Other lessons are visibly planned.

The shared Astro/Starlight components provide the visual theme, lesson rail, explanation frames, faded examples, feedback, projector mode, teacher notes and three separate print views per lesson. Physics adds dimension-aware numerical checking, temperature scales, heating graphs and ideal water mixing. Progress uses `physics.am.*` so exporting or deleting physics progress does not affect mathematics on the same origin.

## Content and maintenance

The editable lessons are under `src/content/docs/9/thermal/` and `src/content/docs/lt/9/thermal/`. They are fully paired originals. `scripts/author-lessons.py` contains the initial bilingual authoring data; running it regenerates all eight MDX files and the grade 9 outcome tree. Edit either those data and regenerate, or the MDX files directly; do not regenerate after direct MDX edits without first reconciling them.

Year plans are in `src/content/years/`; Lithuanian overlays are in `src/i18n/years-lt/`. Topic allocations and semester placements are provisional, with relative teaching-week ranges derived from their hours. They are not compulsory official pacing or a dated school calendar. The outlines cover all 43 official content nodes. Registry IDs beginning `lt-physics` are project IDs, not official paragraph numbers. Grades 11–12 have one physics pathway; the mathematics A/B distinction is not applied.

The four lessons are partial thermal coverage. Human physics review, Lithuanian terminology review, physical protocol testing and classroom timing validation remain pending. Synthetic data are labelled; the investigation leaves real-data fields blank. Water is prepared by the teacher at 35–40 °C, never above 40 °C, under supervision. It does not substitute for the separate unknown-material specific-heat investigation.

## Build and checks

Use Node 24 and Python with PyYAML. In an ordinary checkout:

```sh
npm ci
npm test
npm run check
npm run build
python3 scripts/stage-publication.py
python3 scripts/check-physics.py
```

Before staging, rebuild the labelled legacy archive from the repository root with `python3 tools/build_thermal_pilot.py`; this requires `tools/requirements.txt` and DejaVu Sans fonts. From the root, `DRY_RUN=1 bash tools/publish.sh` runs the complete local verification. `bash tools/publish.sh` then publishes readable original sources through GitHub CLI and an ordinary Git push, preserving the public repository's existing history. GitHub Actions independently checks/builds and deploys them.

The development environment uses a read-only symlink to mathematics’ installed dependencies; no mathematics sources or dependencies are edited. Both Astro and Vite caches are explicitly in this physics project. A fresh checkout installs its own dependencies with `npm ci`.

Print links open handout, worksheet and answer-key HTML views. Print or save as PDF in the browser. These are not pre-rendered downloadable PDFs; the archived original Lithuanian pilot PDFs are retained separately and labelled as an older edition.

## Attribution and licensing

The interface and generic lesson/runtime components are adapted from [Atvira mokykla mathematics](https://github.com/atvira-mokykla/matematika), copyright 2026 Atvira mokykla contributors, MIT; the licence notice is retained. Original physics teaching material is CC BY-SA 4.0. Curriculum excerpts come from the linked official programme and retain their own rights. No commercial textbook pages are included.
