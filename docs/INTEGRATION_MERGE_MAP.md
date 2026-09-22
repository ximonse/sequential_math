# Integrationskarta — pilot/adaption och main

Status: **arbetsunderlag, ej publiceringsbeslut**. Skapad 2026-09-21 för den isolerade integrationsgrenen `codex/pilot-production-integration`.

## 1. Mål och normativ ordning

Integrationen ska förena pilotspårets produkt- och funktionskontrakt med `main`-spårets senare organisations-, roll-, grupp- och lagringsarbete. Inget lägre tekniskt kontrakt får skriva över målen, principerna eller de antagna pedagogiska besluten i `PRODUCT_CONTRACT.md` och `FUNCTION_CONTRACTS.md`.

Normativ ordning i integrationsarbetet:

1. `PRODUCT_CONTRACT.md` och uttryckliga produktbeslut.
2. `FUNCTION_CONTRACTS.md` och ämnesspecifika innehållskontrakt.
3. `ORGANISATION_OCH_INLOGGNING_KONTRAKT.md` och `DATALAGRING_KONTRAKT.md`, efter att motsägelser har harmoniserats uppåt.
4. Teknisk arkitektur och implementation.
5. Manualer och verifieringsrapporter.

## 2. Icke förhandlingsbara egenskaper

- Automatisk adaptiv progression inom en uttrycklig träningsram.
- Historiskt belagt kunnande och aktuellt träningsbehov är separata tillstånd.
- Uppgift, observation, kunskapsläge och lärarsignal använder samma spårbara evidensidentitet.
- Guardian-kontroller stoppar eller underkänner ogiltigt innehåll och osäker evidens.
- Okänt underlag visas inte som nivå noll eller matematisk brist.
- Servern är auktoritativ för verksamhetsdata; lokala köer har explicit leveransstatus.
- Befintliga elev-ID:n, klassmedlemskap, resultat och historik får inte förstöras eller tyst omtolkas.
- Personligt QR-kort + PIN är primär elevinloggning. Kodnamn + PIN är reservväg. En klasslänk får vara en kompletterande ingång men får inte skapa en parallell elevidentitet eller evidenskedja.
- `main`-spårets skolor, explicita roller, klasser, grupper, arkivering, årsskifte och serverlagrade lärararbetsyta ska bevaras.

## 3. Konfliktgrupper och styrande beslut

| Grupp | Konfliktfiler | Styrande beslut | Bevis innan gruppen är klar |
| --- | --- | --- | --- |
| A. Kontrakt och manualer | `docs/MANUAL_ELEV.md`, `docs/MANUAL_LARARE.md`, `docs/RELIABILITY_CONTRACTS.md` | Manualerna beskriver det integrerade flödet. Permanenta regler finns i ett auktoritativt kontrakt och länkas från övriga dokument. | Dokumenten motsäger inte produktkontraktet eller varandra; inloggnings- och datakontrakten är uppdaterade. |
| B. Läraridentitet och behörighet | `api/_helpers.js`, admin-/teacher-API:er, `src/lib/teacherAuth.js` | Behåll levande kontokontroll, explicita roller, skol-/klass-scope och sessionsversion från `main`; behåll pilotens säkra cookiegräns och inga råa hemligheter i klienten. | Rolltester, sessionsinvalidering och åtkomsttester passerar. |
| C. Elevidentitet och session | `api/_studentSession.js`, `api/student-login.js`, `src/components/Login.jsx`, klienttester | En elevidentitet och en auktoritativ sessionsgräns. QR/PIN primärt, kodnamn/PIN reserv, klasslänk valfri ingång till samma elev och session. | QR-, kodnamns- och klasslänksfall når samma profil utan dubbla ID:n; felaktiga uppgifter ger korrekt felklass. |
| D. Elev- och klassdata | roster-, student-, event- och storage-API:er | Bevara `main`-spårets organisation och servercache tillsammans med pilotens CAS-, tombstone-, observations- och eventkrav. | Bakåtkompatibla profiler, klassbyte utan historikförlust, deduplicerade events och verklig serversynk. |
| E. Adaptiv elevkedja | `usePracticeCoreActions.js` samt konfliktfria F1–F5-moduler | Produkt- och funktionskontrakten är auktoritativa. Klasskontext läggs till observationen utan att ändra dess matematiska betydelse. | Replay för progression, återhämtning, låst ram, attainment/current need och serialisering. |
| F. Lärarvy och administration | dashboard-/panelkonflikter | Behåll `main`-spårets roll- och organisationsytor och pilotens evidensbaserade progression, faktisk-fel-signal och datakvalitet. Aktivitet och matematiskt stödbehov separeras. | Samma elevurval ger förenlig lista, detalj och export; administratörsåtgärder följer rollmatrisen. |
| G. Beroenden och byggkedja | `package.json`, `package-lock.json` | Union av faktiskt använda beroenden och `main`-spårets arkitekturkontroll. Ingen handredigerad låsfil. | Ren installation/låsfil, arkitekturkontroll, fulla tester och build. |

## 4. Arbetsregel per konflikt

För varje fil dokumenteras före lösning:

1. Pilotspårets avsikt och kontrakt.
2. `main`-spårets avsikt och kontrakt.
3. Integrerad auktoritativ betydelse.
4. Bakåtkompatibilitet för befintlig data.
5. Körbart bevis som ska falla om betydelsen tappas.

Ingen konflikt får lösas med ett globalt val av `ours` eller `theirs`. Mekanisk sammanslagning är bara tillåten efter att betydelsen ovan är fastställd.

## 5. Publiceringsgrind

Integrationsgrenen får inte gå till Preview eller produktion förrän:

- samtliga konfliktmarkörer är borta och mergebesluten är granskbara;
- arkitekturkontroll, full testsvit och build passerar;
- elevreplay täcker QR/PIN, kodnamn/PIN, eventuell klasslänk, automatisk progression, återhämtning, låst ram och avbruten synk;
- lärarreplay visar faktisk-fel-signal, okänt underlag, datakvalitet och oförändrad historisk attainment;
- befintlig produktionsdata har en verifierad bakåtkompatibel läsväg;
- samma commit först har verifierats i Preview och därefter uttryckligen godkänts för produktion.

Nuvarande produktionsdeployment behålls som rollbackpunkt under hela arbetet.
