# Spreelo v143.24 – varierat urval och fem rena produktbilder

Den här versionen gör en avgränsad, generell korrigering av den auktoritativa
GPT-5.5-vägen för kampanjkaruseller. Den gamla 180-kandidatvägen och Product
Engines semantiska omrankning aktiveras inte.

## Ändringar

- GPT-5.5 deklarerar om kampanjen behöver flera produktfamiljer eller är en
  fokuserad produktkategori. Breda kampanjer får minst fyra kompletterande
  produktfamiljer i femproduktsurvalet när butikens underlag tillåter det.
- Varje produkt får en normaliserad produktfamilj. Om en topplacering saknas
  eller flera topplaceringar duplicerar samma familj används en relevant,
  annorlunda reservfamilj före ännu en dubblett.
- Produktforskningen kräver att alla tio produkter har en officiell ren
  katalogbild utan människa, kroppsdel eller djur. Detta förbättrar
  reservpoolen utan att släppa igenom olämpliga bilder.
- Bildgranskningen kontrollerar upp till fyra identitetsverifierade
  galleribilder per produkt. Tidigare kontrollerades bara två, vilket kunde
  missa en ren packshot som låg som bild tre eller fyra.
- Inaktuella länkar och produktbilder får endast repareras med GPT-5.5:s
  exakta produktidentitetsreparation. Den får inte byta produkt eller ändra
  marknadsförarens rangordning.

## Installation

Ingen ny SQL krävs. Distribuera innehållet i Windows-zippen på samma sätt som
föregående version.
