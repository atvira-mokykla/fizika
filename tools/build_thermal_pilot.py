#!/usr/bin/env python3
"""Render original lesson JSON into static pupil/teacher/worksheet pages and two PDFs.

No network dependencies in the published site. Lesson prose/answers have one source.
"""
from html import escape as esc
import json
from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / 'physics-starter'
SITE = SEED / 'site'
PDF = ROOT / 'output/pdf'
RELEASE = '0.2.0-trial'
PUBLIC = 'https://atvira-mokykla.github.io/fizika/'
LESSONS = [json.loads(p.read_text()) for p in sorted((SEED / 'content').glob('g9-thermal-*.json'))]
NOTICE = 'Bandomoji medžiaga. Praktikuojančio mokytojo peržiūra ir bandymas klasėje dar neatlikti.'


def lt(value):
    return str(value).replace('.', ',') if isinstance(value, (float, int)) else str(value)


def graph_svg(blank=False):
    title = 'Tuščias tinklas grafiko braižymui' if blank else 'Idealaus vandens šildymo modelio grafikas'
    lines = ''.join(f'<line x1="60" y1="{y}" x2="440" y2="{y}" stroke="#d5dce1"/>' for y in range(60, 261, 25))
    lines += ''.join(f'<line x1="{x}" y1="60" x2="{x}" y2="260" stroke="#d5dce1"/>' for x in range(60, 441, 38))
    labels = '' if blank else ''.join(f'<text x="{60+i*95}" y="283" text-anchor="middle">{i*50}</text>' for i in range(5))
    labels += '' if blank else ''.join(f'<text x="50" y="{265-i*50}" text-anchor="end">{20+i*10}</text>' for i in range(5))
    plot = '' if blank else '<polyline points="60,260 155,247.5 250,235 345,222.5 440,210" fill="none" stroke="#1f6f5c" stroke-width="4"/>'
    axes = '' if blank else '<text x="250" y="317" text-anchor="middle">Laikas t (s)</text><text x="16" y="165" transform="rotate(-90 16 165)" text-anchor="middle">Temperatūra T (°C)</text>'
    return f'<svg viewBox="0 0 500 335" role="img" aria-label="{title}" xmlns="http://www.w3.org/2000/svg"><title>{title}</title><rect width="500" height="335" fill="white"/>{lines}<path d="M60 60V260H440" fill="none" stroke="#16212b" stroke-width="2"/>{plot}<g font-family="system-ui,sans-serif" font-size="13" fill="#16212b">{labels}{axes}</g></svg>'


def table_html(block):
    head = ''.join(f'<th scope="col">{esc(c)}</th>' for c in block['columns_lt'])
    rows = ''.join('<tr>' + ''.join(f'<td>{esc(lt(v))}</td>' for v in row) + '</tr>' for row in block['rows'])
    return f'<div class="table-wrap"><table><caption>{esc(block["title_lt"])}</caption><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'


def block_html(block, lesson, worksheet=False):
    html = f'<section class="block" id="{esc(block["id"])}" data-type="{block["type"]}"><h2>{esc(block["title_lt"])}</h2><p>{esc(block.get("body_lt", ""))}</p>'
    if block['type'] == 'table':
        html += table_html(block)
    if block.get('graph') == 'blank':
        html += graph_svg(True)
    if block['type'] == 'quantity-question' and not worksheet:
        spec = esc(json.dumps(block['checker'], ensure_ascii=False), quote=True)
        html += f'<form data-checker="{spec}" hidden><div class="controls"><div><label for="{block["id"]}-value">Skaičius</label><input id="{block["id"]}-value" name="value" type="text" inputmode="decimal" autocomplete="off" required placeholder="Pvz., 16,8"></div><div><label for="{block["id"]}-unit">Vienetas</label><select id="{block["id"]}-unit" name="unit">'
        html += ''.join(f'<option value="{esc(u)}">{esc(u)}</option>' for u in block['checker']['accepted_units'])
        html += '</select></div><button type="submit">Patikrinti</button></div><p role="status" aria-live="polite"></p><p class="meta">Mokymosi patikra; tai nėra oficialus egzamino vertinimas.</p></form>'
    answer = lesson['teacher']['answers_lt'].get(block['id'])
    if answer and not worksheet:
        html += f'<details><summary>Palygink su atsakymu, kai baigsi</summary><p class="answer">{esc(answer)}</p></details>'
    if worksheet and block.get('worksheet_lines'):
        html += f'<div class="writing" aria-label="Vieta sprendimui" style="height:{block["worksheet_lines"]*1.75}rem"></div>'
    return html + '</section>'


