# Lithuanian physics trial module

Four original grade 9 lessons: temperature/internal energy/heat; Q = mcΔT and graphs; supervised water mixing; evidence and heat balance.

Sources live in `content/`. `site/assets/` contains the progressive JavaScript enhancements and CSS. The generator `../tools/build_thermal_pilot.py` produces 15 Lithuanian HTML pages and two printable PDFs from the same lesson sources. `../curriculum/thermal-objectives.json` maps 12 objectives to the official programme and concrete evidence.

Teacher review, a physical trial with school equipment and classroom testing are pending. Publication as trial material does not certify the full curriculum topic or practical competence. Illustrative data are explicitly labelled.

Build from repository root:

```sh
python -m pip install -r tools/requirements.txt
python tools/build_thermal_pilot.py
python tools/validate_thermal_pilot.py
node tools/test_quantity_checker.mjs
```

The builder requires DejaVu Sans fonts at `/usr/share/fonts/truetype/dejavu/`. GitHub Actions builds and publishes the generated `physics-starter/site/` directory. No accounts, remote analytics, pupil data collection or runtime network dependencies.

Original teaching content: CC BY-SA 4.0. Code: MIT. No commercial textbook pages or user-supplied textbook files are republished.
