# Geometri i träning och uppdrag

Geometri återanvänder figurbanken och tryckbara alternativ i fri träning och vanliga läraruppdrag. Simon valde enkel statistik i första versionen och tid som grund för avancemang. Arbetsregeln för framtida felmodeller finns i [Styrning av felförståelser](STYRNING_FELFORSTAELSER.md#9-rutin-för-nytt-område-eller-ny-felmodell).

## Innehåll och facit

| Delområde | Begrepp | Frågor att börja med |
| --- | --- | --- |
| Linjer och sträckor | Linje, stråle, sträcka, diagonal | Låt eleven skilja linje, stråle och sträcka på bilder med olika orientering. Fråga vad den markerade sträckan mellan två hörn som inte ligger intill varandra heter. |
| Plana figurer | Månghörning, triangel, fyrhörning, femhörning, sexhörning, rektangel, kvadrat, romb, parallellogram, parallelltrapets, cirkel | Variera orientering, proportioner och regelbundna respektive oregelbundna exempel. Pröva månghörning med flera olika antal hörn. |
| Kroppar | Rätblock, kub, pyramid, kon, klot, cylinder | Variera perspektiv och proportioner. Använd flera basformer för pyramider när bilderna finns. |

Återanvänd originalbanken och dess bildversioner. Diagonal visas som en markerad sträcka i en månghörning. När två namn stämmer behöver frågan ange vilken egenskap som efterfrågas, eller ge eleven möjlighet att välja alla som stämmer. Kvadraten räknas som rektangel och romb. Kuben räknas som rätblock. Pröva parallelltrapets första gången med formuleringen ”Vilken fyrhörning har exakt ett par parallella sidor?” så att facit är entydigt även när olika läromedel använder olika definitioner. Källa för figurers egenskaper och variation i bilder av kroppar: [NCM, Diamant – geometri](https://ncm.gu.se/klassrum/diamantdiagnos/geometri/).

## Svar, statistik och återkoppling

- Ett bekräftat svar ger en observation i befintlig svarskedja. Uppgifts-ID och version, primärt begrepp, alternativens visningsordning, valda ID:n, facit och rättningsutfall lagras. Frågeformen och bilderna finns i den versionsstyrda banken. Eleven kan ändra val fram till Svara. Ett flerval räknas som en fråga och ett tomt utkast räknas inte som svar.
- Geometri i Statistik & stöd visar fel, antal svar och andel fel för varje prövat begrepp, sorterat efter antal fel. Vyn använder samma senaste svar som läraröversikten, högst 250 svar per elev totalt, och respekterar vald klasskontext. Fri träning och uppdrag räknas tillsammans. Statistikdelen gör inga egna nätverksanrop.
- Två nivåer per delområde. Nivå 1 visar bilder som svarsalternativ. Nivå 2 lägger till frågor med bild och namnalternativ. För nivå 2 krävs snabba och rätta svar på minst fem av de sex senast prövade skilda begreppen, eller tre av fyra i Linjer och sträckor. Startmålen är 12 sekunder för enkelval och 18 för frågor med flera rätta svar. Eleven ser ingen nedräkning. Ett långsammare rätt svar räknas fortfarande som rätt. Tidsmålen är preliminära och geometrisvaren påverkar varken andra områdens progression eller deras snabbhetsmått.
- I Uppdrag via länk väljer läraren delområden. Ordinarie utdelning och länkar återanvänds. Uppdragets svar räknas från befintlig svarshistorik och antalet besvarade frågor återläses vid omladdning.

## Möjliga felsvarsmönster att pröva

”Valde romb för en vriden kvadrat” beskriver elevens svar. Ett enskilt val räcker för att visa den observationen. En möjlig förklaring blir starkare först när jämförbara frågor visar vad eleven gör när en enskild egenskap ändras. Med fyra alternativ är sannolikheten för ett visst val vid likformig gissning 1 av 4. Gissningar behöver varken vara likformiga eller oberoende, särskilt när uppgifterna upprepas.

| Kandidat | Tre kontraster i originalfrågor | Motexempel eller otillräckligt belägg |
| --- | --- | --- |
| Känner igen kvadraten i ett bekant läge men tappar den när den vrids | Para tre olika kvadratexempel med en vriden version av respektive figur. Låt eleven välja kvadrat bland en kvadrat, en romb med spetsiga vinklar och andra fyrhörningar. Kandidaten förutsäger rätt på den upprätta kvadraten och att den vridna kvadraten väljs bort. | Väljer vriden kvadrat rätt. Missar både upprätt och vriden kvadrat. Ser facit för samma figur före jämförelsen. |
| Räknar bort kvadraten när alla rektanglar ska väljas | Visa en avlång rektangel, en kvadrat och rimliga alternativ i tre olika uppsättningar. Variera storlek och läge. Kandidaten förutsäger att enbart den avlånga rektangeln väljs, samtidigt som eleven kan identifiera samma slags kvadrat på en jämförbar fråga. | Väljer båda typerna. Missar även den avlånga rektangeln. Utelämnar kvadraten samtidigt som flera orelaterade alternativ väljs. |

Fujitas studie ger stöd för att pröva prototypberoende och kategoritillhörighet som skilda hypoteser. Kandidaterna kan överlappa om en fråga samtidigt varierar läge och kategori. Håll därför den andra egenskapen konstant i varje jämförelse. Linje/stråle/sträcka och cirkel/klot kan redovisas som observerade val när vi har underlag. De har ännu ingen källgrundad felmodell här. [Fujita, 2012](https://doi.org/10.1016/j.jmathb.2011.08.003)

## Täckning och beslutspunkt

Före implementationen fanns fyra inbyggda geometrifrågor i Screening, varav tre med tryckbara svar, och 0 av 21 begrepp i ordinarie träning och uppdrag. I lokal kod finns nu 21 av 21 begrepp. Automatiska felmodeller har fortfarande täckning noll. Kandidaterna ovan väntar på jämförbara riktiga elevsvar och godkännande inför ett senare arbete.

Vid läskontroll 2026-11-26 fanns 19 screeningar i fyra ordinarie klasser. En utdelning innehöll två geometrifrågor, om cylinder respektive triangel, båda med noll inlämnade svar. Inga jämförbara elevsvar hittades i det urvalet. Täckning för felmodeller före och efter förberedelsen är noll, och andelen förklarade fel kan inte beräknas på noll svar.

Simon valde Lärare för första provningen. En osparad förhandsvisning av fyra screeningfrågor validerades för gruppen. Provningen kan kontrollera tydlighet och användbarhet. Om felmodeller tas upp senare behöver de två kandidaterna prövas med jämförbara elevsvar, motexempel och lärargodkännande.
