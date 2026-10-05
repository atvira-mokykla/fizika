"""Bilingual visual revision of the original authoring data. CC BY-SA 4.0."""
import re

def revise(body, lang, number):
    def t(en, lt): return lt if lang == 'lt' else en
    def lab(mode): return f'<ThermalLab mode="{mode}" lang="{lang}" />'
    titles = {
        1: t('Compare the scene before explaining it', 'Palygink vaizdą prieš aiškindamas'),
        2: t('Predict, run, compare, explain', 'Numatyk, bandyk, palygink, paaiškink'),
        3: t('Collect evidence in your notebook', 'Surink įrodymus savo užrašuose'),
        4: t('From your measurements to an energy account', 'Nuo tavo matavimų iki energijos balanso'),
    }
    mode = {1:'temperature',2:'heating',3:'apparatus',4:'balance'}[number]
    intro = {
        1: t('**Visual investigation.** Start with the equal readings. Describe what you can see, then distinguish it from what you infer. Switch water B to 35 °C and explain the direction of transfer in thermal contact. The water does not mix in this illustration.', '**Vaizdinis tyrimas.** Pradėk nuo vienodų rodmenų. Atskirai aprašyk tai, ką matai, ir tai, ką iš to sprendi. Parink vandeniui B 35 °C ir paaiškink perdavimo kryptį esant šiluminiam kontaktui. Šioje iliustracijoje vanduo nesimaišo.'),
        2: t('**A guided model investigation, not measured evidence.** Compare masses at the same delivered power. Write a prediction and reason, keep a completed run, and name the graph or table evidence that supports your explanation. You can do the same comparison with the static table and a paper sketch.', '**Prižiūrimas modelio tyrimas, ne matavimų įrodymai.** Lygink mases esant tai pačiai perduodamai galiai. Užrašyk prognozę ir paaiškinimą, išsaugok baigtą bandymą, nurodyk tavo paaiškinimą pagrindžiančius grafiko ar lentelės duomenis. Tą patį palyginimą gali atlikti pagal statinę lentelę ir brėžinį popieriuje.'),
        3: t('**Follow the safety and measurement protocol from the explanation before using apparatus.** The core is one equal-mass supervised trial. The second trial is an optional repeat. Keep raw readings and observations; never replace a missing reading with the ideal prediction.', '**Prieš naudodamas įrangą laikykis aiškinime pateiktos saugos ir matavimo eigos.** Pagrindas – vienas prižiūrimas vienodų masių bandymas. Antras bandymas yra papildomas kartojimas. Išsaugok rodmenis ir stebėjimus; trūkstamo rodmens nekeisk idealia prognoze.'),
        4: t('**Two separate tasks.** First explore an ideal mixing model. Then load your lesson 3 record, confirm its inputs and compare the prediction with your readings. If you have no apparatus data, choose the explicitly synthetic practice route. Using a supplied dataset does not demonstrate physical measuring skills.', '**Dvi atskiros užduotys.** Pirma tyrinėk idealų maišymo modelį. Tada atverk 3 pamokos užrašus, patvirtink pradinius duomenis ir palygink prognozę su rodmenimis. Jei matavimų neturi, pasirink aiškiai pažymėtus sintetinius pratybų duomenis. Pateiktų duomenų analizė neparodo praktinių matavimo gebėjimų.'),
    }
    explore = f'<Block kind="explore" title="{titles[number]}">\n\n{intro[number]}\n\n{lab(mode)}\n\n</Block>'
    body = re.sub(r'<Block kind="explore".*?</Block>', lambda _: explore, body, count=1, flags=re.S)
    # Experience the model before reading its explanation; the physical lab still
    # follows the safety/protocol explanation.
    if number != 3:
        chunks = re.findall(r'<Block\b.*?</Block>', body, re.S)
        ei = next(i for i,b in enumerate(chunks) if 'kind="explore"' in b)
        exploration = chunks.pop(ei)
        xi = next(i for i,b in enumerate(chunks) if 'kind="explain"' in b)
        chunks.insert(xi, exploration)
        body = '\n\n'.join(chunks)
    # Keep all assessed outcomes and established practice IDs, but reveal optional
    # worked examples only when the pupil or teacher needs them.
    def optional_examples(match):
        block = match.group(0)
        second = re.search(r'<Example title="(?:Example 2|2 pavyzdys)', block)
        if not second: return block
        summary = t('More practice: reverse calculations and deeper examples', 'Daugiau pratybų: atvirkštiniai skaičiavimai ir gilesni pavyzdžiai')
        block = block[:second.start()] + f'<details class="th-extension">\n<summary>{summary}</summary>\n\n' + block[second.start():]
        return block.replace('</Block>', '\n</details>\n\n</Block>')
    body = re.sub(r'<Block kind="examples".*?</Block>', optional_examples, body, count=1, flags=re.S)
    if number == 1:
        scale = t('**A scale is not a heating process.** 20 °C = 293.15 K; 35 °C = 308.15 K. The change is 15 °C = 15 K. Kelvin has no degree symbol. Changing units alone does not change the water.', '**Skalė nėra šildymo procesas.** 20 °C = 293,15 K; 35 °C = 308,15 K. Pokytis yra 15 °C = 15 K. Kelvino vienetas rašomas be laipsnio ženklo. Vien vienetų keitimas vandens nekeičia.')
        body = body.replace('</Frames>', '</Frames>\n\n'+scale, 1)
    if number == 2:
        prompt = t('**Transfer challenge.** A new run uses 0.30 kg of liquid water at 20 °C with 42 W delivered for 200 s. Predict its temperature rise, then explain where its curve lies between the 200 g and 400 g curves.', '**Naujas iššūkis.** Naujame bandyme 0,30 kg 20 °C skysto vandens 200 s perduodama 42 W galia. Numatyk temperatūros pokytį ir paaiškink, kur jo kreivė bus tarp 200 g ir 400 g kreivių.')
        solution = t('Q = 8400 J; ΔT = 8400/(0.30 × 4200) ≈ 6.67 K. Its curve is shallower than 200 g and steeper than 400 g at the same power. This is a prediction of the ideal model.', 'Q = 8400 J; ΔT = 8400/(0,30 × 4200) ≈ 6,67 K. Esant tai pačiai galiai kreivė bus mažesnio nuolydžio nei 200 g ir statesnė nei 400 g. Tai idealaus modelio prognozė.')
        transfer = f'<Quantity id="g9-thermal-02-transfer" expected={{{20/3}}} quantity="temperature-difference" units="K|°C" show="{t("6.67 K", "6,67 K")}" tolerance={{0.05}} outcome="g9.thermal.5">\n\n{prompt}\n\n<Ok>{solution}</Ok>\n<Solution>\n\n{solution}\n\n</Solution>\n</Quantity>'
        body = re.sub(r'(<Block kind="check".*?)(</Block>)', lambda m:m[1]+'\n\n'+transfer+'\n\n'+m[2],body,count=1,flags=re.S)
    # Put a concise, honest core route before the fuller teacher notes.
    routes = {
      1:t('**Visual core:** compare equal-temperature samples; explain the thermal-contact case; distinguish temperature, stored energy and transfer; use one worked example and a new explanation. Particle detail and extra examples are optional.', '**Vaizdinis pagrindas:** palygink vienodos temperatūros vandens kiekius; paaiškink šiluminio kontakto atvejį; atskirk temperatūrą, vidinę energiją ir perdavimą; nagrinėk vieną pavyzdį ir naują paaiškinimą. Dalelių detalės ir kiti pavyzdžiai papildomi.'),
      2:t('**Investigation core:** prediction 5 min; controlled model comparison 10; discussion and equation 8; one worked example and transfer 7. Leave the rest of the 45-minute slot for transitions and teacher support. These are provisional timings, not classroom measurements. The model comes before the equation explanation; it does not empirically establish the law.', '**Tyrimo pagrindas:** prognozė 5 min; modelio palyginimas keičiant vieną dydį 10; aptarimas ir lygtis 8; vienas pavyzdys ir naujas iššūkis 7. Likusį 45 min laiką skirkite perėjimams ir mokytojo pagalbai. Laikas siūlomas, ne išmatuotas klasėje. Modelis pateiktas prieš lygties paaiškinimą; jis empiriškai neįrodo dėsnio.'),
      3:t('**Physical core:** one supervised trial after protocol preparation. Repeat, unequal masses and extra worked examples are extensions. Assign measuring, recording and timing roles; rotate them if repeating. The apparatus diagram is a schematic; the notebook fields are raw readings. Only lesson 3 needs physical apparatus.', '**Praktinis pagrindas:** vienas prižiūrimas bandymas susipažinus su eiga. Kartojimas, nevienodos masės ir papildomi pavyzdžiai yra plėtiniai. Paskirkite matavimo, užrašymo ir laiko sekimo vaidmenis; kartodami juos sukeiskite. Įrangos brėžinys yra schema; užrašų laukeliuose – rodmenys. Tik 3 pamokai reikia fizinės įrangos.'),
      4:t('**Analysis core:** distinguish model from readings; confirm notebook inputs; calculate one balance; explain the water boundary and one omitted effect. Other examples and sensitivity calculations are extensions. A complete explanation names evidence, not just an answer.', '**Analizės pagrindas:** atskirk modelį nuo rodmenų; patvirtink užrašų duomenis; apskaičiuok vieną balansą; paaiškink vandens ribą ir vieną neįtrauktą poveikį. Kiti pavyzdžiai ir jautrumo skaičiavimai papildomi. Pilnas paaiškinimas nurodo įrodymus, ne vien atsakymą.'),
    }
    body = re.sub(r'(<Block kind="teacher"[^>]*>\s*)',lambda m:m[1]+routes[number]+'\n\n',body,count=1)
    # The previous route is retained as an optional expanded route, not a second
    # incompatible classroom-core prescription.
    body = body.replace('**45-minute core:**', '**Expanded practice route, optional:**').replace('**45 min pagrindas:**','**Išplėstinė pratybų eiga, pasirenkama:**')
    if number == 3:
        body = body.replace('**45-minute route:**','**Optional expanded two-trial route:**').replace('**45 min eiga:**','**Papildoma išplėstinė dviejų bandymų eiga:**')
    return body
