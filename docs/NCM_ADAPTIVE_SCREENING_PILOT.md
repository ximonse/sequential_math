# Förslag: kort adaptiv kartläggning av skriftlig subtraktion

Datum: 2026-10-30. **Designförslag efter inventering, inte implementerat eller
didaktiskt kalibrerat med elever.** Ingen elevprofil ändras av dokumentet.

## Ryggrad och avgränsning

Hela [NCM-inventeringen](NCM_DIDACTIC_COVERAGE.md) och dess täckningslista
gäller. Den första piloten använder M02/N2 (AS2), med AG3 som relevant
förkunskapskontroll. Övriga 29 mappningar, G1–G9, B1–B7 och AG6-stegen ligger
kvar i den gemensamma listan och får inte försvinna i implementationen.

Valet motiveras av att appen redan har originaluppgifter för subtraktion,
sparat räknehäfte och två olika slutsvarsmodeller. Lokal läsning av
`C:/Users/ximon/AppData/Local/Temp/ncm_facit/AS2.pdf` och `AG3.pdf` bekräftar
AS2:s hänvisning till AG3 och dess tiotalsövergångar. Det bevisar inte att en
enskild elevs fel beror på just den förkunskapen. Ingen ny granskning av alla
andra facit eller bokens samtliga kapitel påstås.

Piloten undersöker ett preciserat delmoment: **en växling**, eller **växling
genom noll** när det tidigare underlaget motiverar det. Ett lyckat prov ger
inte beskedet ”kan hela AS2” eller ”kan subtraktion”. Detta är ett första
beslutsflöde att återanvända för senare bredd över flera områden.

## Tidigare arbete som startpunkt

Läs relevanta tränings- och screeningposter med period, källrevision och
frågekontext. Använd fungerande exempel, fel, motexempel och synligt arbete.
Räkna samma observation en gång. Ett nytt försök på samma uppgift är inte
automatiskt ett oberoende bekräftande exempel.

| Tillgängligt underlag | Inträde i kartläggningen |
|---|---|
| Flera jämförbara, aktuella fungerande exempel på det valda delmomentet, utan olöst motsägelse | Högst en ny, särskiljande bekräftelse. Eleven ska inte behöva göra om ett helt häfte. |
| En återkommande svarstyp eller synligt osäkert växlingssteg | Börja med en kärnkontrast och förbered alternativ förklaring; inte en färdig diagnos. |
| Fel först efter nivåhöjning, större tal eller nollor | Pröva gränsen mellan fungerande och nytt delmoment. Återtesta inte grundnivån slentrianmässigt. |
| Saknad, gammal, motsägelsefull eller ofullständig historik | Markera underlag saknas/är osäkert. Börja med kort baslinje och kontrast; dra ingen slutsats om brist i förväg. |

”Aktuell” och minsta historiska omfattning är ännu inte numeriskt
kalibrerade. Använd inte en påhittad sannolikhet eller en generell
85-procentsgräns som automatisk diagnostisk stoppregel. I den första
prototypen ska vald historik och skälet att den räknas visas för läraren.

## Frågebank och kontrollerade svarskontraster

Använd befintliga originaluppgifter när de fyller syftet. Växla till annan
parallell uppgift om eleven nyligen sett exakt samma fråga. Egen fråga måste
få kontrollerat facit och kontrollerade kontraster före sparande.

| Roll / befintligt taskId | Fråga | Rätt | Större siffra minus mindre per kolumn | Noll i kolumn där växling krävs |
|---|---|---:|---:|---:|
| Baslinje `sub-no-exchange-001` | 764 − 231 | 533 | 533 | 533 |
| Parallell baslinje `sub-no-exchange-002` | 986 − 452 | 534 | 534 | 534 |
| Kontrast `sub-exchange-001` | 642 − 217 | 425 | 435 | 430 |
| Parallell kontrast `sub-exchange-002` | 753 − 428 | 325 | 335 | 330 |
| Genom noll `sub-through-zero-001` | 402 − 178 | 224 | 376 | 300 |
| Parallell genom noll `sub-through-zero-002` | 503 − 267 | 236 | 364 | 300 |

[Syntetiska funktionsprov](evaluations/ncm-didactic-2026-10-30/synthetic-probes.json)
kontrollerar aritmetiken, de två modellerna och befintliga motorns faktiska
träffar. De fyra kontrastfrågorna särskiljer dessa modeller. **De två
baslinjerna gör det inte** och får därför inte användas för att utesluta
missuppfattningen, även om de är rätt besvarade.

Exempel på egna AG3-kontroller är 13 − 8 = 5 och 14 − 6 = 8. De prövar
tiotalsövergång i mindre talområde. De är förslag, inte återgivna
NCM-originaluppgifter eller en validerad diagnos. Välj två om den första
ger osäkert underlag och budgeten tillåter. Låt eleven visa eller förklara
strategin; snabbhet ensam avgör inte förståelse.

Räknehäfte används för metodfrågorna. Vid huvudräkningskontroll ska
arbetsytan inte tvinga fram uppställning. Ritad markering, tomt svarsfält
och sparad uträkning hålls isär. Ingen generell automatisk tolkning av
frihand eller handstil förutsätts.

## Beslutsflöde, högst fem nya frågor per pilotpass

