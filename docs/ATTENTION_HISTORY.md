# Historik för fokusaktiviteter

Simon godkände sparad lärarhistorik för FOKUS, KONTROLL och MULTI 2026-10-14,
efter den första produktionsversionen med tillfälliga resultat.

## Elev och lärare

Före aktivitetens start får eleven veta att passets resultat sparas till
läraren. Introduktioner sparas inte. Efter ett riktigt pass sparas en
sammanfattning automatiskt, även när eleven avbryter eller ingen signal
hinner färdigställas. Dolda flikar påverkar inte den aktiva tiden och
ofärdiga signaler ingår inte.

Resultatsidan skiljer mellan sparat till servern, sparat på enheten i väntan
på synkning och misslyckat sparande. Återförsök använder samma pass-ID.
Den lokala skrivningen färdigställs innan Tillbaka aktiveras; eleven kan
sedan lämna resultatsidan medan nätanropet slutförs. Nätfel kan
synkas genom återförsök eller nästa inloggning/omladdning med anslutning.
Vid lokal lagringsbrist visas fel och eleven kan försöka igen.
Ett pass som lämnas genom omladdning eller stängning innan resultatsidan
visas har ännu ingen sparad sammanfattning.

Lärarens **Elevprofil → Fokusaktiviteter** visar de senaste passen med
aktivitetsfilter och Visa fler. Varje pass visar datum/tid i Stockholm,
läge, aktiv tid, klart/avbrutet och respektive aktivitets resultat.
FOKUS/KONTROLL visar träffar, missade, för tidiga tryck, fel signal,
korrekt avstådda signaler i KONTROLL samt median för träffar. MULTI visar
rätt/fel/missade och antal rätt samt median för upprepade/bytta regler.
Saknade reaktionstider visas som –. Ingen norm, klassrankning, diagnos,
matematikjämförelse eller sammanvägt fokusbetyg införs.

## Lagringskontrakt

- `attention_result` använder befintlig autentiserad `/api/me/events` med
  cookie, betrodd origin och CSRF. Elev-ID hämtas från sessionen.
- Resultatet har ett stabilt UUID, version 1, läge, start/sluttid, aktiv
  tid, avbrottsflagga och validerad sammanfattning. Råa tryck, figurer och
  enskilda svar sparas inte. Endast de senaste 500 passen per elev behålls.
- Den befintliga krypterade IndexedDB-vaulten skriver snapshot och händelse
  atomärt innan nätanrop. Återförsök kontrollerar redan köad/kvitterad
  händelse i stället för att försöka skapa en dubbel lokal post.
- Servern skriver `attentionHistory` via befintlig CAS för elevprofilen.
  Samma pass-ID räknas en gång även om event-ID ändras vid återförsök.
  Ogiltiga typer, summeringar och tider avvisas utan partiell skrivning.
- Historiken är valfri i äldre profiler. Profilmerge förenar giltiga pass
  utan att skriva över en redan sparad version. Checkpoints saknar fältet
  och äldre profil-POST får inte ändra det: endast resultathändelser äger det.
- Befintlig behörighetskontroll för lärarens fulla elevprofil gäller även
  historiken. Listprofiler behöver inte bära resultathistorik. Elevradering
  följer befintlig profillivscykel.

Resultathändelsen ändrar inga matematiksvar, stats, mastery, adaptiva beslut
eller uppdragsprogression. Befintliga paushändelser är separata.

## Verifieringsstatus

Byggt lokalt. Kontroller omfattar validering, idempotens, merge/äldre
profiler, behörigheter, krypterad kö, nätfel, återförsök och oförändrade
matematikdata. Slutlig lokal verifiering 2026-10-14: 148 testfiler/712 tester
och hela robotsviten 104/104 passerar, utan regelbrott. Lint för nya och
ändrade historikfiler passerar; StudentHome har två befintliga hookvarningar.
Arkitektur och projektkarta passerar. Lärarhistorikens skärmbild har granskats.
Touch och tangentbord har provats i lokal webbläsare, inte fysisk elevplatta.
Produktionspublicering följer Simons begäran att publicera när allt är testat
och färdigt. Bekräftad produktionsrevision dokumenteras efter leveransen.
