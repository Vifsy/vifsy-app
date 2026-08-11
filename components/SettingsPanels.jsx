"use client";

import {
  ArrowRight,
  CircleCheck,
  Download,
  Laptop,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { SUPPORTED_UI_LOCALES } from "../lib/i18n/defaultLabels";

export default function SettingsPanels({
  activeTab, locale, currentUser, currentUserEmail, profileName, setProfileName,
  profileMessage, savingProfile, saveProfile, signOutOtherSessions, exportAccountData,
  recommendedLocale, savingLanguage, handleLanguageChange, planName, onDeleteAccount,
  publishingTimeZone, savingTimeZone, handleTimeZoneChange, publishingTimeZoneOptions = [],
}) {
  const sv = String(locale || "").toLowerCase().startsWith("sv");
  const name = profileName || currentUserEmail?.split("@")[0] || (sv ? "Användare" : "User");
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const emailVerified = Boolean(currentUser?.email_confirmed_at || currentUser?.confirmed_at);

  if (activeTab === "account") {
    return (
      <section className="settings-reference-workspace settings-ref-account">
        <div className="settings-ref-account-main">
          <div className="settings-ref-section-intro"><h2>{sv ? "Profil" : "Profile"}</h2></div>
          <div className="settings-ref-profile"><span>{initials}</span><button type="button">{sv ? "Byt profilbild" : "Change profile picture"}</button></div>

          <div className="settings-ref-labelled-section">
            <div><h3>{sv ? "Kontaktuppgifter" : "Contact details"}</h3><p>{sv ? "Hantera dina kontaktuppgifter och kontoinformation." : "Manage your contact details and account information."}</p></div>
            <div className="settings-ref-rows">
              <label><strong>{sv ? "Namn" : "Name"}</strong><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={sv ? "Ditt namn" : "Your name"} /><button type="button" onClick={saveProfile}>{savingProfile ? (sv ? "Sparar…" : "Saving…") : (sv ? "Spara" : "Save")}</button></label>
              <div><strong>{sv ? "E-postadress" : "Email address"}</strong><span>{currentUserEmail}</span><em>{sv ? "Verifierad" : "Verified"}</em></div>
            </div>
          </div>

          <div className="settings-ref-labelled-section">
            <div><h3>{sv ? "Arbetsyta" : "Workspace"}</h3><p>{sv ? "Information om din arbetsyta och aktuellt varumärke." : "Information about your workspace and current brand."}</p></div>
            <div className="settings-ref-rows">
              <div><strong>{sv ? "Företag" : "Company"}</strong><span>{currentUser?.user_metadata?.company || "—"}</span><em>{sv ? "Hantera" : "Manage"}</em></div>
              <div><strong>{sv ? "Aktuellt varumärke" : "Current brand"}</strong><span>{currentUser?.user_metadata?.current_brand_name || "Pressit.se"}</span><em>{sv ? "Hantera" : "Manage"}</em></div>
            </div>
          </div>

          <div className="settings-ref-labelled-section account-management">
            <div><h3>{sv ? "Kontohantering" : "Account management"}</h3><p>{sv ? "Hantera och exportera dina kontouppgifter." : "Manage and export your account information."}</p></div>
            <div className="settings-ref-action-rows">
              <button type="button" onClick={exportAccountData}><Download /><span><strong>{sv ? "Ladda ner kontosammanfattning" : "Download account summary"}</strong><small>{sv ? "En lättläst HTML-fil utan interna betalnings- eller system-ID:n." : "A readable HTML file without internal payment or system IDs."}</small></span><ArrowRight /></button>
              <button type="button" className="danger" onClick={onDeleteAccount}><Trash2 /><span><strong>{sv ? "Radera konto" : "Delete account"}</strong><small>{sv ? "Ta bort ditt konto och all tillhörande data permanent." : "Permanently remove your account and all associated data."}</small></span><ArrowRight /></button>
            </div>
          </div>
          {profileMessage && <p className="settings-ref-message">{profileMessage}</p>}
        </div>
        <aside className="settings-ref-account-aside"><h2>{sv ? "Kontoöversikt" : "Account overview"}</h2><dl><dt>{sv ? "Roll" : "Role"}</dt><dd>{sv ? "Ägare" : "Owner"}</dd><dt>{sv ? "Plan" : "Plan"}</dt><dd>{planName}</dd><dt>{sv ? "Medlem sedan" : "Member since"}</dt><dd>{currentUser?.created_at ? new Date(currentUser.created_at).getFullYear() : "—"}</dd></dl><a href="/brand">{sv ? "Hantera arbetsyta" : "Manage workspace"}</a></aside>
      </section>
    );
  }

  if (activeTab === "security") {
    return (
      <section className="settings-reference-workspace settings-ref-security">
        <div className="settings-ref-security-main">
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Inloggning" : "Sign-in"}</h3><p>{sv ? "Spreelo använder en engångskod i stället för ett lösenord." : "Spreelo uses a one-time code instead of a password."}</p></div><div className="settings-ref-card"><header><LockKeyhole /><span><strong>{sv ? "Inloggning med e-postkod" : "Email code sign-in"}</strong><small>{sv ? "En ny sexsiffrig kod skickas när du loggar in. Koden kan bara användas en gång." : "A new six-digit code is sent whenever you sign in. It can only be used once."}</small></span><em>{sv ? "Aktiv" : "Active"}</em></header><div><strong>{sv ? "E-postadress" : "Email address"}</strong><span>{currentUserEmail}</span><em className={emailVerified ? "" : "pending"}>{emailVerified ? (sv ? "Verifierad" : "Verified") : (sv ? "Ej verifierad" : "Not verified")}</em></div><div><strong>{sv ? "Inloggningsmetod" : "Sign-in method"}</strong><span>{sv ? "Engångskod via e-post" : "One-time code by email"}</span></div><div><strong>{sv ? "Senast inloggad" : "Last signed in"}</strong><span>{currentUser?.last_sign_in_at ? new Date(currentUser.last_sign_in_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—"}</span></div></div></div>
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Den här sessionen" : "This session"}</h3><p>{sv ? "Webbläsaren du använder just nu." : "The browser you are using right now."}</p></div><div className="settings-ref-card sessions"><div><Laptop /><strong>{sv ? "Den här enheten" : "This device"}</strong><em>{sv ? "Aktiv nu" : "Active now"}</em></div></div></div>
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Andra enheter" : "Other devices"}</h3><p>{sv ? "Spreelo kan avsluta andra inloggningar men visar ännu ingen komplett enhetslista." : "Spreelo can end other sign-ins but does not yet show a complete device list."}</p></div><div className="settings-ref-action-rows"><button type="button" onClick={signOutOtherSessions}><LogOut /><span><strong>{sv ? "Logga ut från andra enheter" : "Sign out other devices"}</strong><small>{sv ? "Din nuvarande session behålls. Övriga Supabase-sessioner återkallas." : "Your current session is kept. Other Supabase sessions are revoked."}</small></span><ArrowRight /></button></div></div>
          {profileMessage && <p className="settings-ref-message">{profileMessage}</p>}
        </div>
        <aside className="settings-ref-security-aside factual"><h2>{sv ? "Kontoskydd" : "Account protection"}</h2><ShieldCheck /><h3>{emailVerified ? (sv ? "E-postadressen är verifierad" : "Email address verified") : (sv ? "Verifiera din e-post" : "Verify your email")}</h3><p>{sv ? "E-postadressen verifieras när en giltig inloggningskod används. Inloggningen hanteras av Supabase Auth över HTTPS." : "The email is verified when a valid sign-in code is used. Sign-in is handled by Supabase Auth over HTTPS."}</p><ul><li><CircleCheck />{sv ? "Inget återanvändbart lösenord lagras av Spreelo" : "Spreelo stores no reusable password"}</li><li><CircleCheck />{sv ? "Varje inloggningskod är tillfällig" : "Every sign-in code is temporary"}</li><li><CircleCheck />{sv ? "Andra sessioner kan återkallas" : "Other sessions can be revoked"}</li></ul></aside>
      </section>
    );
  }

  if (activeTab === "notifications") {
    return (
      <section className="settings-reference-workspace settings-ref-notifications settings-ref-notifications-factual">
        <div className="settings-ref-notification-summary">
          <header><span><Mail /></span><div><h2>{sv ? "Viktiga e-postmeddelanden" : "Important email messages"}</h2><p>{sv ? "Spreelo skickar i dag endast meddelanden som krävs för inloggning eller när något behöver din uppmärksamhet." : "Spreelo currently sends only messages required for sign-in or when something needs your attention."}</p></div></header>
          <div><CircleCheck /><span><strong>{sv ? "Inloggningskod" : "Sign-in code"}</strong><small>{sv ? "Skickas när du själv begär att logga in." : "Sent when you request to sign in."}</small></span><em>{sv ? "Alltid" : "Always"}</em></div>
          <div><CircleCheck /><span><strong>{sv ? "Fel som kräver åtgärd" : "Failures requiring action"}</strong><small>{sv ? "Exempelvis när ett automatiserat inlägg inte kan skapas." : "For example, when an automated post cannot be created."}</small></span><em>{sv ? "Viktigt" : "Important"}</em></div>
          <div><CircleCheck /><span><strong>{sv ? "Plan- och kontohändelser" : "Plan and account events"}</strong><small>{sv ? "Aktivering, betalningsstatus och andra viktiga kontohändelser." : "Activation, payment status and other important account events."}</small></span><em>{sv ? "Viktigt" : "Important"}</em></div>
        </div>
        <aside className="settings-ref-delivery factual"><h2>{sv ? "Leveransadress" : "Delivery address"}</h2><p>{sv ? "E-postadress" : "Email address"}<strong>{currentUserEmail}</strong></p><p>{sv ? "Verifiering" : "Verification"}<em className={emailVerified ? "" : "pending"}>{emailVerified ? (sv ? "Verifierad" : "Verified") : (sv ? "Ej verifierad" : "Not verified")}</em></p><hr /><p className="settings-ref-delivery-note">{sv ? "Valbara sammanfattningar, testaviseringar och pausning visas igen först när de är kopplade till den faktiska utskicksmotorn." : "Digest, test and pause controls will return only when connected to the actual delivery engine."}</p></aside>
      </section>
    );
  }

  if (activeTab === "language") {
    return (
      <section className="settings-reference-workspace settings-ref-language settings-ref-language-factual">
        <div className="settings-ref-language-card">
          <div className="settings-ref-language-section app-language"><div><h2>{sv ? "Appspråk" : "App language"}</h2><p>{sv ? "Byter språk i menyer, knappar och systemtexter. Det ändrar inte språket i innehållet du skapar." : "Changes menus, buttons and system copy. It does not change the language of the content you create."}</p></div><label className="settings-ref-language-select"><span>{sv ? "Välj språk" : "Choose language"}</span><select value={recommendedLocale} onChange={(event) => handleLanguageChange(event.target.value)} disabled={savingLanguage}>{SUPPORTED_UI_LOCALES.map((item) => <option key={item.locale} value={item.locale}>{item.nativeName || item.language}</option>)}</select><small>{savingLanguage ? (sv ? "Sparar språk…" : "Saving language…") : (sv ? "Valet sparas på ditt konto." : "The choice is saved to your account.")}</small></label></div>
          <div className="settings-ref-language-section guidance"><div><h2>{sv ? "Marknad & innehållsspråk" : "Market & content language"}</h2><p>{sv ? "Detta är varumärkesspecifikt och används av analysen, kampanjkalendern och innehållsgenereringen." : "These are brand-specific and are used by analysis, the campaign calendar and content generation."}</p></div><a href="/brand"><span><strong>{sv ? "Öppna varumärkesprofilen" : "Open brand profile"}</strong><small>{sv ? "Hantera marknad, land och innehållsspråk där." : "Manage market, country and content language there."}</small></span><ArrowRight /></a></div>
          <div className="settings-ref-language-section publishing-timezone"><div><h2>{sv ? "Tidszon för publicering" : "Publishing time zone"}</h2><p>{sv ? "Gäller alla planerade inlägg i arbetsytan. Publiceringstider räknas om till den lokala tid du väljer." : "Applies to every scheduled post in the workspace. Publishing times are converted to the local time you choose."}</p></div><label className="settings-ref-language-select"><span>{sv ? "Arbetsytans tidszon" : "Workspace time zone"}</span><select value={publishingTimeZone} onChange={(event) => handleTimeZoneChange(event.target.value)} disabled={savingTimeZone}>{Array.from(new Set([publishingTimeZone, ...publishingTimeZoneOptions].filter(Boolean))).map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select><small>{savingTimeZone ? (sv ? "Uppdaterar alla planerade inlägg…" : "Updating all scheduled posts…") : (sv ? "Ändringen används även av nya AI-planer och kampanjer." : "The change is also used by new AI plans and campaigns.")}</small></label></div>
          {profileMessage && <p className="settings-ref-message">{profileMessage}</p>}
        </div>
        <aside className="settings-ref-language-aside factual"><h2>{sv ? "Tre separata val" : "Three separate choices"}</h2><ol><li><strong>{sv ? "Appspråk" : "App language"}</strong><span>{sv ? "Hur Spreelo-gränssnittet visas." : "How the Spreelo interface is shown."}</span></li><li><strong>{sv ? "Marknad" : "Market"}</strong><span>{sv ? "Vilket land och vilken kontext innehållet planeras för." : "The country and context content is planned for."}</span></li><li><strong>{sv ? "Tidszon" : "Time zone"}</strong><span>{sv ? "När planerade körningar sker lokalt." : "When scheduled runs occur locally."}</span></li></ol></aside>
      </section>
    );
  }

  return null;
}
