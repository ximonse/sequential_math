# MCP-klienter och kontoval, 2026-10-29

Simon väljer Codex som primär klient och Claude som ytterligare klient.
Gemini/Antigravity ingår inte i fortsatt konfiguration. Tidigare syntetiska
modellprov är historiska belägg, inte en aktiv Gemini-anslutning.

## Verifierade lokala demoanslutningar

`sequential-math-demo` är registrerad i:

- Codex användarkonfiguration, `~/.codex/config.toml`.
- Claude Code användarkonfiguration, `~/.claude.json`.
- Claude Desktop, `~/AppData/Roaming/Claude/claude_desktop_config.json`.

Alla tre startar aktuell adapter i integrationscheckouten:
`C:/Users/ximon/.codex/worktrees/material-integration/sequential_math_fresh/mcp/sequential-math/src/stdio.mjs`
med `--demo-screening --allow-report-writes --allow-material-writes`.
Den tidigare Codex-posten pekade på äldre kod i primärcheckouten och saknade
materialsparsflaggan. Primärcheckoutens pågående arbete ändrades inte.

Varje registrerad kommandokonfiguration kördes genom faktisk SDK-stdio:
16 verktyg, aktuell syntetisk läraridentitet, materialförhandsvisning,
sparande, återfinning via listan, idempotent återförsök och ny version 2.
Version 1 behölls. Inget godkännande eller utdelning utfördes eller exponeras
som MCP-verktyg. Processerna och deras minneslagring stängdes efter proven.
Varje demoprocess har en egen isolerad databas; den delas inte mellan klienter.

Detta verifierar de sparade startinställningarna och MCP-protokollet.
Redan öppna klienter kan fortsätta använda sin äldre process/verktygslista.
Deras faktiska omladdning och nya modellsessioner är inte verifierade här;
ingen klient med pågående arbete startades om.

Claude Code har dessutom två användarskills som hänvisar till de kanoniska
projektfilerna `assignment-authoring` och `pupil-analysis`. Båda validerade.
Claude Desktop läser inte dessa lokala Code-skills genom denna registrering;
serverns analys-prompt och instruktioner är en separat MCP-yta.

## Verkligt konto: adminperson

Befintliga Windows-exportuppgifter gäller **adminperson**. Den tidigare
autentiserade browserkontrollen och återställningen av privata screeningutkast
gällde **Adminsimon**. Kontona har separata privata utkast; administratörsroll
eller åtkomst till samma klasser gör inte deras utkast gemensamma.

Simon valde uttryckligen **adminperson**. `sequential-math` är nu en separat
kontobunden anslutning i Codex, Claude Code och Claude Desktop. Samtliga
registrerade kommandon bekräftade samma verkliga teacherId och rollen
school_admin via capabilities. Både rapport- och materialsparflaggorna är
aktiva, men inga verktyg för godkännande eller utdelning exponeras.

`src/windows-user.mjs` läser de befintliga Windows-användarvariablerna
MATH_TEACHER_USER/PASS vid varje start, utan att ändra dem. Den kräver
uttryckligt förväntat användarnamn och teacherId. Adapterns inloggning måste
stämma med exakt teacherId innan privata skrivningar kan utföras. Inga
lösenord eller sessionstoken sparas i klientkonfiguration, kommandorad eller
kvittot. Anslutningen ändrar inte inloggningen i redan öppna lärarflikar och
flyttar inte Adminsimons privata utkast.

`approved` är adapterns tekniska målval för den uttryckligt konfigurerade
HTTPS-appen; det är inget intyg om tillåten behandling av elevdata hos en
AI-leverantör. Verkliga elevsvar/analysunderlag har inte lästs i detta prov.

### Materialprov och aktuellt prestandahinder

