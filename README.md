# Atvira mokykla / Fizika

Nemokama, oficialia Lietuvos programa grindžiama fizikos mokymosi medžiaga visoms Lietuvos mokykloms.

**[Atverti keturių pamokų bandomąjį modulį](https://atvira-mokykla.github.io/fizika/)**

1. Temperatūra, vidinė energija ir šiluma.
2. Šiluma ir temperatūra: ką rodo grafikas?
3. Tyrimas: maišome šiltą ir vėsų vandenį.
4. Duomenų analizė: kur perduota energija?

Tai dalinė 9 / I gimnazijos klasės šiluminių reiškinių seka. Kiekvienai pamokai pateikti mokinio tekstai, užduoties lapas, mokytojo gidas ir atsakymai. Yra 12 tikslų ir programos bei įrodymų sąsajų, šildymo modelis ir skaitinio atsakymo patikra.

**Bandomoji medžiaga:** praktikuojančio mokytojo peržiūra, fizinio protokolo bandymas su mokyklos priemonėmis ir bandymas klasėje dar neatlikti. Iliustraciniai duomenys aiškiai pažymėti; jie nėra tikri matavimai.

## Medžiaga

- [Mokinio lapai · PDF](https://atvira-mokykla.github.io/fizika/downloads/thermal-pupil-workbook.pdf)
- [Mokytojo gidas · PDF](https://atvira-mokykla.github.io/fizika/downloads/thermal-teacher-guide.pdf)
- [Mokytojo peržiūros ir bandymo paketas](https://atvira-mokykla.github.io/fizika/teachers.html)
- [Programa, aprėpties ribos ir pamokų JSON šaltiniai](https://atvira-mokykla.github.io/fizika/alignment.html)
- [Visi redaguojami originalūs šaltiniai · ZIP](https://atvira-mokykla.github.io/fizika/downloads/physics-original-sources.zip)

## Editing and rebuilding

The initial browser-only publication transfers the original files in `bootstrap-pilot.py`, a checksum-protected source bundle. The workflow expands it only in a temporary build workspace, checks the lessons and publishes GitHub Pages. Its checkout has `contents: read`; it never commits or pushes source changes. No textbook pages, pupil data or credentials are in the bundle.

For normal source editing, clone this repository, unpack the editable ZIP into its root, remove `bootstrap-pilot.py` from that checkout, and commit the individual source files. The existing workflow then builds those files directly. Lesson prose and answers live in `physics-starter/content/`; the renderer is `tools/build_thermal_pilot.py`. The ZIP includes the readable renderer, schema, alignment, assets, review pack and checker tests.

```sh
python -m pip install -r tools/requirements.txt
python tools/build_thermal_pilot.py
python tools/validate_thermal_pilot.py
node tools/test_quantity_checker.mjs
```

The PDF builder requires DejaVu Sans fonts. The generated site is `physics-starter/site/`; printable files are also generated in `output/pdf/`. All 41 quantity-checker cases passed, and the live controls were checked. Essential lesson content works without JavaScript or an account.

Original teaching content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Original code: MIT. External sources retain their own rights.
