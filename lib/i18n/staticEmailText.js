import {
  DEFAULT_UI_LOCALE,
  getDefaultNamespaceLabels,
  interpolateUiText,
  normalizeUiLocale,
} from "./defaultLabels.js";

// v144.109: transactional/service email copy must never create an AI translation
// request while an email is being sent. English is the source/fallback. We keep
// curated file-based packs for the emails we actively ship and may still merge
// older persistent ui_translation_packs as a compatibility source.
const STATIC_EMAIL_LABELS = {
  sv: {
    "emails.planActivated.subject": "Din marknadsföringsplan i Spreelo är klar · {brand}",
    "emails.planActivated.title": "Din marknadsföringsplan är klar",
    "emails.planActivated.intro": "Här är en tydlig sammanfattning av planen du skapade för {brand}.",
    "emails.planActivated.summary": "Plansammanfattning",
    "emails.planActivated.goal": "Mål",
    "emails.planActivated.frequency": "Publicering",
    "emails.planActivated.start": "Startar",
    "emails.planActivated.channels": "Kanaler",
    "emails.planActivated.language": "Inläggsspråk",
    "emails.planActivated.credits": "Krediter för första perioden",
    "emails.planActivated.formats": "Planerade innehållsformat",
    "emails.planActivated.nextTitle": "Vad händer nu?",
    "emails.planActivated.nextText": "Spreelo skapar varje planerat inlägg enligt planen. Innan publicering får du ett mejl där du kan granska och godkänna inlägget eller be om ändringar.",
    "emails.planActivated.thanks": "Tack för att du använder Spreelo. Vi ser fram emot att hjälpa dig hålla marknadsföringen konsekvent, relevant och enklare att hantera.",
    "emails.welcome.subject": "Välkommen till Spreelo",
    "emails.welcome.eyebrow": "Välkommen till Spreelo",
    "emails.welcome.title": "Ditt Spreelo-konto är klart",
    "emails.welcome.intro": "Nu kan du bygga din varumärkesyta, skapa kampanjplaner och förbereda innehåll för dina sociala kanaler.",
    "emails.welcome.nextTitle": "Nästa steg",
    "emails.welcome.nextText": "Logga in för att lägga till eller analysera ditt första varumärke. Spreelo förbereder en varumärkesprofil och kampanjkalender som du kan granska innan du skapar innehåll.",
    "emails.welcome.button": "Öppna Spreelo",
    "emails.welcome.security": "För din säkerhet ber Spreelo dig verifiera din e-post när du loggar in. Det här mejlet innehåller ingen inloggningskod.",
    "emails.analysisCompleted.subject": "Din varumärkesanalys i Spreelo är klar · {brand}",
    "emails.analysisCompleted.eyebrow": "Varumärkesanalysen är klar",
    "emails.analysisCompleted.title": "{brand} är klart i Spreelo",
    "emails.analysisCompleted.intro": "Spreelo har analyserat ditt företag i bakgrunden. Din varumärkesprofil och kampanjkalender är klara att granska.",
    "emails.analysisCompleted.profile": "Varumärkesprofil förberedd",
    "emails.analysisCompleted.calendar": "{count} kampanjmöjligheter förberedda",
    "emails.analysisCompleted.nextTitle": "Fortsätt när det passar dig",
    "emails.analysisCompleted.nextText": "Öppna Spreelo och logga in säkert för att granska resultatet och fortsätta med dina sociala kanaler eller din första automatiska innehållsplan.",
    "emails.analysisCompleted.button": "Visa analysresultatet",
    "emails.analysisCompleted.security": "Analysen fortsatte säkert även om webbläsaren stängdes. Spreelo skickar aldrig en engångskod i det här mejlet.",
    "emails.calendarUpdated.subject": "Din kampanjkalender för {year} i Spreelo är klar · {brand}",
    "emails.calendarUpdated.eyebrow": "Kampanjkalendern är uppdaterad",
    "emails.calendarUpdated.title": "Din kalender för {year} är klar",
    "emails.calendarUpdated.intro": "Spreelo har uppdaterat kampanjkalendern för {brand} med relevanta kampanjer, säsongstillfällen och aktuella datum för {year}.",
    "emails.calendarUpdated.campaigns": "{count} kampanjmöjligheter är klara",
    "emails.calendarUpdated.dates": "Datum och säsongsplanering uppdaterade för {year}",
    "emails.calendarUpdated.nextTitle": "Du behöver inte göra något",
    "emails.calendarUpdated.nextText": "Den nya kalendern är redan aktiv och Spreelo använder den automatiskt när du skapar innehållsplaner och kalenderkampanjer.",
    "emails.calendarUpdated.button": "Visa min kalender",
    "emails.calendarUpdated.security": "Det här är en serviceuppdatering om din Spreelo-yta. Ingen inloggningskod eller åtgärd krävs från mejlet.",
  },
  da: {
    "emails.planActivated.subject": "Din marketingplan i Spreelo er klar · {brand}",
    "emails.planActivated.title": "Din marketingplan er klar",
    "emails.planActivated.intro": "Her er en tydelig oversigt over den plan, du oprettede for {brand}.",
    "emails.planActivated.summary": "Planoversigt",
    "emails.planActivated.goal": "Mål",
    "emails.planActivated.frequency": "Udgivelse",
    "emails.planActivated.start": "Starter",
    "emails.planActivated.channels": "Kanaler",
    "emails.planActivated.language": "Indlægssprog",
    "emails.planActivated.credits": "Kreditter for første periode",
    "emails.planActivated.formats": "Planlagte indholdsformater",
    "emails.planActivated.nextTitle": "Hvad sker der nu?",
    "emails.planActivated.nextText": "Spreelo opretter hvert planlagt indlæg efter planen. Før udgivelse får du en e-mail, hvor du kan gennemgå og godkende indlægget eller bede om ændringer.",
    "emails.planActivated.thanks": "Tak fordi du bruger Spreelo. Vi glæder os til at hjælpe dig med at holde din marketing konsekvent, relevant og lettere at administrere.",
    "emails.calendarUpdated.subject": "Din Spreelo-kampagnekalender for {year} er klar · {brand}",
    "emails.calendarUpdated.eyebrow": "Kampagnekalenderen er opdateret",
    "emails.calendarUpdated.title": "Din kalender for {year} er klar",
    "emails.calendarUpdated.intro": "Spreelo har opdateret kampagnekalenderen for {brand} med relevante kampagner, sæsonmuligheder og aktuelle datoer for {year}.",
    "emails.calendarUpdated.campaigns": "{count} kampagnemuligheder er klar",
    "emails.calendarUpdated.dates": "Datoer og sæsontiming opdateret for {year}",
    "emails.calendarUpdated.nextTitle": "Du behøver ikke gøre noget",
    "emails.calendarUpdated.nextText": "Den nye kalender er allerede aktiv, og Spreelo bruger den automatisk, når du opretter indholdsplaner og kalenderkampagner.",
    "emails.calendarUpdated.button": "Se min kalender",
    "emails.calendarUpdated.security": "Dette er en serviceopdatering om dit Spreelo-workspace. Ingen login-kode eller handling er nødvendig fra denne e-mail.",
  },
  no: {
    "emails.planActivated.subject": "Markedsføringsplanen din i Spreelo er klar · {brand}",
    "emails.planActivated.title": "Markedsføringsplanen din er klar",
    "emails.planActivated.intro": "Her er en tydelig oppsummering av planen du opprettet for {brand}.",
    "emails.planActivated.summary": "Planoppsummering",
    "emails.planActivated.goal": "Mål",
    "emails.planActivated.frequency": "Publisering",
    "emails.planActivated.start": "Starter",
    "emails.planActivated.channels": "Kanaler",
    "emails.planActivated.language": "Innleggsspråk",
    "emails.planActivated.credits": "Kreditter for første periode",
    "emails.planActivated.formats": "Planlagte innholdsformater",
    "emails.planActivated.nextTitle": "Hva skjer nå?",
    "emails.planActivated.nextText": "Spreelo oppretter hvert planlagte innlegg etter planen. Før publisering får du en e-post der du kan gjennomgå og godkjenne innlegget eller be om endringer.",
    "emails.planActivated.thanks": "Takk for at du bruker Spreelo. Vi ser frem til å hjelpe deg med å holde markedsføringen konsekvent, relevant og enklere å administrere.",
    "emails.calendarUpdated.subject": "Spreelo-kampanjekalenderen din for {year} er klar · {brand}",
    "emails.calendarUpdated.eyebrow": "Kampanjekalenderen er oppdatert",
    "emails.calendarUpdated.title": "Kalenderen din for {year} er klar",
    "emails.calendarUpdated.intro": "Spreelo har oppdatert kampanjekalenderen for {brand} med relevante kampanjer, sesongmuligheter og aktuelle datoer for {year}.",
    "emails.calendarUpdated.campaigns": "{count} kampanjemuligheter er klare",
    "emails.calendarUpdated.dates": "Datoer og sesongtiming oppdatert for {year}",
    "emails.calendarUpdated.nextTitle": "Du trenger ikke gjøre noe",
    "emails.calendarUpdated.nextText": "Den nye kalenderen er allerede aktiv, og Spreelo bruker den automatisk når du oppretter innholdsplaner og kalenderkampanjer.",
    "emails.calendarUpdated.button": "Se kalenderen min",
    "emails.calendarUpdated.security": "Dette er en serviceoppdatering om Spreelo-arbeidsområdet ditt. Ingen innloggingskode eller handling kreves fra denne e-posten.",
  },
};

export function getStaticEmailLabels(locale, persistedLabels = {}) {
  const safeLocale = normalizeUiLocale(locale || DEFAULT_UI_LOCALE);
  const defaults = getDefaultNamespaceLabels("emails");
  const staticLocale = STATIC_EMAIL_LABELS[safeLocale] || {};
  return {
    ...defaults,
    ...staticLocale,
    ...(persistedLabels || {}),
  };
}

export function createStaticEmailTranslator(locale, persistedLabels = {}) {
  const labels = getStaticEmailLabels(locale, persistedLabels);
  return {
    locale: normalizeUiLocale(locale || DEFAULT_UI_LOCALE),
    labels,
    t(key, values = {}) {
      return interpolateUiText(labels[key] || key, values);
    },
  };
}