Ett neutralt privat materialprov mot den befintliga klassen Test stoppades
före förhandsvisning/sparande. Mottagar-API:t svarar 409 med att medlemslistan
är ogiltig. Koden validerar hela students:index före klassavgränsning, så ett
legacy-ID utanför den valda klassen kan blockera även dess läsning.
En syntetisk regression reproducerar detta. Den lokala rättningen kontrollerar
klassmedlemskap före formatkravet för globala legacy-nycklar. Felaktiga ID:n
som faktiskt hör till vald klass eller explicit grupp avvisas fortfarande.
Ingen produktionsmedlem eller indexpost raderas eller ändras.

Rättningen publicerades via PR28 på merge e835cc8 efter Simons mandat.
sekvens production är READY på samma SHA och domänalias. Efter publicering
lyckas ett diagnostiskt läsanrop till Test-klassen med tio medlemmar, men
tar 32890 ms. Ordinarie MCP avbryter efter 15000 ms och två försök stannade
därmed före preview/save. Inget kontrollmaterial har skapats eller delats ut.

Prestandarättningen i PR29 gör raderingsuppslag först för klassens egna
medlemmar och läser profiler i begränsade omgångar om 100 i stället för 20.
Två separata rosterläsningar, revisionsjämförelsen och kontroller av valda
medlemmar behålls. Produktionsprestandan är ännu inte verifierad för den
ändringen. Redan startade klienter behöver också läsa sin nya konfiguration;
de startades inte om under pågående arbete.

Prestandarättningen granskas i PR29. Lokalt: 194 testfiler/957 tester,
produktionsbuild, riktad ESLint, arkitektur och projektkarta godkända.
Tre syntetiska robotfall är gröna, inklusive materialets tolv kombinationer
av typ, analysläge och mottagartyp. Detta är ingen verklig elevutdelning.

PR29 är publicerad på merge 4c5f3b8, sekvens production
dpl_2yFstnKjN5XTwHMyZ6mKqiikiP5a READY med domänalias och samma SHA.
Audience gick därefter på 14795 ms, men hela MCP-provet stannade vid
förhandsvisningens tidsgräns. Fortfarande inget sparande eller utdelning.
En följdrättning använder därför ett Redis MGET per hundra profiler i
stället för hundra separata GET. Fel eller ofullständigt batchsvar avvisas;
separata rosterläsningar och alla valda elevers kontroller behålls.

Produktionsprovet av PR30 gav i stället HTTP503 efter 1430 ms. Exakt
lagringsorsak är inte belagd; batchkommandot kan därför inte antas fungera
bara för att ersättningen i robotservern gör det. Ingen save har anropats.
Följdrättningen delar batchar vid storleksfel och använder fullständig GET
som reserv vid andra kommandofel. Korta batchsvar avvisas fortfarande.
Loggning begränsas till fasta felkategorier utan profilnycklar eller innehåll.
Historiska elevkontroller parallelliseras i grupper om 20 utan att hoppa
över någon version eller elev. MCP:s anropstidsbudget är 45 sekunder;
osäker skrivkvittens kräver fortsatt återläsning och samma requestId.

Efter PR31 återställdes audience till HTTP200 (23190 ms), men preview gjorde
fyra hela globala profilläsningar och överskred även 45 sekunder. Fortfarande
ingen material-save. Produktionsloggen bekräftade kategorin `size_limit`.
En skrivskyddad Redis-Lua-läsning filtrerar därför klassmedlemskap innan
profiler skickas över REST. Sekundärt medlemskap räknas; övriga profiler blir
tomma positioner med bevarad ordning. Valda profiler genomgår samma kontroll
av identitet, radering och klassåtkomst i appen. Ingen rosterindexmigrering,
persistens eller cache läggs till. Reservläsningen kvarstår vid fel.

## Klienternas dokumentation

[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) beskriver
användarkonfiguration och stdio-inställningar.
[Claude Code MCP](https://code.claude.com/docs/en/mcp) beskriver user scope
och dess privata konfiguration. Lokala CLI-hjälpsidor kontrollerades också.
Inga globala verktygsgodkännanden eller andra anslutningar ändrades.
