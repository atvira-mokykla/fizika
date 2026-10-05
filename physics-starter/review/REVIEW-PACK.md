# Keturių bandomųjų pamokų peržiūra

Tikslas: nemokama, aukštos kokybės fizikos medžiaga visoms Lietuvos mokykloms. Versija 0.2.0-trial, 2026-10-04. **Praktikuojančio mokytojo peržiūra ir bandymas klasėje dar neatlikti.** Publikacija pažymėta bandomąja; ji nėra mokslinio ar pedagoginio patvirtinimo įrodymas.

## Ką peržiūrėti

Reikalingos dvi peržiūros atsakomybės: fizikos teisingumas ir Lietuvos klasės praktika/kalba. Bent vienas vertintojas turi būti praktikuojantis Lietuvos fizikos mokytojas. LLM pastabos gali padėti redaktoriui, bet nėra šių žmonių parašai. Peržiūros lentelėje rašomas vaidmuo; asmens vardas fiksuojamas tik jam sutikus.

Kiekvienai pamokai patikrinkite:

1. Ar fizika, formulės, vienetai, temperatūrų skirtumai ir ženklų sutartis teisingi?
2. Ar paaiškinimas suprantamas devintokui ir vartojami tinkami lietuviški terminai?
3. Ar tikslai ir užduotys siejasi su oficialia programa; ar dalinė aprėptis sąžiningai pažymėta?
4. Ar pakanka pradinių žinių? Ar 30 min branduolys realistiškas 45 min pamokoje?
5. Ar galima naudoti popieriuje, mažame ekrane ir be JavaScript? Ar būtina užduotis nereikalauja mokamo šaltinio?
6. Ar atsakymai padeda paaiškinti klaidą; ar rašytini argumentai vertinami žmogaus?
7. Ar 3 pamokos priemonės, vandens temperatūra ir darbo eiga tinkamos konkrečiai mokyklai?

Naudokite `lesson-review.csv`. Sprendimas: „taisyti“, „tinka ribotam bandymui“ arba „tinka po nurodytų pataisų“. Neskirkite mokyklinio pažymio svetainei ar mokiniui pagal automatinę patikrą.

## Pirmiausia išbandyti praktinį protokolą

Prieš mokinių darbą mokytojas atlieka maišymo bandymą su savo įranga. Patikrina vandens temperatūrą (siūlomame protokole ne daugiau kaip 40 °C), indų stabilumą, rodmens delsą, dviejų bandymų ir sutvarkymo laiką. Jei sąlygos netinka, pasirenka demonstraciją, rotaciją arba planavimo/iliustracinės analizės kelią. Tai turi būti įrašyta, nes šie keliai pateikia skirtingus praktinių gebėjimų įrodymus.

`lab-run.csv` yra TUŠČIAS tikrų duomenų šablonas. Įrašykite faktines mases ir temperatūras, prietaisų skyrą, tikslumą (jei žinomas), laiką ir metodo pakeitimus. Nepakeiskite rodmenų laukiamais skaičiais. Vien šis šablonas nėra atlikto bandymo įrodymas.

## Bandymas klasėje

Siekiame grįžtamojo ryšio iš skirtingų mokyklų: skirtinga įranga, ryšys ir mokymo seka. Dalyvavimas dar nesutartas. Pirmam ribotam bandymui užtenka aiškiai aprašyti tikrai dalyvavusią klasę ir vėliau plėsti kontekstus.

Užpildykite `classroom-observation.csv`: faktinis laikas, užduotys, kurių nespėta, netikėtos klaidos, prieigos kliūtys ir konkretūs pakeitimai. Nereikia mokinių vardų, tikslių gimimo datų, nuotraukų ar prisijungimų. Duomenų svetainė automatiškai nerenka; mokyklos lapai lieka mokykloje. Viešai skelbiama tik suderinta apibendrinta informacija.

Prieš ir po modulio galima naudoti trumpas lygiavertes užduotis:

- Prieš: palyginti skirtingos masės tos pačios temperatūros vandenį; po: tą patį argumentą pritaikyti kitam vandens kiekiui.
- Prieš: apskaičiuoti 0,10 kg vandens šildymą 5 K; po: apskaičiuoti 0,20 kg vandens šildymą 5 K, abiem atvejais pateikus c = 4200 J/(kg·K).
- Prieš: perskaityti temperatūros lentelę; po: įvardyti grafiko ašis ir vienetus, paaiškinti kitimą.
- Po: paaiškinti, kodėl vandens energijos apskaitos skirtumas nereiškia energijos išnykimo.

Vertinimo įrodymuose atskirai žymėti paaiškinimą, vienetus, skaičiavimą, duomenų kilmę ir praktinius veiksmus. Vienas teisingas atsakymas nepatvirtina visos temos įsisavinimo. Tai siūlomas formuojamojo vertinimo protokolas, ne validuotas tyrimo instrumentas.

## Po peržiūros

Užregistruokite reikalingas pataisas, redaguokite JSON pamokos šaltinį ir iš naujo sugeneruokite puslapį, lapą bei gidą. Pateikite pataisytą versiją vertintojui. Peržiūros statusą keiskite tik gavę tikrą sprendimą ir įrodymus. Fizinis bandymas, žmogaus peržiūra ir klasės bandymas yra atskiros būsenos.
