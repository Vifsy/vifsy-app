"use client";

import {
  Check,
  Download,
  KeyRound,
  Languages,
  Laptop,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SUPPORTED_UI_LOCALES, getUiLanguageName } from "../lib/i18n/defaultLabels";

export default function SettingsPanels({
  activeTab,
  locale,
  currentUser,
  currentUserEmail,
  profileName,
  setProfileName,
  profileMessage,
  savingProfile,
  saveProfile,
  signOutOtherSessions,
  exportAccountData,
  notificationPreferences,
  setNotificationPreferences,
  notificationMessage,
  savingNotifications,
  saveNotifications,
  recommendedLocale,
  savingLanguage,
  handleLanguageChange,
}) {
  const sv = String(locale || "").toLowerCase().startsWith("sv");

  if (activeTab === "account") {
    return (
      <section className="settings-unified-panel">
        <header><span className="settings-unified-icon coral"><UserRound /></span><div><p className="eyebrow">{sv ? "KONTO" : "ACCOUNT"}</p><h2>{sv ? "Din profil" : "Your profile"}</h2><p>{sv ? "Hantera dina personliga uppgifter och den information som används i Spreelo." : "Manage your personal details and the information used in Spreelo."}</p></div></header>
        <div className="settings-unified-form-grid">
          <label><span>{sv ? "Namn" : "Name"}</span><input className="input" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={sv ? "Ditt namn" : "Your name"} /></label>
          <label><span>{sv ? "E-postadress" : "Email address"}</span><input className="input" value={currentUserEmail} readOnly /></label>
        </div>
        <div className="settings-unified-actions"><button type="button" className="settings-unified-primary" onClick={saveProfile} disabled={savingProfile}><Save />{savingProfile ? (sv ? "Sparar…" : "Saving…") : (sv ? "Spara ändringar" : "Save changes")}</button>{profileMessage && <p>{profileMessage}</p>}</div>
        <div className="settings-unified-divider" />
        <div className="settings-unified-row"><span className="settings-unified-icon violet"><Download /></span><div><h3>{sv ? "Exportera kontodata" : "Export account data"}</h3><p>{sv ? "Ladda ner dina profil-, språk- och prenumerationsuppgifter som JSON." : "Download your profile, language and subscription data as JSON."}</p></div><button type="button" className="settings-unified-secondary" onClick={exportAccountData}><Download />{sv ? "Exportera" : "Export"}</button></div>
      </section>
    );
  }

  if (activeTab === "security") {
    return (
      <section className="settings-unified-panel">
        <header><span className="settings-unified-icon blue"><ShieldCheck /></span><div><p className="eyebrow">{sv ? "SÄKERHET" : "SECURITY"}</p><h2>{sv ? "Inloggning & sessioner" : "Sign-in & sessions"}</h2><p>{sv ? "Se hur ditt konto skyddas och hantera aktiva inloggningar." : "See how your account is protected and manage active sign-ins."}</p></div></header>
        <div className="settings-unified-security-grid">
          <article><KeyRound /><div><h3>{sv ? "Säker inloggning" : "Secure sign-in"}</h3><p>{sv ? "Ditt konto skyddas av verifierad autentisering." : "Your account is protected by verified authentication."}</p></div><span className="settings-unified-status"><Check />{sv ? "Aktiv" : "Active"}</span></article>
          <article><Laptop /><div><h3>{sv ? "Den här sessionen" : "This session"}</h3><p>{currentUser?.last_sign_in_at ? new Date(currentUser.last_sign_in_at).toLocaleString(locale) : (sv ? "Aktiv nu" : "Active now")}</p></div><span className="settings-unified-status"><Check />{sv ? "Aktiv" : "Active"}</span></article>
        </div>
        <div className="settings-unified-row"><span className="settings-unified-icon amber"><LogOut /></span><div><h3>{sv ? "Logga ut andra enheter" : "Sign out other devices"}</h3><p>{sv ? "Avslutar alla andra sessioner men behåller den här." : "Ends every other session while keeping this one."}</p></div><button type="button" className="settings-unified-secondary" onClick={signOutOtherSessions}><LogOut />{sv ? "Logga ut andra" : "Sign out others"}</button></div>
        {profileMessage && <p className="settings-unified-message">{profileMessage}</p>}
      </section>
    );
  }

  if (activeTab === "notifications") {
    const rows = [
      ["review", sv ? "Inlägg redo för granskning" : "Posts ready for review", sv ? "När nytt innehåll väntar på ditt godkännande." : "When new content is waiting for your approval."],
      ["publishing", sv ? "Publicering & fel" : "Publishing & errors", sv ? "Viktiga statusändringar för schemalagda inlägg." : "Important status changes for scheduled posts."],
      ["product", sv ? "Produktnyheter" : "Product news", sv ? "Nya funktioner, tips och förbättringar från Spreelo." : "New features, tips and improvements from Spreelo."],
    ];
    return (
      <section className="settings-unified-panel">
        <header><span className="settings-unified-icon green"><Mail /></span><div><p className="eyebrow">{sv ? "AVISERINGAR" : "NOTIFICATIONS"}</p><h2>{sv ? "Välj vad Spreelo skickar" : "Choose what Spreelo sends"}</h2><p>{sv ? "Styr viktiga uppdateringar om innehåll, granskning och publicering." : "Control important updates about content, review and publishing."}</p></div></header>
        <div className="settings-unified-toggle-list">{rows.map(([key, title, description]) => <label key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={notificationPreferences[key]} onChange={(event) => setNotificationPreferences((current) => ({ ...current, [key]: event.target.checked }))} /><i /></label>)}</div>
        <div className="settings-unified-actions"><button type="button" className="settings-unified-primary" onClick={saveNotifications} disabled={savingNotifications}><Save />{savingNotifications ? (sv ? "Sparar…" : "Saving…") : (sv ? "Spara aviseringar" : "Save notifications")}</button>{notificationMessage && <p>{notificationMessage}</p>}</div>
      </section>
    );
  }

  if (activeTab === "language") {
    return (
      <section className="settings-unified-panel settings-unified-language">
        <header><span className="settings-unified-icon amber"><Languages /></span><div><p className="eyebrow">{sv ? "SPRÅK" : "LANGUAGE"}</p><h2>{sv ? "Språk i appen" : "App language"}</h2><p>{sv ? "Välj språk för menyer, knappar och systemmeddelanden." : "Choose the language for menus, buttons and system messages."}</p></div></header>
        <label><span>{sv ? "Visningsspråk" : "Display language"}</span><select className="input" value={recommendedLocale} onChange={(event) => handleLanguageChange(event.target.value)} disabled={savingLanguage}>{!recommendedLocale && <option value="">{getUiLanguageName(locale)}</option>}{SUPPORTED_UI_LOCALES.map((item) => <option key={item.locale} value={item.locale}>{item.nativeName || item.language}</option>)}</select><small>{sv ? "Ändringen slår igenom direkt i hela appen." : "The change is applied immediately throughout the app."}</small></label>
      </section>
    );
  }

  return null;
}
