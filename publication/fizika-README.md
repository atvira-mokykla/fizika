# Atvira mokykla Fizika

Free curriculum-aligned physics for Lithuania’s schools. [Open in English](https://atvira-mokykla.github.io/fizika/) · [Atverti lietuviškai](https://atvira-mokykla.github.io/fizika/lt/)

The platform shares Atvira mokykla mathematics’ design: grades 9–12, whole-year semester/topic plans, paired English and Lithuanian lessons, step-by-step explanations, worked examples, interactive models, immediate feedback, projector mode and teacher notes. Physics year pacing is explicitly provisional. Grades 11–12 have a single physics pathway.

Four grade 9 thermal lessons are available in both languages:

1. Temperature, internal energy and heat.
2. Heat, specific heat capacity and graphs.
3. Supervised water-mixing investigation.
4. Heat balance, model predictions and evidence.

The thermal lessons include original physical diagrams, a guided heating comparison with graphs and tables, a revisable prediction record, and a practical notebook connected to heat-balance analysis. Model illustrations, raw readings and synthetic practice data are labelled separately. The notebook can be saved in the local browser or exported; no account or upload is needed.

Other lessons are visibly planned. These four lessons do not complete the full thermal topic. Practising teacher review, independent Lithuanian review, laboratory execution and classroom timing validation remain pending. Synthetic data are labelled and separated from blank real-data records.

[Teacher and review resources](https://atvira-mokykla.github.io/fizika/teachers/) · [Mokytojams](https://atvira-mokykla.github.io/fizika/lt/teachers/) · [Editable original sources ZIP](https://atvira-mokykla.github.io/fizika/downloads/physics-original-sources.zip)

Each lesson has separate handout, worksheet and answer-key print views; use your browser to print or save as PDF. Earlier Lithuanian pilot PDFs remain linked as an older edition.

## Editing and rebuilding

The repository contains readable individual source files. Lesson MDX, year plans, UI and tests are under `physics-platform/`. The authoring script can regenerate the initial paired lessons; see its README before changing generated content. No commercial textbooks, pupil data or credentials are included.

GitHub Actions checks and builds these sources with `contents: read` and deploys the result to Pages. It never commits or pushes source changes. The terminal publisher clones the existing public history, stages the original source files, commits and uses an ordinary `git push`; it never force-pushes.

```sh
python3 -m pip install -r tools/requirements.txt PyYAML
(cd physics-platform && npm ci)
DRY_RUN=1 bash tools/publish.sh
# Optional browser preview:
bash tools/preview.sh
# To check and push to GitHub:
bash tools/publish.sh
```

Node 24, Python, DejaVu Sans fonts and authenticated GitHub CLI/Git are required. The complete workflow also rebuilds the original pilot edition and stages its archive. Build/verification tools are included in the ZIP. A successful source push triggers deployment; check GitHub Actions before assuming the new site is live.

Original teaching material: CC BY-SA 4.0. Code: MIT, including the adapted mathematics components with their attribution retained. Official sources retain their rights.
