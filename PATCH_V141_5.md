# Spreelo v141.5 – vinnande Store Map-väg i första försöket

Den verifierade v141.3-körningen lyckades först på tredje försöket när Store Map
hade hunnit verifiera 29 produkter och hittat fem kampanjsäkra vinterprodukter
på den specifika stövelhyllan. Den här versionen flyttar samma väg till första
körningen.

- Sparad kandidatkö och katalog används först.
- Store Map körs därefter före butikssökning och domän-webbsökning.
- Specifika produkthyllor prioriteras före breda avdelningar som `Clothing`.
- Store Map-budgeten inom samma körning höjs från 150 till 240 sekunder.
- Det enda tillåtna återförsöket verifierar upp till 24 sparade kandidater.
- Hårt kostnadstak på två kompletta körningar finns kvar.
- Bildhämtning accepterar inte längre AVIF/HEIF; Boozt ombeds leverera
  WebP/JPEG/PNG som Sharp kan rendera.

## Deploy

Ingen ny SQL krävs om v141.3-migreringen redan har körts. Deploya
applikationskoden från v141.5.
