/**
 * Interface text in English and Lithuanian. Lesson content lives in the MDX files;
 * this file holds everything the components and the runtime say.
 */
export type Lang = 'en' | 'lt';
export const langFrom = (s?: string | null): Lang => ((s || '').toLowerCase().startsWith('lt') ? 'lt' : 'en');
/** The language of a page from its URL (Starlight puts Lithuanian under /lt/). */
export const langOfPath = (pathname: string): Lang => (/\/lt(\/|$)/.test(pathname) ? 'lt' : 'en');

/** Lithuanian plural: 1 pamoka, 2 pamokos, 10 pamokų, 21 pamoka. */
export function ltPlural(n: number, one: string, few: string, many: string) {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 9 && !(h >= 11 && h <= 19)) return few;
  return many;
}
const enPlural = (n: number, one: string, other: string) => (n === 1 ? one : other);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LT_NOM = ['sausis', 'vasaris', 'kovas', 'balandis', 'gegužė', 'birželis', 'liepa', 'rugpjūtis', 'rugsėjis', 'spalis', 'lapkritis', 'gruodis'];
const LT_GEN = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
const LT_ACC = ['sausį', 'vasarį', 'kovą', 'balandį', 'gegužę', 'birželį', 'liepą', 'rugpjūtį', 'rugsėjį', 'spalį', 'lapkritį', 'gruodį'];
/** When something happens: "September" → "rugsėjį"; "December–January" → "nuo gruodžio iki sausio". */
export function ltWhen(s: string) {
  const [a, b] = s.split('–').map((m) => MONTHS.indexOf(m.trim()));
  if (b !== undefined && a >= 0 && b >= 0) return `nuo ${LT_GEN[a]} iki ${LT_GEN[b]}`;
  return ltMonths(s, 'acc');
}
/** "September–January" → "rugsėjis–sausis" (nominative) or "rugsėjį" (when). */
export function ltMonths(s: string, form: 'nom' | 'acc') {
  return s.replace(/[A-Z][a-z]+/g, (m) => { const i = MONTHS.indexOf(m); return i < 0 ? m : (form === 'nom' ? LT_NOM : LT_ACC)[i]; });
}