def nav(current=None):
    return '<aside aria-label="Modulio pamokos"><p class="kicker">9 klasė · šiluma</p><ol>' + ''.join(f'<li><a href="{l["id"]}.html"'+(' aria-current="page"' if current==l['id'] else '')+f'>{esc(l["title"])}</a></li>' for l in LESSONS) + '</ol><a href="index.html">Modulio pradžia</a></aside>'


def page(title, content, current=None, body_class=''):
    layout = f'<div class="layout">{nav(current)}<article class="lesson-main">{content}</article></div>' if current else content
    return f'''<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | Atvira mokykla · Fizika</title><meta name="description" content="Nemokama 9 klasės fizikos bandomoji medžiaga: šiluma, temperatūra, tyrimai ir duomenų analizė."><link rel="stylesheet" href="assets/pilot.css"><script type="module" src="assets/pilot.mjs"></script></head><body class="{body_class}"><a class="skip" href="#main">Pereiti prie turinio</a><header><div class="bar"><a class="brand" href="index.html">Atvira mokykla <span style="color:#1f6f5c">/ Fizika</span></a><nav aria-label="Pagrindinė navigacija"><a href="index.html">Pamokos</a><a href="teachers.html">Mokytojui</a><a href="alignment.html">Programa ir šaltiniai</a><a href="https://atvira-mokykla.github.io/">Mokyklos pradžia</a></nav></div></header><main id="main">{layout}</main><footer><p>Atvira mokykla · Nemokama visoms Lietuvos mokykloms · {RELEASE} · 2026-10-04</p><p>Originalus mokomasis turinys: <a href="LICENSE-CONTENT.md">CC BY-SA 4.0</a>. Kodas: <a href="LICENSE">MIT</a>. Mokinių duomenys nesiunčiami ir nesaugomi. <a href="https://github.com/atvira-mokykla/fizika/issues/new">Pranešti apie klaidą</a>.</p></footer></body></html>'''


def heating_model():
    rows = ''.join(f'<tr data-time="{t}"><td>{t} s</td><td>{lt(20+42*t/(.2*4200))} °C</td></tr>' for t in [0,50,100,150,200])
    return f'<section class="model" data-heating-model><h2>Išbandyk modelio prognozę</h2><p>Pradinė temperatūra 20 °C, galia 42 W, c = 4200 J/(kg·K), nuostolių ir indo nepaisome. Būsena nekinta. Tai simuliacija, ne matavimai. Prieš keisdamas masę prognozuok temperatūros kitimą.</p><label for="model-mass">Vandens masė</label><select id="model-mass" disabled><option value="0.1">0,10 kg</option><option value="0.2" selected>0,20 kg</option><option value="0.4">0,40 kg</option></select>{graph_svg()}<div class="table-wrap"><table><caption>Ta pati modelio informacija lentele</caption><thead><tr><th scope="col">Laikas t</th><th scope="col">Temperatūra T</th></tr></thead><tbody>{rows}</tbody></table></div><p role="status" aria-live="polite">Rodomas 0,20 kg vandens modelis.</p><noscript><p>Be JavaScript gali perskaityti pradinį grafiką ir lentelę. Kitai masei skaičiuok ΔT = Pt/(mc).</p></noscript></section>'


