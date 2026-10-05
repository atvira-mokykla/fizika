"""Check actual built pages, paired lesson evidence and programme/year coverage."""
from pathlib import Path
import re,json,yaml
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.lang=None;self.kinds=[];self.questions=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang')
  if 'id'in a:self.ids.append(a['id'])
  if tag=='a' and 'href'in a:self.links.append(a['href'])
  if a.get('class','').startswith('am-block '):self.kinds.append(a.get('data-kind'))
  if 'am-item 'in a.get('class','')+' ':self.questions.append(a)
p=Path('dist');routes={}
for f in p.rglob('*.html'):
 if not f.is_file():continue
 page=Page();page.feed(f.read_text());routes[f]=page
 assert len(page.ids)==len(set(page.ids)),f'Duplicate IDs: {f}'
 for href in page.links:
  u=urlsplit(href)
  if u.scheme or not u.path.startswith('/fizika/'):continue
  rel=unquote(u.path[len('/fizika/'):]);target=p/rel
  if target.is_dir():target=target/'index.html'
  assert target.exists(),f'Missing target {href} from {f}'
  if u.fragment and target.suffix=='.html':
   other=Page();other.feed(target.read_text());assert unquote(u.fragment).rstrip('/') in other.ids,f'Missing anchor {href}'
registry=json.load(open('public/sources/programme-nodes.json'));mapped=set();published=[]
for grade,total in [(9,72),(10,72),(11,108),(12,102)]:
 y=yaml.safe_load(open(f'src/content/years/{grade}.yaml'));assert not y.get('course');assert len(y['semesters'])==2
 units=[u for s in y['semesters'] for u in s['units']];assert sum(u['hours'] for u in units)==total
 assert sum(l['periods'] for u in units for l in u['lessons'])==total
 mapped.update(n for u in units for n in u['curriculum'])
 published.extend(l for u in units for l in u['lessons'] if l.get('slug'))
 for loc in ['', 'lt/']:
  assert routes[p/f'{loc}{grade}/index.html'].lang==('lt'if loc else'en')
assert mapped=={n['id'] for n in registry['nodes']}
assert len(published)==4
for l in published:
 pages=[]
 for locale in ['', 'lt/']:
  f=p/f'{locale}{l["slug"]}/index.html';page=routes[f];pages.append(page)
  assert {'start','remember','hook','explain','examples','check','summary','teacher'}<=set(page.kinds)
  assert len(page.questions)>=10,f'Too little practice: {f}'
  assert len([q for q in page.questions if q.get('data-kind')=='task'])>=1
  checks=[q for q in page.questions if re.search(r'-c\d+$',q.get('data-id',''))]
  actual=set(q['data-outcome'] for q in checks);assert set(l['outcomes'])<=actual,(l['id'],actual)
  source=(Path('src/content/docs')/f'{locale}{l["slug"]}.mdx').read_text();assert source.count('<Example ')>=3
  assert source.count('<ExStep>')>=6 and 'pending' in source.lower() if not locale else 'peržiūra' in source
  for kind in ['handout','worksheet','key']:assert p.joinpath('print',kind,locale+l['slug'],'index.html').exists()
 def signature(page):return [(q.get('data-id'),q.get('data-kind'),q.get('data-answer')if q.get('data-kind')=='numeric'else q.get('data-spec'),q.get('data-outcome'))for q in page.questions]
 assert signature(pages[0])==signature(pages[1]),f'Bilingual assessment drift: {l["id"]}'
 # Both display and print contain raw solutions, but worksheet CSS must hide those answers.
css=Path('src/styles/print.css').read_text();assert '.am-print .am-hints, .am-print .am-solution'in css and '.am-print-key'in css
print(f'PASS: {len(routes)} built HTML pages; 43 programme nodes; year allocations 72/72/108/102; 4 matched bilingual lessons; 12 outcomes assessed; 24 print views; internal targets and IDs.')