const en = {
  // lesson blocks
  kind: { start: 'Goal', remember: 'Remember', hook: 'Hook', explore: 'Explore', explain: 'Explain', examples: 'Examples', check: 'Check', exam: 'Exam task', summary: 'Summary', teacher: 'Teacher notes' } as Record<string, string>,
  blockLabel: { start: 'Goal', remember: 'Remember', hook: 'Hook', explore: 'Explore', explain: 'Explain', examples: 'Worked examples', check: 'Check', exam: 'Exam task', summary: 'Summary', teacher: 'Teacher notes' } as Record<string, string>,
  // start card, "Your turn", "Next", quick refresh
  startTitle: 'In this lesson', byTheEndLesson: 'By the end of the lesson', needFromBefore: 'What you need from before',
  periodsTime: (p: number) => `${p} class ${enPlural(p, 'period', 'periods')} · about ${45 * p} min`,
  lessonShort: (u: number, n: number) => `Lesson ${u}.${n}`,
  quickRefresh: 'Quick refresh', yourTurnTitle: 'Your turn', nextUp: 'Next lesson',
  // lesson toolbar and end
  lessonSteps: 'Lesson steps', view: 'View', stepByStep: 'Step by step', showAll: 'Show all', projector: 'Projector', teacherNotes: 'Teacher notes',
  pdf: 'PDF', handout: 'Handout', handoutNote: 'lesson summary, examples', worksheet: 'Worksheet', worksheetNote: 'check items, exam task', key: 'Answer key', keyNote: 'answers, marking, teacher notes',
  doneLesson: 'I have done this lesson', doneHint: 'It ticks itself when you finish the check.',
  unitLessons: (n: number) => `Unit ${n} lessons`, nextTitle: (t: string) => `Next: ${t} →`, mistake: 'Found a mistake?', mistakeTitle: (t: string) => `Mistake in: ${t}`,
  whereLesson: 'Where this lesson is in the year', unitN: (n: number) => `Unit ${n}`, lessonNofM: (n: number, m: number) => `Lesson ${n} of ${m}`,
  // runtime
  back: 'Back', nextKind: (k: string) => `Next: ${k}`, endOfLesson: 'End of the lesson. Open a print view above; your browser can save it as PDF.', missingFigure: (id: string) => `Missing figure "${id}".`,
  stepsNav: 'Steps of the explanation', nextStep: 'Next step', seen: (a: number, b: number) => `${a}/${b} seen`,
  yourTurn: 'Your turn: write this step on paper, then compare.', showStep: 'Show the step',
  showSolution: 'Show worked solution', triesLeft: (n: number) => `${n} ${enPlural(n, 'try', 'tries')} left`, hint: (a: number, b: number) => `Hint (${a}/${b})`,
  correct: 'Correct.', tryAgain: 'Try again.', notThis: 'Not this one.', correctHighlighted: 'The correct answer is highlighted.', check: 'Check',
  wrongChosen: (n: number) => `${n} chosen ${enPlural(n, 'option is', 'options are')} wrong.`, missing: (n: number) => `${n} correct ${enPlural(n, 'option is', 'options are')} missing.`,
  allRight: 'All the right options, and only those.', correctOptionsHighlighted: 'The correct options are highlighted.',
  answer: 'Answer:', typeFirst: 'Type an answer first.',
  unreadable: 'I could not read that. Write numbers like 3.61 (or 3,61), roots as √13 or sqrt(13), fractions as 3/2, and two roots as 3 ± √2 (or 3 +- √2).',
  giveN: (n: number) => n > 1 ? `Give ${n} values, separated by ; (for example 3; −1.5).` : 'Give one value.',
  roundTo: (d: number) => `Give the value rounded to exactly ${d} decimal ${enPlural(d, 'place', 'places')}. This try does not count.`,
  notQuite: 'Not quite.', theAnswerIs: (a: string, sol: boolean) => `The answer is ${a}.${sol ? ' The worked solution is below.' : ''}`,
  placeholderOne: 'e.g. 5/2 or √7', placeholderMany: 'e.g. 3; −1.5',
  moveUp: 'Move up', moveDown: 'Move down', rightOrder: 'That is the right order.',
  outOfPlace: (n: number) => `Step ${n} is out of place. What must be true before this step can be done? Try again.`, correctOrder: 'This is the correct order.',
  needsFigure: 'This item needs a figure in the same block.', startTap: 'Start: tap the figure', tapNow: 'Tap the figure now', chooseList: 'Choose from a list instead',
  pointsList: 'Points to choose from', notThisPoint: 'Not this point. Try again.', markedOnFigure: 'It is now marked on the figure.', done: 'Done', shown: 'Shown',
  notThere: 'Not there. Use a hint if you need one, then tap again.', ambiguousFigure: 'Rotate until the points are clearly apart. This tap did not use an attempt.', writtenMark: 'I have written my solution: mark it', yourMark: (a: number, b: number) => `Your mark: ${a} / ${b} points`,
  // items
  itemType: { choice: 'Single choice', multi: 'Multiple select', numeric: 'Number entry', quantity: 'Number with unit', order: 'Put in order', mark: 'Mark on the figure', task: 'Full solution' } as Record<string, string>,
  level: ['', 'Level 1 · threshold', 'Level 2 · satisfactory', 'Level 3 · basic', 'Level 4 · advanced'],
  levelWord: ['', 'threshold', 'satisfactory', 'basic', 'advanced'],
  markingScheme: 'Marking scheme: tick what your solution has', workedSolution: 'Worked solution', pt: 'pt', yourTurnLabel: 'your turn',
  // lesson title tags
  course: { core: 'Common core', B: 'Course B', A: 'Course A' } as Record<string, string>,
  exam: { PUPP: 'PUPP', 'VBE-I': 'VBE Part I', 'VBE-II': 'VBE Part II' } as Record<string, string>,
  levels: (a: number, b: number, wa: string, wb: string) => `Levels ${a}–${b} · ${wa} to ${wb}`,
  minutes: (m: number) => `About ${m} min · ${Math.round(m / 45)} class ${enPlural(Math.round(m / 45), 'period', 'periods')}`,
  programme: 'Programme',
  // year plan
  semester: { autumn: 'Autumn semester', spring: 'Spring semester' } as Record<string, string>,
  planKind: { lesson: 'Lesson', review: 'Review', practice: 'Practice', check: 'Unit check', test: 'Test' } as Record<string, string>,
  months: (s: string) => s, when: (s: string) => `often taught in ${s}`, When: (s: string) => `Often taught in ${s}`,
  lessons: (n: number) => `${n} ${enPlural(n, 'lesson', 'lessons')}`, classPeriods: (n: number) => `${n} class periods`,
  yearMeta: (y: string, w: number, total: number) => `School year ${y} · ${w} physics lessons a week at school, about ${total} in the year`,
  makeMine: 'Make this my year', isMine: 'This is my year ✓',
  wholeYearTicked: 'The whole year: lessons you have ticked', lessonsTicked: 'Lessons ticked this year',
  orderNote: 'This is a proposed sequence aligned with the physics programme. Your school may teach them in another order: open the unit your class is on and press <b>My class is on this unit</b>. Next lesson then starts there.',
  availableOf: (a: number, b: number) => `${a} of ${b} available on the site`, notYet: 'Not on the site yet', planned: 'planned', lessonsPlanned: 'lessons being planned',
  classHere: 'Your class is here', endOf: (sem: string) => `end of the ${sem.toLowerCase()}`,
  yearFoot: (a: number, b: number) => `${a} of ${b} lessons are available on the site so far; the others are planned. You can tick any lesson when you have learnt it, in class or from your textbook. For teachers: the sequence and allocations are provisional; each unit links its programme scope. IDs beginning lt-physics are our registry IDs, not official paragraph numbers.`,
  nextLesson: 'Next lesson', openLesson: 'Open the lesson', openUnit: 'Open the unit', open: 'Open',
  nextLabel: (n: number, t: string, a: number, b: number) => `Unit ${n} · ${t} · lesson ${a} of ${b}`,
  notOnSite: 'This lesson is not on the site yet. Learn it in class or from your textbook, then tick it on the unit page.',
  finishedYear: 'You have finished the year.', finishedYearNote: 'Every lesson is ticked. Revise with the tests, or look ahead to next year.',
  thisWeek: 'This week', weekText: (n: number, g: number) => n >= g ? `${n} lessons this week: goal reached.` : `${n} of ${g} lessons this week.`,
  streak: (s: number) => s ? `${s} ${enPlural(s, 'week', 'weeks')} in a row with at least one lesson.` : 'Tick a lesson to start a streak of weeks.',
  goal: 'Your goal (optional)', goalOption: (n: number, school: boolean) => `${n} lessons a week${school ? ' (like school)' : ''}`,
  whereYouAre: 'Where you are', byTheEnd: 'By the end you can', needs: 'What you need from before', needsNote: 'A 5-minute check of these, with links to catch-up lessons, is being written.',
  lessonsH: 'Lessons', unitEmpty: 'The lessons for this unit are being planned. The unit is on the path so you can see the whole year.',
  tickNote: 'Tick a lesson when you have done it. Lessons on this site tick themselves when you finish their check. Your ticks stay in this browser.',
  pinUnit: 'My class is on this unit', pinnedUnit: 'My class is on this unit ✓', availableNote: (a: number, b: number) => `${a} of ${b} lessons are available on the site; the others are planned.`,
  doneAria: (t: string) => `Done: ${t}`, openAria: (t: string) => `Open: ${t}`, otherUnits: 'Other units', wholeYear: (t: string) => `${t}: the whole year`,
  unitTitle: (n: number, t: string) => `Unit ${n} · ${t}`, programmeItems: (c: string) => `programme ${c}`,
  // course choice
  courseIntro: 'In grades 11 and 12 you study maths in one of two courses. You chose it in the spring of grade 10. Pick yours:',
  courseAbout: { B: 'The general course (bendrasis): 4 lessons a week. For university admission, a B-course exam score counts ×0.7.', A: 'The extended course (išplėstinis): 6 lessons a week, with more algebra, vectors, integrals and probability. About six in ten pupils take it.' } as Record<string, string>,
  courseStats: (u: number, l: number, e: string) => `${u} units · ${l} lessons on the site so far · ${e}`, courseN: (c: string) => `Course ${c}`,
  gradeTitle: (g: number, gymn: string) => `Grade ${g} · ${gymn} gimnazijos klasė`,
  // print
  printKind: { handout: 'Handout', worksheet: 'Worksheet', key: 'Answer key' } as Record<string, string>, forTeachers: 'for teachers', interactive: 'Interactive version',
  name: 'Name', class: 'Class', date: 'Date', gradeN: (g: number) => `Grade ${g}`,
  // the school calendar (src/lib/calendar.mjs)
  weekN: (n: number) => `Week ${n}`, weekShort: (n: number) => `wk ${n}`,
  weeksShort: (a: number, b: number) => (a === b ? `wk ${a}` : `wk ${a}–${b}`),
  weekSlot: { reserve: 'Practice or revision', refresh: 'Targeted refresh', feedback: 'Test feedback' } as Record<string, string>,
  slotsNote: 'Items in italics are class periods for practice or revision; they have no page on the site.',
  weekPlan: 'Week by week', nextOnSite: 'Next lesson on the site', allOnSiteDone: 'You have ticked every lesson on the site so far.',
  partOf: (k: number, n: number) => `part ${k} of ${n}`,
  nextWeek: 'Next week', alsoThisWeek: 'Also that week', comingWeek: 'Coming week', afterThat: 'The week after', weekByWeek: 'Week by week',
  calendarNote: 'The dates are a guide: they follow the model plan and the 2026–27 school holidays, and your school may keep a different order or different holidays. If your class is on another unit, press "My class is on this unit" on that unit\'s page: "Next lesson on the site" then starts there.',
  preliminaryNote: 'The spring weeks are a first draft. They will be refined when the spring lessons are written.',
  yearNotStarted: 'The school year starts on 1 September. The first week:',
  yearOver: 'The school year is over. Have a good summer!',
  weekNote: (n: number, d: string) => `week ${n} · ${d}`,
};