Detta är en föreslagen säker arbetsbudget, inte en forskningsvaliderad
testlängd. Vanlig väg är 2–4 frågor; full budget behövs bara vid osäkerhet.

1. Välj delmoment och inträde från historiken. Gör baslinje bara när den
   behövs för att tolka kommande svar.
2. Ge en kärnkontrast. Vid rätt svar: använd en oberoende parallell kontrast
   om tillräckligt jämförbart historiskt stöd saknas. Beakta synligt arbete.
3. Vid fel eller motsägelse: välj **antingen** relevant förkunskapskontroll
   **eller** parallell kontrast efter vilken osäkerhet som återstår. Ställ
   inte fler likadana frågor enbart för att öka antalet.
4. Om AG3 fungerar men skriftlig växling återkommande fallerar: rapportera
   skillnaden och föreslå uppföljning av växling/representation. Om båda är
   osäkra: prioritera uppföljning av förkunskap utan att fastställa orsak.
5. Avsluta så snart frågeställningen fått tillräckligt motiverat stöd,
   eleven behöver lärargranskning eller femfrågebudgeten nås. Vid kvarvarande
   osäkerhet ska osäkerheten stå kvar; generera inte ett besked för att passet
   tog slut.

Stoppa inte mitt i ett osparat svar. Serverbekräftat sparande och elevens
möjlighet att avsluta ska bevaras. Läraren väljer/startar processen; appen
ska inte i bakgrunden dela ut nya kartläggningar eller ändra fri träning.

## Stoppbesked som läraren kan granska

| Utfall | Villkor i pilotförslaget | Nästa steg |
|---|---|---|
| Tillräckligt stöd för just prövat delmoment | Två olika särskiljande exempel, varav ett kan vara relevant historiskt exempel, och inga olösta motsägelser i tillgängligt arbete | Avsluta delmomentet i detta pass. Ingen automatisk mastery eller slutsats om oprövade förmågor. Detta antal är en pilotregel som ska prövas didaktiskt. |
| Behöver undersökas | Fel, motsägelse mellan svar och arbete, återkommande modellförenligt svar eller bristande jämförbarhet | Välj särskiljande kontrast/förkunskap om budget finns, annars lämna tydlig lärarfråga. |
| Otillräckligt underlag | Obesvarat, avbrott, få/otydliga observationer, behov av manuell tolkning eller slut på budget | Ingen negativ förmågeklassning. Visa vad som saknas. |

Rätt svar med felaktigt synligt resonemang ska redovisas som en motsägelse,
inte gömmas bakom en rättmarkering. Ett modellförenligt felsvar är en
observation att undersöka; det bevisar inte att eleven följde modellen.

## Granskningsfall före verklig pilot

| Syntetiskt fall | Förväntat beslut |
|---|---|
| Ny elev: baslinje rätt, 642−217=435 | Baslinjen utesluter inget. Undersök per-kolumn-hypotes kontra förkunskap. |
| Relevant historik och ny kontrast rätt, förenlig synlig metod | Avsluta delmomentet; ge inte resten av samma frågepaket. |
| Slutsvar rätt, synligt resonemang fel eller oklart | Behåll osäkerheten och föreslå kort förklaring/kontrast. |
| 642−217=430 och motsvarande parallell modellträff | Visa återkommande nollkolumnssvar; ställ fråga om växlingen. Fastställ inte en generell ”kan inte låna”-diagnos. |
| AG3 rätt men två skriftliga kontraster fel | Särskilj fungerande mindre-tal-beräkning från skriftlig representation/metod. |
| AG3 fel: 13−8=2 | Bevara felsvaret. Motorns place_value_error är för specifik här och får inte styra nästa gren som säker orsak. |
| Sparat arbete men tomt svar, eller nätavbrott | Separera arbete från inlämnat svar. Spara/bevara; ingen automatisk kunskapsbrist. |
| Högst fem frågor, fortfarande motsägelsefullt | Avsluta med kvarstående osäkerhet och lärarfråga. |

## Vad som återstår före automatisk elevprocess

- Gör en liten syntetisk beslutsprototyp som kontrollerar fallen ovan och
  att frågebudget, motexempel och snabba stopp respekteras.
- Rätta och verifiera felmodellernas alltför specifika träffar innan sådana
  signaler får fatta automatiska diagnostiska beslut. Befintliga signaler
  förblir observationer med källursprung; äldre analyser skrivs inte om.
- Bestäm hur en screeningobservation och dess separata metodanalys ska
  representeras. Screeningens nuvarande tomma patterns-lista får inte fyllas
  med påhittade träningssignaler eller kopierade kodnamn.
- Låt en versionsbunden beslutsregel välja bland lärargranskade frågor.
  Fri AI-text ska inte ensam fastställa stopp, förmågestatus eller diagnos.
- Granska ett uttryckligt valt verkligt elevfall mot frågevalen och låt
  läraren bedöma om flödet skiljer de avsedda förklaringarna åt. Ingen
  effekt-/validitetsstudie eller verklig elevprovning har gjorts här.

Förslag till framtida teknisk grund: behåll befintliga uppgifter, sparande,
observationer och MCP-läsningar. Lägg en liten, versionsbestämd beslutsdel
ovanpå dessa. Historiken ska påverka vad som behöver prövas, men
diagnostic_only förblir separat från vanlig progression och mastery.
