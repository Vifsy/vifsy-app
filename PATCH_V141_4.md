# Spreelo v141.4 – kostnadstak och persistent-first

Den här versionen bygger vidare på v141.3 och begränsar kostnaden för en
rate-limit-drabbad occurrence.

- Högst två kompletta körningar tillåts: första försöket och ett enda
  automatiskt återförsök.
- Taket är hårdkodat till maximalt två även om
  `WEBSITE_RATE_LIMIT_MAX_RETRIES` tidigare har satts högre i Vercel.
- Första kampanjkörningen kontrollerar verifierad produktkatalog och sparad
  kandidatkö innan nya sökningar startas.
- Om fem säkra produkter redan finns undviks butikssökning, domän-webbsökning
  och Store Map-expansion.
- Det enda återförsöket använder kandidatkö och katalog först och upprepar inte
  den dyra butikssökningen eller domän-webbsökningen från första försöket.
- Om även det andra försöket träffar 429 avslutas occurrence terminalt och det
  befintliga återbetalningsflödet används.

## Deploy

Om v141.3-migreringen redan har körts behövs ingen ny SQL-körning. Deploya
applikationskoden från v141.4.
