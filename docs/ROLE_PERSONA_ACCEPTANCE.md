# Rollbaserat acceptanstest

Syfte: granska appen utifrån varje faktisk användares mål, vardagsflöde och
behörighetsgräns. Kör med syntetiska konton och elevdata lokalt. Productiondata
ska aldrig användas för testkonton eller testförsök.

## Huvudadmin

**Systemets syfte:** äga skolans konto- och återställningsansvar utan att behöva
leta i pedagogiska vyer.

**Viktigt i upplevelsen:** tydligt eget namn och kontotyp, omedelbar indikator
för datakälla, säker hantering av lärarkonton och återställningsflöde.

**Acceptansflöde:**

1. Logga in och se namn, `Huvudadmin` och synkstatus i sidhuvudet.
2. Öppna Administration och verifiera lärarkonton, klasser och elevkort.
3. Återställ ett lärarkonto och bekräfta att tidigare session blir ogiltig.
4. Verifiera att huvudadmin inte kan förväxlas med en elev- eller lärarsession.

## Administratör

**Systemets syfte:** sköta vardagsdrift för flera klasser och lärare.

**Viktigt i upplevelsen:** kunna nå klasser, elevkort och läraradministration
utan att tappa pedagogisk överblick.

**Acceptansflöde:**

1. Logga in och se namn, `Administratör` och orange arbetsyta.
2. Växla mellan Framsteg, Uppdrag & tickets, Statistik & stöd och Administration.
3. Skapa och hantera en syntetisk klass samt ett namn-fritt pilotroster.
4. Kontrollera att sessionen spärras vid lösenords- eller behörighetsändring.

## Lärare

**Systemets syfte:** hitta nästa undervisningssteg för egna klasser under och
efter lektionen.

**Viktigt i upplevelsen:** snabb gruppsignal, elevdetalj vid behov, uppdrag och
hjälpbehov; inga andra lärares elever eller lärarkontoadministration.

**Acceptansflöde:**

1. Logga in och se namn, `Lärare` och grön arbetsyta.
2. Se enbart tilldelade syntetiska klasser och öppna en elevdetalj.
3. Skapa ett uppdrag och läs ticket- och stödsignaler.
4. Försök läsa, skriva och flytta en elev utanför tilldelad klass; varje försök
   ska nekas av API:t.
5. Öppna Administration och verifiera att lärarkonto-kontroller saknas.

## Elev

**Systemets syfte:** träna matematik tryggt och snabbt utan provkänsla.

**Viktigt i upplevelsen:** QR-kod + fyrsiffrig PIN, få steg till första talet,
tydlig återkoppling, och bevarad progression efter hård uppdatering.

**Acceptansflöde:**

1. Växla till QR-inloggning och bekräfta att bara PIN visas efter skanning.
2. Logga in med syntetiskt elevkort och starta träning.
3. Svara rätt och fel; kontrollera feedback och anpassning.
4. Öppna en ticket och verifiera att svar/korrekt svar inte läcker före inlämning.
5. Hårduppdatera och verifiera att session och redan sparade svar återställs.
6. Försök nå annan elevs URL eller lärarens URL; åtkomst ska nekas eller omdirigeras.

## Resultat och kända gränser, 2026-09-13

- **Webbläsare, huvudadmin:** lokalt testat. Sidhuvudet visar `Lokal lärare`,
  `Huvudadmin`, röd synkstatus och alla fyra arbetslägen.
- **Webbläsare, admin:** lokalt testat. Sidhuvudet visar syntetiska `Rut Admin`,
  `Administratör`; administrationsläget visar lärarkonto-kontroller.
- **Webbläsare, lärare:** lokalt testat. Sidhuvudet visar syntetiska
  `Leila Larare`, `Lärare` och grön arbetsyta. Den riktiga lärarkontopanelen
  renderas inte, men informationsrutan med rubriken `Lärarkonton` visas ändå;
  det är en språk-/hierarkiförvirring att åtgärda separat.
- **Webbläsare, elev:** lokalt testat fram till inloggning. Växling till
  elevkort visar QR-skanningsknapp och enbart fyrsiffrig PIN.
- **API-/kontrakttest:** befintliga testfall verifierar pilot QR+PIN, sessionens
  klassgräns, förhindrad åtkomst till annan elev, CSRF/origin och att ticketens
  facit inte skickas till elevklienten före svar.
- **Viktig säkerhetsgräns:** `isPrimaryAdmin` är endast en visningsmarkering.
  Både huvudadmin och administratör auktoriseras i nuläget med samma `isAdmin`.
  En verklig behörighetshierarki kräver ett uttryckligt serverkontrakt och ska
  inte antydas enbart genom färg eller etikett.
