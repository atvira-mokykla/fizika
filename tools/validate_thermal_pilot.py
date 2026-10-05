#!/usr/bin/env python3
"""Validate the release bundle and independent physics/content consistency checks."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlparse,unquote
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'physics-starter/site'

class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.targets=[];self.ids=[];self.lang=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')=='lt'
        if 'id' in a:self.ids.append(a['id'])
        for key in ['href','src']:
            if key in a:self.targets.append(a[key])

def main():
    lessons=[json.loads(p.read_text()) for p in sorted((ROOT/'physics-starter/content').glob('*.json'))]
    assert len(lessons)==4
    objectives=json.loads((ROOT/'curriculum/thermal-objectives.json').read_text())['objectives']
    assert len(objectives)==sum(len(l['objectives_lt']) for l in lessons)==12
    for lesson in lessons:
        mapped=[o for o in objectives if o['lesson_id']==lesson['id']]
        assert len(mapped)==len(lesson['objectives_lt'])
        blocks={b['id']:b for b in lesson['blocks']}
        for row in mapped:
            assert row['objective_lt']==lesson['objectives_lt'][row['objective_index']]
            assert set(row['evidence_blocks'])<=set(blocks)
            assert all(code[0] in lesson['achievement_areas'] for code in row['achievements'])
        for b in lesson['blocks']:
            if b['type'] in ['question','retrieval','quantity-question']:
                assert b['id'] in lesson['teacher']['answers_lt'],(lesson['id'],b['id'])
        assert all('pending' in status for status in lesson['review'].values())
        for suffix in ['', '-worksheet','-teacher']:
            assert (SITE/(lesson['id']+suffix+'.html')).exists()
        worksheet=(SITE/(lesson['id']+'-worksheet.html')).read_text()
        assert '<details>' not in worksheet and 'data-checker' not in worksheet
    for path in SITE.rglob('*.html'):
        parser=Links();parser.feed(path.read_text())
        assert parser.lang and len(parser.ids)==len(set(parser.ids)),path
        assert 'Bandomoji' in path.read_text() or path.name=='alignment.html'
        for target in parser.targets:
            url=urlparse(target)
            if url.scheme or url.netloc:continue
            local=(path.parent/unquote(url.path)).resolve()
            assert local.is_relative_to(SITE),target
            assert local.exists(),(path.name,target)
    # Warm-water and cool-water accounting independently uses explicit mass/energy.
    mix=json.loads((ROOT/'physics-starter/content/g9-thermal-04.json').read_text())
    table=next(b for b in mix['blocks'] if b['id']=='example-data')['rows']
    expected=[(3864,4536,672),(3948,4452,504)]
    for row,answer in zip(table,expected):
        tc=.1*4200*(row[1]-20);tw=.1*4200*(40-row[1])
        assert all(abs(x-y)<1e-8 for x,y in zip((tc,tw,tw-tc),answer))
    for path in (ROOT/'output/pdf').glob('thermal-*.pdf'):
        pages=PdfReader(path).pages
        assert len(pages)>=4
        text='\n'.join(p.extract_text() for p in pages)
        assert all(l['title'].replace('–','-') in text for l in lessons)
        assert 'Bandomoji' in text and '0.2.0-trial' in text
        assert '\ufffd' not in text
    report={'result':'passed','lesson_count':4,'objective_count':12,'html_pages':len(list(SITE.glob('*.html'))),'checks':['objective/evidence/source consistency','answer coverage','honest pending human review','worksheet answers absent','Lithuanian HTML, unique IDs and all local resources','independent heat-balance quantities','PDF text completeness'],'limits':'Human review, actual physical measurement and classroom timing remain pending.'}
    (ROOT/'research').mkdir(exist_ok=True)
    (ROOT/'research/thermal-pilot-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