type Dict = typeof en;

const lt: Dict = {
  kind: { start: 'Tikslas', remember: 'Prisimink', hook: 'Įžanga', explore: 'Tyrinėk', explain: 'Paaiškinimas', examples: 'Pavyzdžiai', check: 'Pasitikrink', exam: 'Egzamino užduotis', summary: 'Santrauka', teacher: 'Mokytojui' },
  blockLabel: { start: 'Tikslas', remember: 'Prisimink', hook: 'Įžanga', explore: 'Tyrinėk', explain: 'Paaiškinimas', examples: 'Sprendimo pavyzdžiai', check: 'Pasitikrink', exam: 'Egzamino užduotis', summary: 'Santrauka', teacher: 'Mokytojui' },
  startTitle: 'Šioje pamokoje', byTheEndLesson: 'Pamokos pabaigoje', needFromBefore: 'Ką reikia mokėti iš anksčiau',
  periodsTime: (p) => `${p} ${ltPlural(p, 'pamoka', 'pamokos', 'pamokų')} · apie ${45 * p} min`,
  lessonShort: (u, n) => `${u}.${n} pamoka`,
  quickRefresh: 'Greitas pakartojimas', yourTurnTitle: 'Tavo eilė', nextUp: 'Kitoje pamokoje',
  lessonSteps: 'Pamokos dalys', view: 'Rodinys', stepByStep: 'Po žingsnį', showAll: 'Rodyti viską', projector: 'Projektorius', teacherNotes: 'Pastabos mokytojui',
  pdf: 'PDF', handout: 'Konspektas', handoutNote: 'pamokos santrauka, pavyzdžiai', worksheet: 'Užduočių lapas', worksheetNote: 'pasitikrinimo ir egzamino užduotys', key: 'Atsakymai', keyNote: 'atsakymai, vertinimas, pastabos mokytojui',
  doneLesson: 'Šią pamoką atlikau', doneHint: 'Pažymima savaime, kai atlieki pasitikrinimą.',
  unitLessons: (n) => `${n} temos pamokos`, nextTitle: (t) => `Toliau: ${t} →`, mistake: 'Radai klaidą?', mistakeTitle: (t) => `Klaida: ${t}`,
  whereLesson: 'Šios pamokos vieta metų plane', unitN: (n) => `${n} tema`, lessonNofM: (n, m) => `${n} pamoka iš ${m}`,
  back: 'Atgal', nextKind: (k) => `Toliau: ${k}`, endOfLesson: 'Pamokos pabaiga. Viršuje atverk spausdinimo rodinį; naršyklėje gali išsaugoti PDF.', missingFigure: (id) => `Trūksta brėžinio „${id}“.`,
  stepsNav: 'Paaiškinimo žingsniai', nextStep: 'Kitas žingsnis', seen: (a, b) => `peržiūrėta ${a}/${b}`,
  yourTurn: 'Tavo eilė: užrašyk šį žingsnį sąsiuvinyje, tada palygink.', showStep: 'Rodyti žingsnį',
  showSolution: 'Rodyti sprendimą', triesLeft: (n) => `liko ${n} ${ltPlural(n, 'bandymas', 'bandymai', 'bandymų')}`, hint: (a, b) => `Užuomina (${a}/${b})`,
  correct: 'Teisingai.', tryAgain: 'Bandyk dar kartą.', notThis: 'Ne šis.', correctHighlighted: 'Teisingas atsakymas pažymėtas.', check: 'Tikrinti',
  wrongChosen: (n) => `Neteisingai pasirinktų variantų: ${n}.`,
  missing: (n) => `Trūksta ${n} ${ltPlural(n, 'teisingo varianto', 'teisingų variantų', 'teisingų variantų')}.`,
  allRight: 'Pasirinkai visus teisingus variantus ir tik juos.', correctOptionsHighlighted: 'Teisingi variantai pažymėti.',
  answer: 'Atsakymas:', typeFirst: 'Pirmiausia įrašyk atsakymą.',
  unreadable: 'Nepavyko perskaityti. Skaičius rašyk taip: 3,61, šaknis: √13 arba sqrt(13), trupmenas: 3/2, du sprendinius: 3 ± √2 (arba 3 +- √2).',
  giveN: (n) => n > 1 ? `Įrašyk ${n} reikšmes, atskirtas kabliataškiu (pavyzdžiui, 3; −1,5).` : 'Įrašyk vieną reikšmę.',
  roundTo: (d) => `Suapvalink tiksliai iki ${d} ${ltPlural(d, 'skaitmens', 'skaitmenų', 'skaitmenų')} po kablelio. Šis bandymas neskaičiuojamas.`,
  notQuite: 'Ne visai.', theAnswerIs: (a, sol) => `Atsakymas: ${a}.${sol ? ' Sprendimas pateiktas žemiau.' : ''}`,
  placeholderOne: 'pvz., 5/2 arba √7', placeholderMany: 'pvz., 3; −1,5',
  moveUp: 'Perkelti aukštyn', moveDown: 'Perkelti žemyn', rightOrder: 'Tvarka teisinga.',
  outOfPlace: (n) => `${n} žingsnis ne savo vietoje. Kas turi būti padaryta prieš jį? Bandyk dar kartą.`, correctOrder: 'Štai teisinga tvarka.',
  needsFigure: 'Šiai užduočiai reikia brėžinio tame pačiame bloke.', startTap: 'Pradėti: spustelk brėžinį', tapNow: 'Spustelk brėžinį', chooseList: 'Rinktis iš sąrašo',
  pointsList: 'Taškai, iš kurių renkiesi', notThisPoint: 'Ne šis taškas. Bandyk dar kartą.', markedOnFigure: 'Dabar jis pažymėtas brėžinyje.', done: 'Atlikta', shown: 'Parodyta',
  notThere: 'Ne ten. Jei reikia, pasinaudok užuomina ir spustelk dar kartą.', ambiguousFigure: 'Pasuk brėžinį, kad taškai aiškiai išsiskirtų. Šis spustelėjimas neatėmė bandymo.', writtenMark: 'Sprendimą užrašiau: įvertinti', yourMark: (a, b) => `Tavo įvertis: ${a} iš ${b} taškų`,
  itemType: { choice: 'Vienas atsakymas', multi: 'Keli atsakymai', numeric: 'Skaičius', quantity: 'Dydis ir vienetas', order: 'Sudėliok tvarka', mark: 'Pažymėk brėžinyje', task: 'Išsamus sprendimas' },
  level: ['', '1 lygis · slenkstinis', '2 lygis · patenkinamas', '3 lygis · pagrindinis', '4 lygis · aukštesnysis'],
  levelWord: ['', 'slenkstinis', 'patenkinamas', 'pagrindinis', 'aukštesnysis'],
  markingScheme: 'Vertinimas: pažymėk, ką tavo sprendime pavyko atlikti', workedSolution: 'Sprendimas', pt: 'tšk.', yourTurnLabel: 'tavo eilė',
  course: { core: 'Bendroji dalis', B: 'Bendrasis kursas', A: 'Išplėstinis kursas' },
  exam: { PUPP: 'PUPP', 'VBE-I': 'VBE I dalis', 'VBE-II': 'VBE II dalis' },
  levels: (a, b, wa, wb) => `${a}–${b} lygiai · nuo ${wa} iki ${wb}`,
  minutes: (m) => `Apie ${m} min · ${Math.round(m / 45)} ${ltPlural(Math.round(m / 45), 'pamoka', 'pamokos', 'pamokų')}`,
  programme: 'Programa',
  semester: { autumn: 'I pusmetis', spring: 'II pusmetis' },
  planKind: { lesson: 'Pamoka', review: 'Kartojimas', practice: 'Įtvirtinimas', check: 'Temos pasitikrinimas', test: 'Kontrolinis' },
  months: (s) => ltMonths(s, 'nom'), when: (s) => `dažniausiai mokomasi ${ltWhen(s)}`, When: (s) => `Dažniausiai mokomasi ${ltWhen(s)}`,
  lessons: (n) => `${n} ${ltPlural(n, 'pamoka', 'pamokos', 'pamokų')}`, classPeriods: (n) => `${n} ${ltPlural(n, 'pamoka', 'pamokos', 'pamokų')} klasėje`,
  yearMeta: (y, w, total) => `${y} mokslo metai · mokykloje ${w} fizikos ${ltPlural(w, 'pamoka', 'pamokos', 'pamokų')} per savaitę, apie ${total} per metus`,
  makeMine: 'Tai mano klasė', isMine: 'Tai mano klasė ✓',
  wholeYearTicked: 'Visi metai: pažymėtos pamokos', lessonsTicked: 'Šiais metais pažymėtos pamokos',
  orderNote: 'Tai siūloma temų seka pagal fizikos bendrąją programą. Tavo mokykloje tvarka gali būti kitokia: atsidaryk temą, kurią dabar mokotės, ir spustelk <b>Mano klasė mokosi šios temos</b>. Tada „Kita pamoka“ prasidės nuo jos.',
  availableOf: (a, b) => `svetainėje jau ${a} iš ${b}`, notYet: 'Svetainėje dar nėra', planned: 'planuojama', lessonsPlanned: 'pamokos rengiamos',
  classHere: 'Tavo klasė čia', endOf: (sem) => `${sem.replace('pusmetis', 'pusmečio')} pabaigoje`,
  yearFoot: (a, b) => `Svetainėje kol kas yra ${a} iš ${b} pamokų; kitos planuojamos. Bet kurią pamoką gali pažymėti, kai ją išmoksti klasėje ar iš vadovėlio. Mokytojams: temų seka ir valandos siūlomos; prie kiekvienos temos nurodyta programos aprėptis. lt-physics yra mūsų registro ID, ne oficialūs punktų numeriai.`,
  nextLesson: 'Kita pamoka', openLesson: 'Atidaryti pamoką', openUnit: 'Atidaryti temą', open: 'Atidaryti',
  nextLabel: (n, t, a, b) => `${n} tema · ${t} · ${a} pamoka iš ${b}`,
  notOnSite: 'Šios pamokos svetainėje dar nėra. Išmok ją klasėje ar iš vadovėlio, tada pažymėk temos puslapyje.',
  finishedYear: 'Metus baigei.', finishedYearNote: 'Visos pamokos pažymėtos. Pasikartok su kontroliniais arba pažvelk į kitus metus.',
  thisWeek: 'Šią savaitę', weekText: (n, g) => n >= g ? `Šią savaitę ${n} ${ltPlural(n, 'pamoka', 'pamokos', 'pamokų')}: tikslas pasiektas.` : `Šią savaitę ${n} iš ${g} pamokų.`,
  streak: (s) => s ? `${s} ${ltPlural(s, 'savaitė', 'savaitės', 'savaičių')} iš eilės bent su viena pamoka.` : 'Pažymėk pamoką ir pradėk savaičių seriją.',
  goal: 'Tavo tikslas (nebūtina)', goalOption: (n, school) => `${n} ${ltPlural(n, 'pamoka', 'pamokos', 'pamokų')} per savaitę${school ? ' (kaip mokykloje)' : ''}`,
  whereYouAre: 'Kur esi', byTheEnd: 'Temos pabaigoje mokėsi', needs: 'Ką reikia mokėti iš anksčiau', needsNote: 'Rengiamas 5 minučių pasitikrinimas su nuorodomis į pakartojimo pamokas.',
  lessonsH: 'Pamokos', unitEmpty: 'Šios temos pamokos dar rengiamos. Tema rodoma, kad matytum visus metus.',
  tickNote: 'Pažymėk pamoką, kai ją atliksi. Svetainės pamokos pažymimos savaime, kai atlieki jų pasitikrinimą. Žymės saugomos tik šioje naršyklėje.',
  pinUnit: 'Mano klasė mokosi šios temos', pinnedUnit: 'Mano klasė mokosi šios temos ✓', availableNote: (a, b) => `Svetainėje yra ${a} iš ${b} pamokų; kitos planuojamos.`,
  doneAria: (t) => `Atlikta: ${t}`, openAria: (t) => `Atidaryti: ${t}`, otherUnits: 'Kitos temos', wholeYear: (t) => `${t}: visi metai`,
  unitTitle: (n, t) => `${n} tema · ${t}`, programmeItems: (c) => `programa ${c}`,
  courseIntro: 'III ir IV gimnazijos klasėse matematikos mokaisi pagal vieną iš dviejų kursų. Jį pasirinkai II klasės pavasarį. Pasirink savo:',
  courseAbout: { B: 'Bendrasis kursas: 4 pamokos per savaitę. Stojant į aukštąsias mokyklas bendrojo kurso egzamino rezultatas dauginamas iš 0,7.', A: 'Išplėstinis kursas: 6 pamokos per savaitę, daugiau algebros, vektoriai, integralai ir tikimybės. Jį renkasi apie šeši iš dešimties mokinių.' },
  courseStats: (u, l, e) => `${u} ${ltPlural(u, 'tema', 'temos', 'temų')} · svetainėje ${l} ${ltPlural(l, 'pamoka', 'pamokos', 'pamokų')} · ${e}`, courseN: (c) => (c === 'A' ? 'Išplėstinis (A)' : 'Bendrasis (B)'),
  gradeTitle: (g, gymn) => `${g} (${gymn} gimnazijos) klasė`,
  printKind: { handout: 'Konspektas', worksheet: 'Užduočių lapas', key: 'Atsakymai' }, forTeachers: 'mokytojui', interactive: 'Interaktyvi versija',
  name: 'Vardas, pavardė', class: 'Klasė', date: 'Data', gradeN: (g) => `${['', '', '', '', '', '', '', '', '', 'I', 'II', 'III', 'IV'][g]} gimn. klasė`,
  weekN: (n) => `${n} savaitė`, weekShort: (n) => `${n} sav.`,
  weeksShort: (a, b) => (a === b ? `${a} sav.` : `${a}–${b} sav.`),
  weekSlot: { reserve: 'Kartojimas ar praktika', refresh: 'Tikslinis kartojimas', feedback: 'Kontrolinio darbo aptarimas' },
  slotsNote: 'Kursyvu pažymėtos pamokos skirtos kartojimui ar praktikai klasėje; svetainėje jų puslapių nėra.',
  weekPlan: 'Savaitė po savaitės', nextOnSite: 'Kita pamoka svetainėje', allOnSiteDone: 'Pažymėjai visas iki šiol svetainėje esančias pamokas.',
  partOf: (k, n) => `${k} dalis iš ${n}`,
  nextWeek: 'Kitą savaitę', alsoThisWeek: 'Tą savaitę dar', comingWeek: 'Ateinančią savaitę', afterThat: 'Dar kitą savaitę', weekByWeek: 'Savaitė po savaitės',
  calendarNote: 'Datos orientacinės: jos sudarytos pagal pavyzdinį planą ir 2026–2027 mokslo metų atostogas, o tavo mokykloje tvarka ar atostogos gali skirtis. Jei tavo klasė mokosi kitos temos, tos temos puslapyje paspausk „Mano klasė mokosi šios temos“: tada „Kita pamoka svetainėje“ prasidės nuo jos.',
  preliminaryNote: 'Pavasario savaitės kol kas preliminarios. Jos bus patikslintos, kai bus parengtos pavasario pamokos.',
  yearNotStarted: 'Mokslo metai prasideda rugsėjo 1 d. Pirmoji savaitė:',
  yearOver: 'Mokslo metai baigėsi. Gražių vasaros atostogų!',
  weekNote: (n, d) => `${n} savaitė · ${d}`,
};

export const UI: Record<Lang, Dict> = { en, lt };
export const ui = (lang: Lang) => UI[lang];
