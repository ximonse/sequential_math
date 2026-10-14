# MULTI

En frivillig aktivitet för att växla mellan två regler. Den nås som **MULTI**
i Fokuspunkten-menyn på elevens startsida och vid tillåtna aktivitetspauser.
Samma uppdragsvillkor (`breakGames: true`) gäller för samtliga aktiviteter.

## Regler och upplägg

En romb eller fyrkant innehåller två eller tre prickar. Positionen bestämmer
vilken regel som gäller:

- Överst, **FORM**: romb besvaras till vänster, fyrkant till höger.
- Nederst, **ANTAL**: två prickar besvaras till vänster, tre till höger.

Introduktionen ger fyra formuppgifter, fyra antalsuppgifter och åtta blandade
uppgifter. Den innehåller samtliga figurkombinationer och både upprepade
och bytta regler. Svensk återkoppling och svarsmappningen visas under
introduktionen; den påverkar inte resultatet från själva passet.

Eleven startar sedan ett tvåminuterspass. Uppgifterna blandas i block som
innehåller lika många av båda reglerna och samtliga kombinationer av form
och antal. Inledningen garanterar både en upprepad regel och ett regelbyte.
Eleven har fyra sekunder per uppgift. Fel och timeout ger ingen strafftid.

Vänster/höger skärmhalva är stora tryckytor; piltangenterna ger samma svar.
Det första svaret färdigställer uppgiften direkt. Nära dubbeltryck och
tangentrepetition räknas inte som nya svar. Avsluta ligger utanför tryckytorna.

När fliken döljs fryser den aktiva tiden. En obesvarad uppgift kasseras utan
resultat och visas igen efter uttryckligt Fortsätt. En redan besvarad uppgift
behålls även om fliken döljs under dess återkoppling. Vid 120 aktiva sekunder
avslutas passet; en ofärdig uppgift räknas inte. Eleven kan avbryta tidigare.

## Resultat och data

Resultatet visar rätt, fel, missade uppgifter och rättandel. Upprepade och
bytta regler redovisas separat med antal rätt/antal färdiga och medianen
för rätta svar. Första uppgiften saknar föregående regel och ingår inte i
någon av jämförelsegrupperna. Klassningen beräknas från faktiskt föregående
färdigställda uppgift, även när den besvarades fel eller fick timeout.

Allt finns endast i komponentens minne. Ingen resultatdata, ny API eller
profilschemamigrering införs; matematiklogg och mastery påverkas inte.
Eventuell lärarhistorik är en separat omfattningsfråga. Normal registrering
av öppnad/stängd aktivitetspaus återanvänds utan MULTI-resultat.

## Utformning och verifiering

Egna SVG-figurer med rundade hörn, rundade ytor och dämpad mint/blå palett.
Alla synliga instruktioner och resultattexter är svenska. CSS är avgränsad
till `.focus-activity` och använder fasta färger, utan sidtemats variabler
eller temamappade färgklasser. FOKUS/KONTROLLs körvy behåller sin svarta
bakgrund och fasta signaler.

Modelltester täcker båda reglerna, motstridiga ledtrådar, 4+4+8-introduktion,
balans, faktisk växling, dubbeltryck, fel/timeout, paus och passgräns.
Webbläsarrobotar täcker touch, tangentbord, svenska texter, resultat,
oförändrad matematikdata, återgång till samma läraruppdrag och fasta färger
i samtliga fem sidteman. Surfplattebilder har granskats visuellt.

Byggt lokalt 2026-10-14. 146 testfiler/703 tester och build passerar.
Hela robotsviten passerar: 100 av 100 prov, utan regelbrott. Lint för
ändrade kodfiler, arkitektur och projektkartans kontroll passerar också.
Touchhändelser har verifierats i webbläsaren; ingen fysisk elevplatta har
provats. Ändringen är lokalt verifierad och ännu inte publicerad.
