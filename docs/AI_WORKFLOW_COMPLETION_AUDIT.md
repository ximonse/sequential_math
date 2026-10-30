# Avstämning mot hela AI-arbetsflödet, 2026-10-29

Målet betraktas inte som färdigt bara för att testerna är gröna. Tabellen
skiljer verifierad teknik från pedagogisk granskning, faktisk klientdrift
och publicering. PR #22 är publicerad 2026-10-29 efter Simons uttryckliga
godkännande. Produktionsrevision: `cf144e642d83a73a2bf907eaf442eb2c802e9f0b`.

| Krav från målet | Aktuellt belägg | Bedömning |
|---|---|---|
| Läsa elevens, gruppens och klassens aktuella urval utan att gissa identitet | Urvals-API/MCP, revisionsbunden sidläsning och tester för medlemsändring, dubbla namn, klassöverskridande grupper och elever utan analys | Tekniskt verifierat syntetiskt; historiskt medlemskap påstås inte |
| Analysera konkreta svar och uträkningar med osäkerheter | Revisionsbundna källsvar, notebook-original och två faktiskt modellformulerade rapporter sparade/återlästa i det kompletterande provet | Arbetsflödet verifierat; didaktisk träffsäkerhet inte fastställd |
| Generellt material från instruktion eller givet material | Material-API och robotmatris; faktiskt modellformulerad generell träningsram från ett givet textstycke | Verifierat inom stödda format. Provmallens ofullständiga settings avvisades och kompletterades uttryckligt |
| Analysspecifikt material från just mottagarnas underlag | Separata basis-referenser/revisioner/motiv och synliga elever utan analys; faktisk modellformulerad klasscreening med två elevers skilda underlag | Tekniskt verifierat. Att motiven är pedagogiskt rimliga kräver lärargranskning |
| Träning och screening för elev, grupp och klass | Tolvrutorsmatrisen i material-publication-roboten: båda innehållstyperna × båda ingångarna × tre måltyper | Syntetisk elevåtkomst, svar, omladdning och läraruppföljning verifierade; inte alla tänkbara uppgiftsformat |
| Granska och revidera material utan utdelning | MaterialReview, återanvända frågeredigerare, originalkällor, exakt mottagarlista och oföränderliga versioner | Verifierat i robot och fyllda liggande/stående vyer. Träningsram kan revideras via MCP; vyn visar ramen |
| Aktuell version och exakta mottagare måste godkännas före utdelning | Cookie-skyddat approve/publish, serverns nya kontroll av källa/roster, regression för samma innehåll i olika versioner | Verifierat syntetiskt. MCP exponerar inget godkännande eller publicering |
| Tillförlitliga kvitton och återförsök | CAS, deterministiska ID:n, delfel/osäkra utfall, full aktiv lista, sidvis utdelning och isolerat riktigt Redis-prov | Verifierat inom beskrivna prov. Upstash REST-transport återstår |
| Rätt lärarkonto ska kunna hitta privata utkast | Åtta tidigare utkast återställda till rätt konto och kontrollerade i riktig lärarvy; MCP-identitet och uttrycklig kontobindning vid approved-sparande; privat metadatalista i MCP och befintligt materialbibliotek | Återställningen är genomförd. Återfinning av API-material och skydd för osparad navigering verifierade syntetiskt; rättningarna är i PR #22 |
| Skills beskriver samma faktiska arbetsflöde | pupil-analysis, assignment-authoring och deras API-/MCP-dokument; skillvalidering | Dokumenterat och syntetiskt provat; instruktionerna garanterar inte att en modell följer dem |
| Faktisk ansluten AI-klient | Tidigare registrerad Codex-demo och senare SDK-stdio-prov med aktuell kod, inklusive faktisk Antigravity-text genom MCP | Transport och lagring verifierade. En redan startad klient kan fortfarande använda äldre process/verktyg och behöver laddas om |
| Verklig elevdata endast i klarlagd AI-miljö | Ingen verklig elevdata använd i utvecklings-/modellproven; approved-läge är uttrycklig konfiguration | Villkoret är bevarat. Ingen ny godkänd verklig MCP-miljö eller kontokonfiguration påstås |
| Publicering kräver separat mandat | Simon godkände produktionsmerge av PR #22. Merge cf144e6 har READY-deployment dpl_k5aFTNJEmG566nof71xeNwkLgo5M i sekvens med alias matematik.ximon.se. HTTP 200 och index-DIDUrTDS.js; nya listvägen svarar 401 utan lärarinloggning | Publicerat. Ingen autentiserad visuell produktions-QA eller elevutdelning ingick i releasekontrollen |

## Vad det kompletterande modellprovet ändrade

[Protokoll och granskningsunderlag](evaluations/mcp-authoring-pilot-2026-10-29/review.md)
visar både ett avvisat förslag och den reviderade texten. Första svaret hade
ogiltig JSON, fel datatyp för facit och en obelagd/oförenlig metodtolkning.
Det visar varför schema, källreferenser och en stor testsvit inte bevisar
analysens pedagogiska sanning.

Efter dokumenterad återkoppling sparades två faktiska AI-rapporter, ett
analysspecifikt screeningutkast och en generell träningsram via MCP.
Återläsning och idempotenta återförsök bekräftade version 1 utan dubbletter.
Lärarvyn kunde visa modelltexten, frågorna, originalarbetet med tomt svar
och träningsramens samtliga inställningar. Ingen mänsklig avstämning,
materialgodkännande eller utdelning sparades i provet.

## Återstående beslut och verifiering

1. Produktionsmandatet för PR #22 är uppfyllt och publiceringen verifierad.
   Rätt konto och fristående screeningutkasts skapa/hitta/ändra/spara/återöppna
   samt versionshistorik är autentiserat verifierade i produktion 2026-10-29
   utan elevutdelning. Det separata teacher_material-/MCP-flödet återstår.
2. Vid verklig MCP-användning behöver avsedd AI-miljö och rätt lärarkonto vara
   klarlagda. Lokal transport eller pseudonymer är inget sådant godkännande.
3. Modellens analysförslag behöver lärargranskas. Varierade fall och en
   lärargranskad bedömningsmall återstår före påståenden om kalibrerad analys.
4. Autentiserad HTTPS-preview/produktion, Upstash REST och fysisk iPad är inte
   ersatta av lokala browser-/Redis-prov. Produktionskontroll ska använda en
   uttryckligt avgränsad testväg och bevara riktiga elevuppdrag.

Tillfälliga syntetiska review-URL:er är stängda efter provet. De lagrade
artefakterna är granskningsunderlag, inte länkar till en igångvarande demo.
