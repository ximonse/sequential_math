# Lokal testklass från lärarvyn

I arbetsläget **Framsteg** kan läraren välja en klass och exportera dess sparade svar som JSON. Exporten läser varje elevs fulla lärarprofil, inklusive `problemLog` som kan innehålla fler än de 250 svaren i elevlistan. Om den sparade loggen redan är kapad vid 5 000 svar markeras historiken som ofullständig; äldre svar kan då inte återskapas.

Filen använder påhittade namn och ett generiskt klassnamn. Elev-ID, klass-ID, inloggningsuppgifter, fri text, ursprungliga problem-ID:n och absoluta träningsdatum följer inte med. Alla elevers tidsstämplar förskjuts lika mycket så att ordning och tidsavstånd bevaras. Svarsradernas matematiska uppgifter, rätt/fel och tider behålls för statistik. En `synthetic: true`-markering på en svarsrads evidens kan användas när filen senare utökas med konstgjord träning.

Importknappen finns bara i Vites lokala utvecklingsläge. Den skapar en ny, separat testklass i utvecklingsserverns minne; den skriver inte elevprofiler till produktions-API, databas eller `localStorage`. Testklassen försvinner när den lokala Vite-servern startas om. Om klassen har minst två elever bildas två märkta testgrupper genom att dela eleverna växelvis, så att även gruppjämförelsen kan granskas. Sammanfattningar och räknare byggs om från filens svar, inte från exporterade aggregat. Om källhistoriken var ofullständig visas det även i den importerade lärarstatistiken.

Arbetsgång: publicera exportfunktionen via GitHub, exportera vald klass från livesajten, importera filen på localhost och undersök elev-, grupp- och klassvyer. När exportfilen finns kan fler veckors syntetiska svar läggas till med tydlig markering, utifrån de faktiska svaren.