def build_html():
    SITE.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SEED / 'assets', SITE / 'assets', dirs_exist_ok=True)
    (SITE / 'downloads').mkdir(exist_ok=True)
    (SITE / 'source').mkdir(exist_ok=True)
    for l in LESSONS:
        prefix = f'<p class="kicker">9 / I gimnazijos klasė · Pamoka {int(l["id"][-2:])}</p><h1>{esc(l["title"])}</h1><p class="notice">{NOTICE}</p><p class="meta">Branduolys: {l["core_minutes"]} min · Pamokos laikas: {l["slot_minutes"]} min · Versija {l["version"]}</p>'
        intro = '<section class="card"><h2>Ko mokysiesi?</h2><ul>'+''.join(f'<li>{esc(o)}</li>' for o in l['objectives_lt'])+'</ul></section>'
        prep = '<details><summary>Prieš pamoką: žinios, priemonės ir sauga</summary><h3>Pradinės žinios</h3><ul>'+''.join(f'<li>{esc(p)}</li>' for p in l['prerequisites_lt'])+'</ul><h3>Priemonės</h3><ul>'+''.join(f'<li>{esc(p)}</li>' for p in l['equipment_lt'])+f'</ul><p>{esc(l["safety_lt"])}</p></details>'
        links = f'<div class="actions"><a class="button secondary" href="{l["id"]}-worksheet.html">Užduoties lapas</a><a class="button secondary" href="downloads/thermal-pupil-workbook.pdf">Visi lapai · PDF</a><a class="button secondary" href="{l["id"]}-teacher.html">Mokytojo gidas</a></div>'
        body = prefix + intro + prep + links
        for block in l['blocks']:
            body += block_html(block,l)
        if l['id'].endswith('02'):
            body += heating_model()
        n = int(l['id'][-2:])
        body += f'<div class="next"><a class="button" href="g9-thermal-{n+1:02}.html">Kita pamoka →</a></div>' if n<4 else '<div class="next"><a href="index.html">Grįžti į modulį</a><p>Pažymėk savo lape, ką reikia pakartoti. Vien baigtos užduotys nepatvirtina visos temos įsisavinimo.</p></div>'
        (SITE/f'{l["id"]}.html').write_text(page(l['title'],body,l['id']))
        ws = prefix + '<p>Vardas ar klasės kodas (paliekama mokykloje): ____________________ Data: __________</p><p class="no-print">Spausdink naršyklėje: Ctrl+P. Šis lapas nepateikia mokytojo atsakymų.</p>'+intro
        if n==3:
            ws += '<section class="notice"><h2>Sauga</h2><p>'+esc(l['safety_lt'])+'</p></section>'
        for block in l['blocks']:
            if block['type'] in ['question','quantity-question','retrieval','table'] or (n==3 and block['id']=='method') or (n==4 and block['id']=='route'):
                ws += block_html(block,l,True)
        (SITE/f'{l["id"]}-worksheet.html').write_text(page(l['title']+' · užduoties lapas',ws,l['id'],'worksheet'))
        teacher = prefix + '<p class="kicker">Mokytojo gidas ir atsakymai</p>'+intro
        sections = [('Pasiruošimas',l['teacher']['preparation_lt']),('Priemonės','; '.join(l['equipment_lt'])),('Sauga',l['safety_lt']),('Siūlomas laikas',l['teacher']['timing_lt']),('Pagalba ir papildomos užduotys',l['teacher']['differentiation_lt']),('Aprėpties ribos',l['teacher']['scope_limit_lt'])]
        teacher += ''.join(f'<section class="block"><h2>{esc(t)}</h2><p>{esc(v)}</p></section>' for t,v in sections)
        teacher += '<section class="block"><h2>Stebėjimo kriterijai</h2><ul>'+''.join(f'<li>{esc(x)}</li>' for x in l['teacher']['rubric_lt'])+'</ul><p>Tai formuojamojo vertinimo kriterijai; jie automatiškai nepriskiria mokyklinio pažymio.</p></section>'
        teacher += '<section class="block"><h2>Dažnos klaidos</h2><ul>'+''.join(f'<li>{esc(x)}</li>' for x in l['teacher']['misconceptions_lt'])+'</ul></section>'
        for block in l['blocks']:
            if block['id'] in l['teacher']['answers_lt']:
                teacher += f'<section class="block"><h2>{esc(block["title_lt"])} · atsakymas</h2><p>{esc(l["teacher"]["answers_lt"][block["id"]])}</p></section>'
        teacher += '<p><a href="downloads/thermal-teacher-guide.pdf">Visų keturių pamokų mokytojo gidas · PDF</a></p>'
        (SITE/f'{l["id"]}-teacher.html').write_text(page(l['title']+' · mokytojui',teacher,l['id']))
        shutil.copyfile(SEED/'content'/f'{l["id"]}.json',SITE/'source'/f'{l["id"]}.json')
    home = f'<p class="kicker">Atvira mokykla · 9 klasė</p><h1>Šiluma: suprask, išmatuok, paaiškink.</h1><p class="lede">Keturios nemokamos fizikos pamokos apie temperatūrą, vidinę energiją, šilumos kiekį ir tyrimo duomenis. Mokykis savo tempu arba naudok su klase.</p><p class="notice">{NOTICE} Tai pirmoji šiluminės fizikos modulio dalis, ne visa 9 klasės programa.</p><div class="actions"><a class="button" href="g9-thermal-01.html">Pradėti pirmą pamoką</a><a class="button secondary" href="downloads/thermal-pupil-workbook.pdf">Užduoties lapai · PDF</a></div><div class="grid">'
    for l in LESSONS:
        home += f'<section class="card"><p class="kicker">Pamoka {int(l["id"][-2:])} · apie 30 min</p><h2><a href="{l["id"]}.html">{esc(l["title"])}</a></h2><p>{esc(l["objectives_lt"][0])}</p><p class="meta">Bandomoji versija</p></section>'
    home += '</div><section class="card"><h2>Su priemonėmis ir be jų</h2><p>3 pamoka siūlo mokytojo prižiūrimą matavimą. Jei priemonių nėra, gali suplanuoti tyrimą ir 4 pamokoje naudoti aiškiai pažymėtus iliustracinius duomenis. Šis kelias moko analizės, bet nepatvirtina praktinio matavimo gebėjimų.</p><p>Visas būtinas tekstas, lentelės, užduotys ir atsakymai veikia be paskyros ir be JavaScript. Skaitinė patikra ir modelio valdymas – papildomos priemonės. Duomenų nesiunčiame ir pažymių neprognozuojame.</p></section><section class="card"><h2>Mokytojui</h2><p><a href="teachers.html">Pamokų naudojimas, peržiūros ir bandymo klasėje paketas</a></p><p><a href="alignment.html">Ryšys su oficialia programa ir aprėpties ribos</a></p></section>'
    (SITE/'index.html').write_text(page('Šiluminės fizikos bandomasis modulis',home))
    teacher_home = f'<p class="kicker">Mokytojui</p><h1>Keturios pamokos, viena mokymosi seka</h1><p class="notice">{NOTICE} Praktinis protokolas turi būti išbandytas su mokyklos priemonėmis prieš mokinių darbą.</p><p>Siūloma seka: sąvokos → šilumos skaičiavimas ir grafikas → matavimas → duomenų analizė. Kiekvienos pamokos 30 min branduoliui numatytas 45 min laiko langas. Tikras laikas dar netikrintas.</p><ul>'
    teacher_home += ''.join(f'<li><a href="{l["id"]}-teacher.html">{esc(l["title"])}</a></li>' for l in LESSONS)+'</ul><div class="actions"><a class="button" href="downloads/thermal-teacher-guide.pdf">Mokytojo gidas · PDF</a><a class="button secondary" href="downloads/thermal-pupil-workbook.pdf">Mokinio lapai · PDF</a></div>'
    teacher_home += '<section class="card"><h2>Peržiūros ir bandymo paketas</h2><p><a href="review/REVIEW-PACK.md">Mokytojo peržiūros ir bandymo instrukcija</a></p><p><a href="review/lesson-review.csv">Pamokų peržiūros lentelė</a> · <a href="review/classroom-observation.csv">Pamokos stebėjimo lapas</a> · <a href="review/lab-run.csv">Fizinio bandymo įrašas</a></p><p>Nereikia mokinių vardų, nuotraukų ar prisijungimų. Užpildyti lapai lieka mokykloje; svetainė jų nerenka.</p></section><section class="card"><h2>Aprėptis ir pritaikymas</h2><p>Šis rinkinys neišsemia oficialios šiluminių reiškinių srities. Faziniai virsmai, nežinomos medžiagos savitoji šiluma, kuras, varikliai ir siurbliai bus vėlesnės pamokos. Pasirinkta maišymo veikla neleidžia paskelbti, kad išmatuota nežinoma savitoji šiluma.</p><p>Priemonių neturinčiai klasei siūlomas planavimo ir iliustracinės analizės kelias; C4 praktinių veiksmų įrodymus vertink tik tada, kai mokinys juos atliko. Bendrų priemonių atveju galima demonstracija ar rotacija, aiškiai nurodant, kas matavo.</p></section>'
    (SITE/'teachers.html').write_text(page('Mokytojo medžiaga',teacher_home))
    alignment = json.loads((ROOT/'curriculum/thermal-objectives.json').read_text())
    align = '<p class="kicker">Programa ir šaltiniai</p><h1>Ką apima šios keturios pamokos?</h1><p>Turinio autoritetas – oficiali Fizikos bendroji programa. Toliau pateiktas redaktoriaus parengtas dalinis ryšys su ja; mokytojo patvirtinimas dar negautas. Modelinis ilgalaikis planas siūlo seką ir laiką, kuriuos mokytojas gali keisti.</p><p class="source"><a href="https://emokykla.lt/bendrosios-programos/visos-bendrosios-programos/12">Oficiali Fizikos bendroji programa</a> · <a href="https://view.officeapps.live.com/op/view.aspx?src=https://www.emokykla.lt/upload/files/2026/08/17/fizikos-ilgalaikio-plano-9-i-gimnazijos-klasei-pavyzdys-2026-08-17.docx?r=1">2026-08-17 grade 9 modelinio plano peržiūra</a></p>'
    for row in alignment['objectives']:
        align += f'<section class="card"><p class="kicker">{esc(row["id"])}</p><h2>{esc(row["objective_lt"])}</h2><p>Programa: {esc(row["programme_title_lt"])}; pasiekimai: {esc(", ".join(row["achievements"]))}. Įrodymas: {esc(row["evidence_lt"])}</p><p class="meta">{esc(row["coverage_note_lt"])}</p></section>'
    align += '<section class="notice"><h2>Kas lieka vėlesnėms pamokoms?</h2><p>'+esc(alignment['remaining_scope_lt'])+'</p></section><p><a href="source/thermal-objectives.json">Pilnas objektyvų ir užduočių ryšys · JSON</a> · <a href="source/lesson.schema.json">Pamokos šaltinio schema</a></p><p>Originalios užduotys, tekstai ir modelis sukurti šiam projektui. Komercinių vadovėlių tekstai, iliustracijos ir uždaviniai nepublikuojami.</p>'
    (SITE/'alignment.html').write_text(page('Ryšys su programa',align))
    shutil.copyfile(ROOT/'curriculum/thermal-objectives.json',SITE/'source/thermal-objectives.json')
    shutil.copyfile(SEED/'schema/lesson.schema.json',SITE/'source/lesson.schema.json')
    for name in ['LICENSE','LICENSE-CONTENT.md']:
        shutil.copyfile(ROOT/name,SITE/name)
    (SITE/'LICENSE-CONTENT.md').write_text('# Mokomojo turinio licencija\n\nOriginalūs pamokų tekstai, užduotys ir duomenys: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0). https://creativecommons.org/licenses/by-sa/4.0/\n\nAutorystės nuoroda: Atvira mokykla — Fizika, Open School contributors.\n\nKodas ir schema: MIT (žr. LICENSE). Išoriniai šaltiniai išlaiko savo teises; ši publikacija jų vadovėlių ir dokumentų neperpublikuoja. [Ryšys su programa ir šaltiniai](alignment.html).\n')
    for file in (SEED/'review').iterdir():
        if file.is_file():
            (SITE/'review').mkdir(exist_ok=True)
            shutil.copyfile(file,SITE/'review'/file.name)
    (SITE/'.nojekyll').write_text('')


pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
STYLES = getSampleStyleSheet()
for name in ['Normal','BodyText','Title','Heading1','Heading2','Heading3']:
    STYLES[name].fontName = 'DejaVuBold' if name.startswith('Heading') or name=='Title' else 'DejaVu'
STYLES['BodyText'].fontSize=9.5; STYLES['BodyText'].leading=14; STYLES['BodyText'].spaceAfter=6
STYLES['Title'].fontSize=22; STYLES['Title'].leading=28; STYLES['Title'].alignment=TA_LEFT
STYLES['Heading1'].fontSize=17; STYLES['Heading1'].leading=22
STYLES['Heading2'].fontSize=12; STYLES['Heading2'].leading=16
STYLES.add(ParagraphStyle('Small',parent=STYLES['BodyText'],fontSize=8,leading=11))


def p(text, style='BodyText'):
    # PDF typography uses ASCII hyphens; Lithuanian glyphs come from embedded fonts.
    text = text.replace('–','-').replace('—','-').replace('\u2011','-')
    return Paragraph(esc(text).replace('\n','<br/>'),STYLES[style])


class Writing(Flowable):
    def __init__(self,lines):
        Flowable.__init__(self); self.width=178*mm; self.height=lines*5*mm
    def draw(self):
        self.canv.setStrokeColor(colors.HexColor('#b5c0c7')); self.canv.setLineWidth(.4)
        for y in range(0,int(self.height),int(5*mm)):
            self.canv.line(0,y,self.width,y)


