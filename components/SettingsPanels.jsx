"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  Download,
  Flag,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { SUPPORTED_UI_LOCALES } from "../lib/i18n/defaultLabels";

function Toggle({ checked, onChange, label }) {
  return <label className="settings-ref-toggle" aria-label={label}><input type="checkbox" checked={checked} onChange={onChange} /><i /></label>;
}

function DarkBenefits({ items }) {
  return <div className="settings-ref-benefits">{items.map(({ Icon, title, text }) => <div key={title}><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>;
}

export default function SettingsPanels({
  activeTab, locale, currentUser, currentUserEmail, profileName, setProfileName,
  profileMessage, savingProfile, saveProfile, signOutOtherSessions, exportAccountData,
  notificationPreferences, setNotificationPreferences, notificationMessage,
  savingNotifications, saveNotifications, recommendedLocale, savingLanguage,
  handleLanguageChange, planName, renewalLabel, onDeleteAccount,
}) {
  const sv = String(locale || "").toLowerCase().startsWith("sv");
  const name = profileName || currentUserEmail?.split("@")[0] || (sv ? "Användare" : "User");
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

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
              <button type="button" onClick={exportAccountData}><Download /><span><strong>{sv ? "Exportera kontodata" : "Export account data"}</strong><small>{sv ? "Ladda ner en kopia av dina kontouppgifter och inställningar." : "Download a copy of your account information and settings."}</small></span><ArrowRight /></button>
              <button type="button" className="danger" onClick={onDeleteAccount}><Trash2 /><span><strong>{sv ? "Radera konto" : "Delete account"}</strong><small>{sv ? "Ta bort ditt konto och all tillhörande data permanent." : "Permanently remove your account and all associated data."}</small></span><ArrowRight /></button>
            </div>
          </div>
          {profileMessage && <p className="settings-ref-message">{profileMessage}</p>}
        </div>
        <aside className="settings-ref-account-aside"><h2>{sv ? "Kontoöversikt" : "Account overview"}</h2><dl><dt>{sv ? "Roll" : "Role"}</dt><dd>{sv ? "Ägare" : "Owner"}</dd><dt>{sv ? "Plan" : "Plan"}</dt><dd>{planName}</dd><dt>{sv ? "Medlem sedan" : "Member since"}</dt><dd>{currentUser?.created_at ? new Date(currentUser.created_at).getFullYear() : "—"}</dd></dl><a href="/brand">{sv ? "Hantera arbetsyta" : "Manage workspace"}</a></aside>
        <DarkBenefits items={[
          { Icon: ShieldCheck, title: sv ? "Dina uppgifter är skyddade" : "Your information is protected", text: sv ? "Branschledande säkerhet skyddar din data." : "Industry-leading security protects your data." },
          { Icon: LockKeyhole, title: sv ? "Säker inloggning" : "Secure sign-in", text: sv ? "Stark kryptering och verifierad autentisering." : "Strong encryption and verified authentication." },
          { Icon: Flag, title: sv ? "Svensk datalagring" : "Swedish data storage", text: sv ? "All data lagras säkert i svenska datacenter." : "All data is stored securely in Swedish data centers." },
        ]} />
      </section>
    );
  }

  if (activeTab === "security") {
    return (
      <section className="settings-reference-workspace settings-ref-security">
        <div className="settings-ref-security-main">
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Inloggning" : "Sign-in"}</h3><p>{sv ? "Hantera hur du loggar in på ditt konto." : "Manage how you sign in to your account."}</p></div><div className="settings-ref-card"><header><LockKeyhole /><span><strong>{sv ? "Lösenordsfri inloggning" : "Passwordless sign-in"}</strong><small>{sv ? "Spreelo använder säkra engångskoder och sparar inget kontolösenord." : "Spreelo uses secure one-time codes and stores no account password."}</small></span><em>{sv ? "Aktiv" : "Active"}</em></header><div><strong>{sv ? "Primär e-post" : "Primary email"}</strong><span>{currentUserEmail}</span><em>{sv ? "Verifierad" : "Verified"}</em></div><div><strong>{sv ? "Inloggningskod" : "Sign-in code"}</strong><span>{sv ? "Skickas via e-post" : "Sent by email"}</span><ArrowRight /></div><div><strong>{sv ? "Senast verifierad" : "Last verified"}</strong><span>{currentUser?.last_sign_in_at ? new Date(currentUser.last_sign_in_at).toLocaleDateString(locale) : "—"}</span></div></div></div>
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Aktiva sessioner" : "Active sessions"}</h3><p>{sv ? "Översikt över var du är inloggad." : "Overview of where you are signed in."}</p></div><div className="settings-ref-card sessions"><div><Laptop /><strong>{sv ? "Den här enheten" : "This device"}</strong><em>{sv ? "Aktiv nu" : "Active now"}</em></div></div></div>
          <div className="settings-ref-labelled-section"><div><h3>{sv ? "Säkerhetsåtgärder" : "Security actions"}</h3><p>{sv ? "Extra skydd för ditt konto och din data." : "Extra protection for your account and data."}</p></div><div className="settings-ref-action-rows"><button type="button" onClick={signOutOtherSessions}><LogOut /><span><strong>{sv ? "Logga ut från andra enheter" : "Sign out other devices"}</strong><small>{sv ? "Behåll den här sessionen och avsluta övriga." : "Keep this session and end all others."}</small></span><ArrowRight /></button></div></div>
          {profileMessage && <p className="settings-ref-message">{profileMessage}</p>}
        </div>
        <aside className="settings-ref-security-aside"><h2>{sv ? "Säkerhetsstatus" : "Security status"}</h2><ShieldCheck /><h3>{sv ? "Allt ser bra ut" : "Everything looks good"}</h3><p>{sv ? "Ditt konto är skyddat med starka säkerhetsinställningar." : "Your account is protected with strong security settings."}</p><ul><li><CircleCheck />{sv ? "Lösenordsfri inloggning är aktiv" : "Passwordless sign-in is active"}</li><li><CircleCheck />{sv ? "E-postadressen är verifierad" : "Email address is verified"}</li><li><CircleCheck />{sv ? "Aktiva sessioner ser bra ut" : "Active sessions look good"}</li></ul><button type="button" onClick={signOutOtherSessions}>{sv ? "Logga ut från alla enheter" : "Sign out all devices"}</button></aside>
        <DarkBenefits items={[
          { Icon: KeyRound, title: sv ? "Engångskoder" : "One-time codes", text: sv ? "Säkra koder skickas till din e-post." : "Secure codes are sent to your email." },
          { Icon: LockKeyhole, title: sv ? "Krypterad anslutning" : "Encrypted connection", text: sv ? "All data överförs med stark kryptering." : "All data is transferred with strong encryption." },
          { Icon: Smartphone, title: sv ? "Sessionskontroll" : "Session control", text: sv ? "Se och hantera dina aktiva sessioner." : "View and manage your active sessions." },
        ]} />
      </section>
    );
  }

  if (activeTab === "notifications") {
    const groups = [
      [sv ? "Granskning" : "Review", [["review", sv ? "Innehåll redo för granskning" : "Content ready for review"], ["comments", sv ? "Kommentarer och ändringar" : "Comments and changes"]]],
      [sv ? "Publicering" : "Publishing", [["published", sv ? "Publicering lyckades" : "Publishing succeeded"], ["failed", sv ? "Publicering misslyckades" : "Publishing failed"]]],
      [sv ? "Kampanjer" : "Campaigns", [["campaign_start", sv ? "Kampanj startar" : "Campaign starts"], ["campaign_end", sv ? "Kampanj avslutad" : "Campaign ended"]]],
      [sv ? "Produkt & konto" : "Product & account", [["credits", sv ? "Krediter börjar ta slut" : "Credits running low"], ["account", sv ? "Viktiga kontouppdateringar" : "Important account updates"]]],
    ];
    return (
      <section className="settings-reference-workspace settings-ref-notifications">
        <div className="settings-ref-notification-table"><header><span /><strong>{sv ? "I appen" : "In app"}</strong><strong>{sv ? "E-post" : "Email"}</strong></header>{groups.map(([group, rows]) => <section key={group}><h2>{group}</h2>{rows.map(([key, label]) => <div key={key}><span>{label}</span><Toggle label={`${label} app`} checked={notificationPreferences[`${key}_app`]} onChange={(event) => setNotificationPreferences((current) => ({ ...current, [`${key}_app`]: event.target.checked }))} /><Toggle label={`${label} email`} checked={notificationPreferences[`${key}_email`]} onChange={(event) => setNotificationPreferences((current) => ({ ...current, [`${key}_email`]: event.target.checked }))} /></div>)}</section>)}</div>
        <aside className="settings-ref-delivery"><h2>{sv ? "Leverans" : "Delivery"}</h2><p>{sv ? "E-postadress:" : "Email address:"}<strong>{currentUserEmail}</strong></p><p>{sv ? "Status:" : "Status:"}<em>{sv ? "Verifierad" : "Verified"}</em></p><hr /><label>{sv ? "Sammanfattning:" : "Digest:"}<select><option>{sv ? "Direkt" : "Instant"}</option><option>{sv ? "Dagligen" : "Daily"}</option></select></label><button type="button"><Mail />{sv ? "Skicka testavisering" : "Send test notification"}</button></aside>
        <div className="settings-ref-pause"><Moon /><span>{sv ? "Pausa alla aviseringar" : "Pause all notifications"}</span><Toggle label="Pause notifications" checked={notificationPreferences.paused} onChange={(event) => setNotificationPreferences((current) => ({ ...current, paused: event.target.checked }))} /><p>{sv ? "Kritiska konto- och säkerhetsmeddelanden skickas alltid." : "Critical account and security messages are always sent."}</p></div>
        <div className="settings-ref-save"><button type="button" onClick={saveNotifications} disabled={savingNotifications}><Save />{savingNotifications ? (sv ? "Sparar…" : "Saving…") : (sv ? "Spara aviseringar" : "Save notifications")}</button>{notificationMessage && <p>{notificationMessage}</p>}</div>
        <DarkBenefits items={[
          { Icon: CircleCheck, title: sv ? "Detta ingår i alla planer" : "Included in every plan", text: "" },
          { Icon: Mail, title: sv ? "Alla innehållstyper" : "All content types", text: "" },
          { Icon: CalendarDays, title: sv ? "Kampanjer" : "Campaigns", text: "" },
        ]} />
      </section>
    );
  }

  if (activeTab === "language") {
    const primaryLanguageCodes = Array.from(new Set([recommendedLocale, "sv", "en", "no"])).filter(Boolean).slice(0, 3);
    const primaryLanguages = primaryLanguageCodes.map((code) => SUPPORTED_UI_LOCALES.find((item) => item.locale === code)).filter(Boolean);
    return (
      <section className="settings-reference-workspace settings-ref-language">
        <div className="settings-ref-language-card">
          <div className="settings-ref-language-section"><div><h2>{sv ? "Appspråk" : "App language"}</h2><p>{sv ? "Språkvalet gäller menyer, knappar och inställningar. Ditt skapade innehåll påverkas inte." : "The language applies to menus, buttons and settings. Your created content is not affected."}</p></div><div className="settings-ref-language-list">{primaryLanguages.map((item) => <label key={item.locale}><input type="radio" name="app-language" value={item.locale} checked={recommendedLocale === item.locale} onChange={() => handleLanguageChange(item.locale)} disabled={savingLanguage} /><span>{item.nativeName || item.language}</span><em>{item.locale.toUpperCase()}</em>{recommendedLocale === item.locale && <strong>{sv ? "Aktuellt språk" : "Current language"}</strong>}</label>)}</div></div>
          <div className="settings-ref-language-section compact"><div><h2>{sv ? "Region" : "Region"}</h2></div><select><option>{sv ? "Sverige" : "Sweden"}</option></select></div>
          <div className="settings-ref-language-section date-time"><div><h2>{sv ? "Datum & tid" : "Date & time"}</h2></div><div><label>{sv ? "Tidszon" : "Time zone"}<select><option>Europe/Stockholm</option></select></label><label>{sv ? "Datumformat" : "Date format"}<select><option>{new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</option></select></label><label>{sv ? "Tidsformat" : "Time format"}<select><option>{sv ? "24 timmar" : "24 hours"}</option></select></label></div></div>
          <div className="settings-ref-language-section compact preview"><div><h2>{sv ? "Förhandsvisning" : "Preview"}</h2><p>{sv ? "Så här visas datum och tid i Spreelo." : "This is how dates and times appear in Spreelo."}</p></div><div><span><CalendarDays />{new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</span><span><Clock3 />14:30</span></div></div>
        </div>
        <aside className="settings-ref-language-aside"><h2>{sv ? "Förhandsvisning" : "Preview"}</h2><h3>{sv ? "Välkommen tillbaka" : "Welcome back"}</h3><hr /><strong>{sv ? "Nästa publicering" : "Next publication"}</strong><p>{new Date().toLocaleDateString(locale)} kl. 14:30</p><button type="button" onClick={() => handleLanguageChange(recommendedLocale)}>{sv ? "Spara ändringar" : "Save changes"}</button></aside>
        <DarkBenefits items={[
          { Icon: Globe2, title: sv ? "Svenska menyer" : "English menus", text: "" },
          { Icon: Clock3, title: "Europe/Stockholm", text: "" },
          { Icon: CircleCheck, title: "SEK", text: "" },
        ]} />
      </section>
    );
  }

  return null;
}