class Grid(Flowable):
    def __init__(self):
        Flowable.__init__(self); self.width=168*mm; self.height=60*mm
    def draw(self):
        self.canv.setStrokeColor(colors.HexColor('#cfd8dc')); self.canv.setLineWidth(.35)
        for x in range(0,int(self.width),int(6*mm)):
            self.canv.line(x,0,x,self.height)
        for y in range(0,int(self.height),int(6*mm)):
            self.canv.line(0,y,self.width,y)


def pdf_table(block):
    data=[[p(c,'Small') for c in block['columns_lt']]]+[[p(lt(v),'Small') for v in row] for row in block['rows']]
    table=Table(data,colWidths=[178*mm/len(block['columns_lt'])]*len(block['columns_lt']),repeatRows=1,hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ecf0f2')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#a7b5bd')),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5)]))
    return table


def footer(canvas,doc):
    canvas.saveState(); canvas.setFont('DejaVu',7);canvas.setFillColor(colors.HexColor('#455661'))
    canvas.drawString(16*mm,12*mm,f'Atvira mokykla / Fizika | {RELEASE} | CC BY-SA 4.0 | '+PUBLIC)
    canvas.drawRightString(194*mm,8*mm,str(doc.page));canvas.restoreState()


def build_pdfs():
    PDF.mkdir(parents=True,exist_ok=True)
    for mode,name in [('pupil','thermal-pupil-workbook.pdf'),('teacher','thermal-teacher-guide.pdf')]:
        if mode=='teacher':
            STYLES['BodyText'].fontSize=9; STYLES['BodyText'].leading=12; STYLES['BodyText'].spaceAfter=4
            STYLES['Heading2'].leading=14; STYLES['Heading2'].spaceBefore=7; STYLES['Heading2'].spaceAfter=4
        story=[]
        for index,l in enumerate(LESSONS):
            if index:story.append(PageBreak())
            story.extend([p('9 klasė / Šiluminė fizika','Small'),p(f'{index+1}. '+l['title'],'Heading1'),p(NOTICE,'Small'),p('Mokinio užduoties lapas' if mode=='pupil' else 'Mokytojo gidas ir atsakymai','Heading2')])
            if mode=='pupil':story.append(p('Kodas arba vardas (lieka mokykloje): ____________________ Data: __________','Small'))
            story.append(p('Tikslai','Heading2'))
            story += [p('• '+o) for o in l['objectives_lt']]
            if mode=='teacher':
                for title,text in [('Pasiruošimas',l['teacher']['preparation_lt']),('Priemonės','; '.join(l['equipment_lt'])),('Sauga',l['safety_lt']),('Siūlomas laikas',l['teacher']['timing_lt']),('Pagalba ir papildomos užduotys',l['teacher']['differentiation_lt']),('Aprėpties ribos',l['teacher']['scope_limit_lt'])]:
                    story.append(KeepTogether([p(title,'Heading2'),p(text)]))
                story.append(KeepTogether([p('Stebėjimo kriterijai (ne automatiniai pažymiai)','Heading2')]+[p('• '+r) for r in l['teacher']['rubric_lt']]))
                story.append(KeepTogether([p('Dažnos klaidos','Heading2')]+[p('• '+r) for r in l['teacher']['misconceptions_lt']]))
                story.extend([PageBreak(),p(f'{index+1}. '+l['title']+' / Atsakymai','Heading1')])
                for block in l['blocks']:
                    answer=l['teacher']['answers_lt'].get(block['id'])
                    if answer:story.append(KeepTogether([p(block['title_lt'],'Heading3'),p(answer)]))
            else:
                if index==2:story.extend([p('Sauga','Heading2'),p(l['safety_lt'])])
                for block in l['blocks']:
                    if block['type'] not in ['question','quantity-question','retrieval','table'] and not (index==2 and block['id']=='method') and not (index==3 and block['id']=='route'):
                        continue
                    task=[p(block['title_lt'],'Heading2'),p(block.get('body_lt',''))]
                    if block['type']=='table':task.extend([pdf_table(block),Spacer(1,3*mm)])
                    if block.get('graph')=='blank':task.extend([Grid(),Spacer(1,3*mm)])
                    if block.get('worksheet_lines'):task.append(Writing(block['worksheet_lines']))
                    story.append(KeepTogether(task))
            story.extend([Spacer(1,4*mm),p('Pamokos puslapis: '+PUBLIC+l['id']+'.html','Small')])
        doc=SimpleDocTemplate(str(PDF/name),pagesize=A4,rightMargin=16*mm,leftMargin=16*mm,topMargin=16*mm,bottomMargin=20*mm,title='Atvira mokykla - Fizika: '+('mokinio lapai' if mode=='pupil' else 'mokytojo gidas'),author='Atvira mokykla')
        doc.build(story,onFirstPage=footer,onLaterPages=footer)
        shutil.copyfile(PDF/name,SITE/'downloads'/name)


if __name__=='__main__':
    assert len(LESSONS)==4
    build_html();build_pdfs()
    print('Built four pupil lessons, four worksheets, four teacher guides, module pages and two PDFs.')
