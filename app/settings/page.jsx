"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/AppLayout";
import StripeBillingPanel from "../../components/StripeBillingPanel";
import SettingsPanels from "../../components/SettingsPanels";
import { supabase } from "../../lib/supabaseClient";
import { useUiText } from "../../lib/i18n/useUiText";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Languages,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  SUPPORTED_UI_LOCALES,
  getUiLanguageName,
} from "../../lib/i18n/defaultLabels";

function getBrandStorageKey(userId) {
  return `spreelo_current_brand_id_${userId}`;
}

const SETTINGS_DELETE_COPY = {
  en: {
    confirmation: "Confirmation",
    placeholder: "Type {word}",
    deleteButton: "Delete my account",
    openDeleteDialog: "Delete account",
    deleteModalTitle: "Delete account permanently?",
    deleteModalIntro: "This removes your brands, posts, images, campaign calendars, analyses, social connections and account data permanently.",
    deleteModalWarning: "This cannot be undone.",
    cancel: "Cancel",
    deletingAccount: "Deleting account...",
    deletingMessage: "Deleting your account...",
    errorTypeDelete: "Type {word} to confirm account deletion.",
    confirmDialog: "This will permanently delete your Spreelo account, all brands, posts, content plans, campaign data and social connections. This cannot be undone.",
    reasonLabel: "Why are you deleting your account?",
    reasonOptional: "Optional, but helps us improve Spreelo",
    reasonPlaceholder: "Choose a reason",
    reasonDetailsLabel: "Anything else you want to tell us?",
    reasonDetailsPlaceholder: "Optional details",
    billingNotice: "If you have an active Stripe subscription, Spreelo cancels it automatically before permanently deleting the account.",
    reasonNotUsing: "I do not use Spreelo enough",
    reasonTooExpensive: "Too expensive",
    reasonMissingFeature: "Missing a feature I need",
    reasonHardToUse: "Too hard to use",
    reasonResults: "The results were not good enough",
    reasonPrivacy: "Privacy or data concerns",
    reasonOther: "Other reason",
  },
  sv: {
    confirmation: "Bekräftelse",
    placeholder: "Skriv {word}",
    deleteButton: "Radera mitt konto",
    openDeleteDialog: "Radera konto",
    deleteModalTitle: "Radera konto permanent?",
    deleteModalIntro: "Detta tar bort dina varumärken, inlägg, bilder, kampanjkalendrar, analyser, sociala kopplingar och kontodata permanent.",
    deleteModalWarning: "Detta kan inte ångras.",
    cancel: "Avbryt",
    deletingAccount: "Raderar konto...",
    deletingMessage: "Raderar ditt konto...",
    errorTypeDelete: "Skriv {word} för att bekräfta kontoradering.",
    confirmDialog: "Detta raderar permanent ditt Spreelo-konto, alla varumärken, inlägg, innehållsplaner, kampanjdata och sociala kopplingar. Detta kan inte ångras.",
    reasonLabel: "Varför raderar du kontot?",
    reasonOptional: "Frivilligt, men hjälper oss att förbättra Spreelo",
    reasonPlaceholder: "Välj en orsak",
    reasonDetailsLabel: "Vill du berätta något mer?",
    reasonDetailsPlaceholder: "Frivilliga detaljer",
    billingNotice: "Om du har en aktiv Stripe-prenumeration avslutar Spreelo den automatiskt innan kontot raderas permanent.",
    reasonNotUsing: "Jag använder inte Spreelo tillräckligt",
    reasonTooExpensive: "För dyrt",
    reasonMissingFeature: "Jag saknar en funktion jag behöver",
    reasonHardToUse: "För svårt att använda",
    reasonResults: "Resultatet blev inte tillräckligt bra",
    reasonPrivacy: "Integritet eller datafrågor",
    reasonOther: "Annan orsak",
  },
  es: {
    confirmation: "Confirmación",
    placeholder: "Escribe {word}",
    deleteButton: "Eliminar mi cuenta",
    deletingAccount: "Eliminando cuenta...",
    deletingMessage: "Eliminando tu cuenta...",
    errorTypeDelete: "Escribe {word} para confirmar la eliminación de la cuenta.",
    confirmDialog: "Esto eliminará permanentemente tu cuenta de Spreelo, todas las marcas, publicaciones, planes de contenido, datos de campañas y conexiones sociales. No se puede deshacer.",
  },
  pt: {
    confirmation: "Confirmação",
    placeholder: "Digite {word}",
    deleteButton: "Excluir minha conta",
    deletingAccount: "Excluindo conta...",
    deletingMessage: "Excluindo sua conta...",
    errorTypeDelete: "Digite {word} para confirmar a exclusão da conta.",
    confirmDialog: "Isso excluirá permanentemente sua conta Spreelo, todas as marcas, publicações, planos de conteúdo, dados de campanhas e conexões sociais. Isso não pode ser desfeito.",
  },
  fr: {
    confirmation: "Confirmation",
    placeholder: "Saisissez {word}",
    deleteButton: "Supprimer mon compte",
    deletingAccount: "Suppression du compte...",
    deletingMessage: "Suppression de votre compte...",
    errorTypeDelete: "Saisissez {word} pour confirmer la suppression du compte.",
    confirmDialog: "Cela supprimera définitivement votre compte Spreelo, toutes les marques, publications, plans de contenu, données de campagne et connexions sociales. Cette action est irréversible.",
  },
  de: {
    confirmation: "Bestätigung",
    placeholder: "Gib {word} ein",
    deleteButton: "Mein Konto löschen",
    deletingAccount: "Konto wird gelöscht...",
    deletingMessage: "Dein Konto wird gelöscht...",
    errorTypeDelete: "Gib {word} ein, um die Kontolöschung zu bestätigen.",
    confirmDialog: "Dadurch werden dein Spreelo-Konto, alle Marken, Beiträge, Inhaltspläne, Kampagnendaten und Social-Media-Verbindungen dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
  },
  it: {
    confirmation: "Conferma",
    placeholder: "Scrivi {word}",
    deleteButton: "Elimina il mio account",
    deletingAccount: "Eliminazione account...",
    deletingMessage: "Eliminazione del tuo account...",
    errorTypeDelete: "Scrivi {word} per confermare l'eliminazione dell'account.",
    confirmDialog: "Questo eliminerà definitivamente il tuo account Spreelo, tutti i brand, i post, i piani di contenuto, i dati delle campagne e le connessioni social. L'azione non può essere annullata.",
  },
  nl: {
    confirmation: "Bevestiging",
    placeholder: "Typ {word}",
    deleteButton: "Mijn account verwijderen",
    deletingAccount: "Account verwijderen...",
    deletingMessage: "Je account wordt verwijderd...",
    errorTypeDelete: "Typ {word} om het verwijderen van het account te bevestigen.",
    confirmDialog: "Dit verwijdert permanent je Spreelo-account, alle merken, berichten, contentplannen, campagnedata en sociale koppelingen. Dit kan niet ongedaan worden gemaakt.",
  },
  da: {
    confirmation: "Bekræftelse",
    placeholder: "Skriv {word}",
    deleteButton: "Slet min konto",
    deletingAccount: "Sletter konto...",
    deletingMessage: "Sletter din konto...",
    errorTypeDelete: "Skriv {word} for at bekræfte sletning af kontoen.",
    confirmDialog: "Dette sletter permanent din Spreelo-konto, alle brands, opslag, indholdsplaner, kampagnedata og sociale forbindelser. Dette kan ikke fortrydes.",
  },
  no: {
    confirmation: "Bekreftelse",
    placeholder: "Skriv {word}",
    deleteButton: "Slett kontoen min",
    deletingAccount: "Sletter konto...",
    deletingMessage: "Sletter kontoen din...",
    errorTypeDelete: "Skriv {word} for å bekrefte kontosletting.",
    confirmDialog: "Dette sletter permanent Spreelo-kontoen din, alle merkevarer, innlegg, innholdsplaner, kampanjedata og sosiale tilkoblinger. Dette kan ikke angres.",
  },
  fi: {
    confirmation: "Vahvistus",
    placeholder: "Kirjoita {word}",
    deleteButton: "Poista tilini",
    deletingAccount: "Poistetaan tiliä...",
    deletingMessage: "Poistetaan tiliäsi...",
    errorTypeDelete: "Kirjoita {word} vahvistaaksesi tilin poistamisen.",
    confirmDialog: "Tämä poistaa pysyvästi Spreelo-tilisi, kaikki brändit, julkaisut, sisältösuunnitelmat, kampanjatiedot ja sosiaaliset yhteydet. Tätä ei voi perua.",
  },
  pl: {
    confirmation: "Potwierdzenie",
    placeholder: "Wpisz {word}",
    deleteButton: "Usuń moje konto",
    deletingAccount: "Usuwanie konta...",
    deletingMessage: "Usuwanie Twojego konta...",
    errorTypeDelete: "Wpisz {word}, aby potwierdzić usunięcie konta.",
    confirmDialog: "Spowoduje to trwałe usunięcie konta Spreelo, wszystkich marek, postów, planów treści, danych kampanii i połączeń społecznościowych. Tego nie można cofnąć.",
  },
  tr: {
    confirmation: "Onay",
    placeholder: "{word} yazın",
    deleteButton: "Hesabımı sil",
    deletingAccount: "Hesap siliniyor...",
    deletingMessage: "Hesabınız siliniyor...",
    errorTypeDelete: "Hesap silmeyi onaylamak için {word} yazın.",
    confirmDialog: "Bu işlem Spreelo hesabınızı, tüm markaları, gönderileri, içerik planlarını, kampanya verilerini ve sosyal bağlantıları kalıcı olarak siler. Bu işlem geri alınamaz.",
  },
  ar: {
    confirmation: "تأكيد",
    placeholder: "اكتب {word}",
    deleteButton: "حذف حسابي",
    deletingAccount: "جارٍ حذف الحساب...",
    deletingMessage: "جارٍ حذف حسابك...",
    errorTypeDelete: "اكتب {word} لتأكيد حذف الحساب.",
    confirmDialog: "سيؤدي هذا إلى حذف حساب Spreelo الخاص بك نهائيًا، وكل العلامات التجارية والمنشورات وخطط المحتوى وبيانات الحملات والاتصالات الاجتماعية. لا يمكن التراجع عن ذلك.",
  },
  hi: {
    confirmation: "पुष्टि",
    placeholder: "{word} लिखें",
    deleteButton: "मेरा खाता हटाएँ",
    deletingAccount: "खाता हटाया जा रहा है...",
    deletingMessage: "आपका खाता हटाया जा रहा है...",
    errorTypeDelete: "खाता हटाने की पुष्टि के लिए {word} लिखें.",
    confirmDialog: "यह आपके Spreelo खाते, सभी ब्रांड, पोस्ट, कंटेंट प्लान, अभियान डेटा और सोशल कनेक्शन को स्थायी रूप से हटा देगा। इसे वापस नहीं किया जा सकता।",
  },
  id: {
    confirmation: "Konfirmasi",
    placeholder: "Ketik {word}",
    deleteButton: "Hapus akun saya",
    deletingAccount: "Menghapus akun...",
    deletingMessage: "Menghapus akun Anda...",
    errorTypeDelete: "Ketik {word} untuk mengonfirmasi penghapusan akun.",
    confirmDialog: "Ini akan menghapus akun Spreelo Anda secara permanen, semua brand, postingan, rencana konten, data kampanye, dan koneksi sosial. Tindakan ini tidak dapat dibatalkan.",
  },
  ja: {
    confirmation: "確認",
    placeholder: "{word} と入力",
    deleteButton: "アカウントを削除",
    deletingAccount: "アカウントを削除中...",
    deletingMessage: "アカウントを削除しています...",
    errorTypeDelete: "アカウント削除を確認するには {word} と入力してください。",
    confirmDialog: "Spreeloアカウント、すべてのブランド、投稿、コンテンツプラン、キャンペーンデータ、SNS接続が完全に削除されます。この操作は元に戻せません。",
  },
  ko: {
    confirmation: "확인",
    placeholder: "{word} 입력",
    deleteButton: "내 계정 삭제",
    deletingAccount: "계정 삭제 중...",
    deletingMessage: "계정을 삭제하는 중...",
    errorTypeDelete: "계정 삭제를 확인하려면 {word}를 입력하세요.",
    confirmDialog: "Spreelo 계정, 모든 브랜드, 게시물, 콘텐츠 계획, 캠페인 데이터 및 소셜 연결이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
  },
  zh: {
    confirmation: "确认",
    placeholder: "输入 {word}",
    deleteButton: "删除我的账户",
    deletingAccount: "正在删除账户...",
    deletingMessage: "正在删除你的账户...",
    errorTypeDelete: "输入 {word} 以确认删除账户。",
    confirmDialog: "这将永久删除你的 Spreelo 账户、所有品牌、帖子、内容计划、活动数据和社交连接。此操作无法撤销。",
  },
  th: {
    confirmation: "การยืนยัน",
    placeholder: "พิมพ์ {word}",
    deleteButton: "ลบบัญชีของฉัน",
    deletingAccount: "กำลังลบบัญชี...",
    deletingMessage: "กำลังลบบัญชีของคุณ...",
    errorTypeDelete: "พิมพ์ {word} เพื่อยืนยันการลบบัญชี",
    confirmDialog: "การดำเนินการนี้จะลบบัญชี Spreelo แบรนด์ โพสต์ แผนเนื้อหา ข้อมูลแคมเปญ และการเชื่อมต่อโซเชียลทั้งหมดอย่างถาวร ไม่สามารถย้อนกลับได้",
  },
  uk: {
    confirmation: "Підтвердження",
    placeholder: "Введіть {word}",
    deleteButton: "Видалити мій акаунт",
    deletingAccount: "Видалення акаунта...",
    deletingMessage: "Ваш акаунт видаляється...",
    errorTypeDelete: "Введіть {word}, щоб підтвердити видалення акаунта.",
    confirmDialog: "Це назавжди видалить ваш акаунт Spreelo, усі бренди, дописи, контент-плани, дані кампаній і соціальні підключення. Цю дію не можна скасувати.",
  },
  ru: {
    confirmation: "Подтверждение",
    placeholder: "Введите {word}",
    deleteButton: "Удалить мой аккаунт",
    deletingAccount: "Удаление аккаунта...",
    deletingMessage: "Ваш аккаунт удаляется...",
    errorTypeDelete: "Введите {word}, чтобы подтвердить удаление аккаунта.",
    confirmDialog: "Это навсегда удалит ваш аккаунт Spreelo, все бренды, публикации, контент-планы, данные кампаний и социальные подключения. Это действие нельзя отменить.",
  },
  bg: {
    confirmation: "Потвърждение",
    placeholder: "Въведете {word}",
    deleteButton: "Изтрий моя акаунт",
    deletingAccount: "Акаунтът се изтрива...",
    deletingMessage: "Вашият акаунт се изтрива...",
    errorTypeDelete: "Въведете {word}, за да потвърдите изтриването на акаунта.",
    confirmDialog: "Това ще изтрие завинаги вашия Spreelo акаунт, всички брандове, публикации, планове за съдържание, данни за кампании и социални връзки. Това действие не може да бъде отменено.",
  },
  vi: {
    confirmation: "Xác nhận",
    placeholder: "Nhập {word}",
    deleteButton: "Xóa tài khoản của tôi",
    deletingAccount: "Đang xóa tài khoản...",
    deletingMessage: "Đang xóa tài khoản của bạn...",
    errorTypeDelete: "Nhập {word} để xác nhận xóa tài khoản.",
    confirmDialog: "Thao tác này sẽ xóa vĩnh viễn tài khoản Spreelo, tất cả thương hiệu, bài đăng, kế hoạch nội dung, dữ liệu chiến dịch và kết nối mạng xã hội của bạn. Không thể hoàn tác.",
  },
  cs: {
    confirmation: "Potvrzení",
    placeholder: "Zadejte {word}",
    deleteButton: "Smazat můj účet",
    deletingAccount: "Účet se odstraňuje...",
    deletingMessage: "Váš účet se odstraňuje...",
    errorTypeDelete: "Zadejte {word} pro potvrzení odstranění účtu.",
    confirmDialog: "Tímto trvale odstraníte svůj účet Spreelo, všechny značky, příspěvky, obsahové plány, data kampaní a propojení se sociálními sítěmi. Tuto akci nelze vrátit zpět.",
  },
  ro: {
    confirmation: "Confirmare",
    placeholder: "Introduceți {word}",
    deleteButton: "Șterge contul meu",
    deletingAccount: "Se șterge contul...",
    deletingMessage: "Contul dvs. este șters...",
    errorTypeDelete: "Introduceți {word} pentru a confirma ștergerea contului.",
    confirmDialog: "Aceasta va șterge definitiv contul Spreelo, toate brandurile, postările, planurile de conținut, datele campaniilor și conexiunile sociale. Acțiunea nu poate fi anulată.",
  },
  hu: {
    confirmation: "Megerősítés",
    placeholder: "Írja be: {word}",
    deleteButton: "Fiókom törlése",
    deletingAccount: "Fiók törlése...",
    deletingMessage: "A fiókja törlése folyamatban van...",
    errorTypeDelete: "A fiók törlésének megerősítéséhez írja be: {word}.",
    confirmDialog: "Ez véglegesen törli Spreelo-fiókját, minden márkát, bejegyzést, tartalomtervet, kampányadatot és közösségimédia-kapcsolatot. A művelet nem vonható vissza.",
  },
  el: {
    confirmation: "Επιβεβαίωση",
    placeholder: "Πληκτρολογήστε {word}",
    deleteButton: "Διαγραφή του λογαριασμού μου",
    deletingAccount: "Διαγραφή λογαριασμού...",
    deletingMessage: "Ο λογαριασμός σας διαγράφεται...",
    errorTypeDelete: "Πληκτρολογήστε {word} για να επιβεβαιώσετε τη διαγραφή του λογαριασμού.",
    confirmDialog: "Αυτό θα διαγράψει οριστικά τον λογαριασμό Spreelo, όλες τις επωνυμίες, τις αναρτήσεις, τα πλάνα περιεχομένου, τα δεδομένα καμπανιών και τις συνδέσεις κοινωνικών δικτύων. Η ενέργεια δεν αναιρείται.",
  },
  ms: {
    confirmation: "Pengesahan",
    placeholder: "Taip {word}",
    deleteButton: "Padam akaun saya",
    deletingAccount: "Memadam akaun...",
    deletingMessage: "Akaun anda sedang dipadam...",
    errorTypeDelete: "Taip {word} untuk mengesahkan pemadaman akaun.",
    confirmDialog: "Tindakan ini akan memadamkan akaun Spreelo anda, semua jenama, siaran, pelan kandungan, data kempen dan sambungan sosial secara kekal. Tindakan ini tidak boleh dibuat asal.",
  },
  fil: {
    confirmation: "Kumpirmasyon",
    placeholder: "I-type ang {word}",
    deleteButton: "I-delete ang aking account",
    deletingAccount: "Dine-delete ang account...",
    deletingMessage: "Dine-delete ang iyong account...",
    errorTypeDelete: "I-type ang {word} upang kumpirmahin ang pag-delete ng account.",
    confirmDialog: "Permanente nitong ide-delete ang iyong Spreelo account, lahat ng brand, post, content plan, campaign data, at social connection. Hindi ito maaaring bawiin.",
  },
};

function getLocaleBase(locale) {
  return String(locale || "en").toLowerCase().split("-")[0];
}

const PUBLISHING_TIME_ZONES = [
  "UTC", "Europe/Stockholm", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDeleteCopy(value, word) {
  return String(value || "").replaceAll("{word}", word);
}

function getDeleteCopy(locale, key, word, fallback) {
  const copy = SETTINGS_DELETE_COPY[getLocaleBase(locale)] || SETTINGS_DELETE_COPY.en;
  return formatDeleteCopy(copy[key] || fallback || SETTINGS_DELETE_COPY.en[key], word);
}

export default function Settings() {
  const { t, locale, setLocale } = useUiText(["settings", "layout"]);

  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("account");
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState({
    review_app: true, review_email: true,
    comments_app: true, comments_email: false,
    published_app: true, published_email: true,
    failed_app: true, failed_email: true,
    campaign_start_app: true, campaign_start_email: true,
    campaign_end_app: true, campaign_end_email: true,
    credits_app: true, credits_email: true,
    account_app: true, account_email: false,
    paused: false,
  });
  const [creditBalance, setCreditBalance] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [publishingTimeZone, setPublishingTimeZone] = useState("Europe/Stockholm");
  const [publishingTimeZoneDraft, setPublishingTimeZoneDraft] = useState("Europe/Stockholm");
  const [savingTimeZone, setSavingTimeZone] = useState(false);
  const [currentBrandProfile, setCurrentBrandProfile] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonDetails, setDeleteReasonDetails] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const recommendedLocale = SUPPORTED_UI_LOCALES.some(
    (item) => item.locale === locale
  )
    ? locale
    : "";
  const deleteConfirmWord = String(t("settings.deleteConfirmWord") || "DELETE").trim() || "DELETE";
  const deleteConfirmationLabel = getDeleteCopy(locale, "confirmation", deleteConfirmWord, t("settings.confirmation"));
  const deletePlaceholder = getDeleteCopy(locale, "placeholder", deleteConfirmWord, t("settings.confirmPlaceholder", { word: deleteConfirmWord }));
  const deleteButtonLabel = getDeleteCopy(locale, "deleteButton", deleteConfirmWord, t("settings.deleteButton"));
  const deletingAccountLabel = getDeleteCopy(locale, "deletingAccount", deleteConfirmWord, t("settings.deletingAccount"));
  const deleteReasonOptions = [
    ["not_using", getDeleteCopy(locale, "reasonNotUsing", deleteConfirmWord, "I do not use Spreelo enough")],
    ["too_expensive", getDeleteCopy(locale, "reasonTooExpensive", deleteConfirmWord, "Too expensive")],
    ["missing_feature", getDeleteCopy(locale, "reasonMissingFeature", deleteConfirmWord, "Missing a feature I need")],
    ["hard_to_use", getDeleteCopy(locale, "reasonHardToUse", deleteConfirmWord, "Too hard to use")],
    ["results_not_good_enough", getDeleteCopy(locale, "reasonResults", deleteConfirmWord, "The results were not good enough")],
    ["privacy_data", getDeleteCopy(locale, "reasonPrivacy", deleteConfirmWord, "Privacy or data concerns")],
    ["other", getDeleteCopy(locale, "reasonOther", deleteConfirmWord, "Other reason")],
  ];

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);
      setCurrentUserEmail(user?.email || "");
      setProfileName(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
      const loadedTimeZone = user?.user_metadata?.publishing_timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "Europe/Stockholm";
      setPublishingTimeZone(loadedTimeZone);
      setPublishingTimeZoneDraft(loadedTimeZone);
      setNotificationPreferences({
        review_app: user?.user_metadata?.notification_preferences?.review_app !== false,
        review_email: user?.user_metadata?.notification_preferences?.review_email !== false,
        comments_app: user?.user_metadata?.notification_preferences?.comments_app !== false,
        comments_email: user?.user_metadata?.notification_preferences?.comments_email === true,
        published_app: user?.user_metadata?.notification_preferences?.published_app !== false,
        published_email: user?.user_metadata?.notification_preferences?.published_email !== false,
        failed_app: user?.user_metadata?.notification_preferences?.failed_app !== false,
        failed_email: user?.user_metadata?.notification_preferences?.failed_email !== false,
        campaign_start_app: user?.user_metadata?.notification_preferences?.campaign_start_app !== false,
        campaign_start_email: user?.user_metadata?.notification_preferences?.campaign_start_email !== false,
        campaign_end_app: user?.user_metadata?.notification_preferences?.campaign_end_app !== false,
        campaign_end_email: user?.user_metadata?.notification_preferences?.campaign_end_email !== false,
        credits_app: user?.user_metadata?.notification_preferences?.credits_app !== false,
        credits_email: user?.user_metadata?.notification_preferences?.credits_email !== false,
        account_app: user?.user_metadata?.notification_preferences?.account_app !== false,
        account_email: user?.user_metadata?.notification_preferences?.account_email === true,
        paused: user?.user_metadata?.notification_preferences?.paused === true,
      });

      if (user?.id) {
        setLoadingCredits(true);
        const selectedBrandId = typeof window !== "undefined"
          ? localStorage.getItem(getBrandStorageKey(user.id))
          : "";
        const { data: brandRows } = await supabase
          .from("brand_profiles")
          .select("id, business_name, website_url, is_default, created_at")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true });
        const brands = brandRows || [];
        const brandData = brands.find((brand) => brand.id === selectedBrandId) || brands[0] || null;
        setCurrentBrandProfile(brandData);
        const { data: creditData } = await supabase
          .from("user_credit_balances")
          .select("credits_remaining, monthly_credit_limit, plan_name, subscription_status, subscription_plan, current_period_end, credits_renewed_at, next_credit_refresh_at, cancel_at_period_end, payment_provider, provider_customer_id, provider_subscription_id, subscription_price_amount, subscription_currency, subscription_interval, subscription_price_lookup_key, purchased_credits_remaining, trial_start, trial_end, pending_subscription_plan, pending_subscription_lookup_key, pending_subscription_effective_at, provider_subscription_schedule_id")
          .eq("user_id", user.id)
          .maybeSingle();
        setCreditBalance(creditData || null);
        setLoadingCredits(false);
      } else {
        setLoadingCredits(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (["account", "security", "notifications", "language", "billing"].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, []);

  useEffect(() => {
    function syncAvatar(event) {
      if (event?.detail?.user) setCurrentUser(event.detail.user);
    }
    window.addEventListener("spreelo-avatar-updated", syncAvatar);
    return () => window.removeEventListener("spreelo-avatar-updated", syncAvatar);
  }, []);

  const planName = useMemo(() => {
    const raw = String(creditBalance?.plan_name || creditBalance?.subscription_plan || "Free").trim();
    return raw.replace(/^plan\s*:\s*/i, "") || "Free";
  }, [creditBalance]);

  const creditRemaining = Number(creditBalance?.credits_remaining || 0);
  const creditLimit = Number(creditBalance?.monthly_credit_limit || 0);
  const creditPercent = creditLimit > 0 ? Math.max(0, Math.min(100, (creditRemaining / creditLimit) * 100)) : 0;

  const renewalLabel = useMemo(() => {
    const value = creditBalance?.current_period_end || creditBalance?.credits_renewed_at;
    if (!value) return t("settings.renewalUnknown");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("settings.renewalUnknown");
    try {
      return new Intl.DateTimeFormat(locale || "en", { day: "numeric", month: "short", year: "numeric" }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }, [creditBalance, locale, t]);

  const settingsTabTitle = {
    account: t("settings.accountPageTitle"),
    security: t("settings.securityPageTitle"),
    notifications: t("settings.notificationsPageTitle"),
    language: t("settings.languagePageTitle"),
    billing: t("settings.billingPageTitle"),
  }[activeTab];

  async function handleLanguageChange(nextLocale) {
    if (!nextLocale || savingLanguage) return;

    setSavingLanguage(true);
    setLocale(nextLocale);

    try {
      await supabase.auth.updateUser({
        data: {
          app_language: nextLocale,
        },
      });
    } catch {
      // The local UI language has already changed. Server-side email language will
      // fall back to brand/content language if user metadata cannot be updated.
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleTimeZoneChange(nextTimeZone) {
    if (!nextTimeZone || savingTimeZone || !currentUser?.id) return;

    setSavingTimeZone(true);
    setProfileMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t("settings.signInAgain"));

      const response = await fetch("/api/settings/timezone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timeZone: nextTimeZone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Timezone could not be saved.");

      setPublishingTimeZone(nextTimeZone);
      setPublishingTimeZoneDraft(nextTimeZone);
      setCurrentUser((current) => current ? {
        ...current,
        user_metadata: { ...(current.user_metadata || {}), publishing_timezone: nextTimeZone },
      } : current);
      setProfileMessage(t("settings.timeZoneSavedMessage", { count: result.updatedRules || 0 }));
    } catch (error) {
      setProfileMessage(error?.message || t("settings.timeZoneSaveError"));
    } finally {
      setSavingTimeZone(false);
    }
  }

  function selectTab(tab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url);
  }

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileMessage("");
    const { error } = await supabase.auth.updateUser({ data: { full_name: profileName.trim() } });
    setProfileMessage(error ? error.message : t("settings.profileSaved"));
    setSavingProfile(false);
  }

  async function saveNotifications() {
    if (savingNotifications) return;
    setSavingNotifications(true);
    setNotificationMessage("");
    const { error } = await supabase.auth.updateUser({
      data: { notification_preferences: notificationPreferences },
    });
    setNotificationMessage(error ? error.message : t("settings.notificationsSaved"));
    setSavingNotifications(false);
  }

  async function signOutOtherSessions() {
    setProfileMessage("");
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setProfileMessage(error ? error.message : t("settings.otherSessionsSignedOut"));
  }

  function exportAccountData() {
    const exportedAt = new Date();
    const nextRefresh = creditBalance?.next_credit_refresh_at || creditBalance?.current_period_end;
    const priceAmount = Number(creditBalance?.subscription_price_amount || 0) / 100;
    const status = String(creditBalance?.subscription_status || "").replaceAll("_", " ") || "—";
    const rows = [
      [t("settings.exportName"), profileName || "—"],
      [t("settings.emailAddress"), currentUserEmail || "—"],
      [t("settings.exportAppLanguage"), locale || "—"],
      [t("settings.exportPublishingTimeZone"), publishingTimeZone || "—"],
      [t("settings.planLabel"), planName],
      [t("settings.exportSubscriptionStatus"), status],
      [t("settings.exportAvailableCredits"), creditRemaining],
      [t("settings.exportPlanCredits"), creditLimit || "—"],
      [t("settings.exportPurchasedCredits"), Number(creditBalance?.purchased_credits_remaining || 0)],
      [t("settings.exportNextRefresh"), nextRefresh ? new Date(nextRefresh).toLocaleString(locale, { dateStyle: "long", timeStyle: "short", timeZone: publishingTimeZone }) : "—"],
      [t("settings.exportPrice"), priceAmount ? `${priceAmount.toLocaleString(locale)} ${creditBalance?.subscription_currency || "SEK"} / ${creditBalance?.subscription_interval === "year" ? t("settings.exportYear") : t("settings.exportMonth")}` : "—"],
    ];
    const rowHtml = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
    const documentTitle = t("settings.exportTitle");
    const createdLabel = t("settings.exportCreated", { date: exportedAt.toLocaleString(locale) });
    const note = t("settings.exportNote");
    const html = `<!doctype html><html lang="${escapeHtml(getLocaleBase(locale))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${documentTitle}</title><style>body{margin:0;background:#f5f7fa;color:#102036;font:16px/1.55 Arial,sans-serif}.page{max-width:760px;margin:40px auto;padding:0 20px}.card{overflow:hidden;border:1px solid #dce3eb;border-radius:18px;background:#fff;box-shadow:0 18px 50px rgba(3,23,42,.10)}header{padding:30px;background:#03172a;color:#fff}h1{margin:0 0 8px;font-size:30px}header p{margin:0;color:#cfdae5}.content{padding:12px 30px 30px}table{width:100%;border-collapse:collapse}th,td{padding:15px 0;border-bottom:1px solid #e4e8ed;text-align:left;vertical-align:top}th{width:45%;color:#5b6b81;font-size:14px}td{font-weight:700}.note{margin:24px 0 0;padding:16px;border-radius:12px;background:#fff3ee;color:#6d392d;font-size:13px}@media(max-width:600px){.page{margin:16px auto}.content,header{padding:22px}th,td{display:block;width:auto}th{padding-bottom:3px;border:0}td{padding-top:0}}</style></head><body><main class="page"><section class="card"><header><h1>${documentTitle}</h1><p>${escapeHtml(createdLabel)}</p></header><div class="content"><table>${rowHtml}</table><p class="note">${escapeHtml(note)}</p></div></section></main></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spreelo-account-summary-${exportedAt.toISOString().slice(0, 10)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;

    if (confirmText.trim().toLocaleLowerCase() !== deleteConfirmWord.toLocaleLowerCase()) {
      setDeleteMessage(getDeleteCopy(locale, "errorTypeDelete", deleteConfirmWord, t("settings.errorTypeDelete", { word: deleteConfirmWord })));
      return;
    }

    setDeletingAccount(true);
    setDeleteMessage(getDeleteCopy(locale, "deletingMessage", deleteConfirmWord, t("settings.deletingMessage")));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: deleteReason || "not_provided",
          reason_details: deleteReasonDetails || "",
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || t("settings.errorDeleteAccount"));
      }

      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch (error) {
      setDeleteMessage(error.message || t("settings.errorDeleteAccount"));
      setDeletingAccount(false);
    }
  }

  return (
    <AppLayout active="settings">
      <div className="settings-reference-page">
        <header className="settings-reference-header">
          <h1>{settingsTabTitle}</h1>
          <div className="settings-reference-credits"><span /><div><small>{t("settings.availableCredits")}</small><strong>{creditRemaining} <em>{creditLimit ? `/ ${t("settings.planCreditsMonthly", { count: creditLimit })}` : ""}</em></strong></div></div>
        </header>
        <nav className="settings-reference-tabs" aria-label={t("settings.quickSettingsLabel")}>
          <button type="button" className={activeTab === "account" ? "active" : ""} onClick={() => selectTab("account")}><UserRound />{t("settings.accountTab")}</button>
          <button type="button" className={activeTab === "security" ? "active" : ""} onClick={() => selectTab("security")}><ShieldCheck />{t("settings.securityTab")}</button>
          <button type="button" className={activeTab === "notifications" ? "active" : ""} onClick={() => selectTab("notifications")}><Bell />{t("settings.notificationsTab")}</button>
          <button type="button" className={activeTab === "language" ? "active" : ""} onClick={() => selectTab("language")}><Languages />{t("settings.languageTab")}</button>
          <button type="button" className={activeTab === "billing" ? "active" : ""} onClick={() => selectTab("billing")}><CreditCard />{t("settings.billingTab")}</button>
        </nav>
        <section className="settings-v14379-overview">
          <header className="settings-v14339-hero settings-v14379-hero">
            <div>
              <p className="eyebrow">{t("settings.eyebrow")}</p>
              <h2>{t("settings.title")}</h2>
              <p>{t("settings.heroText")}</p>
            </div>
          </header>

          <nav className="settings-unified-tabs" aria-label={t("settings.quickSettingsLabel")}>
            <button type="button" className={activeTab === "account" ? "active" : ""} onClick={() => selectTab("account")}><UserRound />{t("settings.accountTitle")}</button>
            <button type="button" className={activeTab === "security" ? "active" : ""} onClick={() => selectTab("security")}><ShieldCheck />{t("settings.securityTitle")}</button>
            <button type="button" className={activeTab === "notifications" ? "active" : ""} onClick={() => selectTab("notifications")}><Bell />{t("settings.notificationsTitle")}</button>
            <button type="button" className={activeTab === "language" ? "active" : ""} onClick={() => selectTab("language")}><Languages />{t("settings.languageTitle")}</button>
            <button type="button" className={activeTab === "billing" ? "active" : ""} onClick={() => selectTab("billing")}><CreditCard />{t("settings.planSubscriptionTitle")}</button>
          </nav>
          <section className="settings-v14379-quick-grid settings-unified-legacy-cards" aria-label={t("settings.quickSettingsLabel")}>
            <article className="settings-v14379-quick-card">
              <span className="settings-v14339-icon coral"><UserRound size={20} /></span>
              <div>
                <h3>{t("settings.accountTitle")}</h3>
                <p>{t("settings.accountTextShort")}</p>
                <strong className="settings-v14379-inline-value">{currentUserEmail || t("settings.signedInUserFallback")}</strong>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </article>

            <article className="settings-v14379-quick-card settings-v14379-language-card">
              <span className="settings-v14339-icon amber"><Languages size={20} /></span>
              <div>
                <h3>{t("settings.languageTitle")}</h3>
                <p>{t("settings.languageTextShort")}</p>
                <select className="input" value={recommendedLocale} onChange={(event) => handleLanguageChange(event.target.value)} disabled={savingLanguage}>
                  {!recommendedLocale && <option value="">{getUiLanguageName(locale)}</option>}
                  {SUPPORTED_UI_LOCALES.map((item) => <option key={item.locale} value={item.locale}>{item.nativeName || item.language}</option>)}
                </select>
              </div>
            </article>

            <article className="settings-v14379-quick-card">
              <span className="settings-v14339-icon violet"><CreditCard size={20} /></span>
              <div>
                <h3>{t("settings.planSubscriptionTitle")}</h3>
                <p>{t("settings.planSubscriptionText")}</p>
                <div className="settings-v14379-plan-summary">
                  <strong>{planName}</strong>
                  <span>{creditRemaining} / {creditLimit || "—"} {t("layout.creditsLeft")}</span>
                </div>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </article>

            <article className="settings-v14379-quick-card">
              <span className="settings-v14339-icon lavender"><Bell size={20} /></span>
              <div>
                <h3>{t("settings.alertsTitle")}</h3>
                <p>{t("settings.alertsText")}</p>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </article>

            <article className="settings-v14379-quick-card">
              <span className="settings-v14339-icon blue"><ShieldCheck size={20} /></span>
              <div>
                <h3>{t("settings.securityTitle")}</h3>
                <p>{t("settings.securityText")}</p>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </article>

            <article className="settings-v14379-quick-card">
              <span className="settings-v14339-icon green"><Mail size={20} /></span>
              <div>
                <h3>{t("settings.notificationsTitle")}</h3>
                <p>{t("settings.notificationsText")}</p>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </article>
          </section>
        </section>

        <SettingsPanels
          activeTab={activeTab}
          locale={locale}
          currentUser={currentUser}
          currentUserEmail={currentUserEmail}
          profileName={profileName}
          setProfileName={setProfileName}
          profileMessage={profileMessage}
          savingProfile={savingProfile}
          saveProfile={saveProfile}
          signOutOtherSessions={signOutOtherSessions}
          exportAccountData={exportAccountData}
          notificationPreferences={notificationPreferences}
          setNotificationPreferences={setNotificationPreferences}
          notificationMessage={notificationMessage}
          savingNotifications={savingNotifications}
          saveNotifications={saveNotifications}
          recommendedLocale={recommendedLocale}
          savingLanguage={savingLanguage}
          handleLanguageChange={handleLanguageChange}
          publishingTimeZone={publishingTimeZone}
          publishingTimeZoneDraft={publishingTimeZoneDraft}
          setPublishingTimeZoneDraft={setPublishingTimeZoneDraft}
          savingTimeZone={savingTimeZone}
          handleTimeZoneChange={handleTimeZoneChange}
          publishingTimeZoneOptions={PUBLISHING_TIME_ZONES}
          planName={planName}
          currentBrandName={currentBrandProfile?.business_name || ""}
          currentBrandWebsite={currentBrandProfile?.website_url || ""}
          requestProfileImageChange={() => window.dispatchEvent(new Event("spreelo-avatar-picker-requested"))}
          creditRemaining={creditRemaining}
          creditLimit={creditLimit}
          renewalLabel={renewalLabel}
          onDeleteAccount={() => { setDeleteMessage(""); setDeleteModalOpen(true); }}
        />

        {activeTab === "billing" && <StripeBillingPanel initialBalance={creditBalance} onBalanceChange={setCreditBalance} />}

        {activeTab === "account" && <section className="settings-danger-zone settings-danger-zone-compact settings-v14339-danger settings-v14379-danger">
          <div>
            <p className="eyebrow danger-eyebrow">{t("settings.dangerEyebrow")}</p>
            <h3>{t("settings.deleteTitle")}</h3>
            <p>{t("settings.deleteText")}</p>
          </div>
          <button type="button" className="danger-button compact" onClick={() => { setDeleteMessage(""); setDeleteModalOpen(true); }} disabled={deletingAccount}>
            {getDeleteCopy(locale, "openDeleteDialog", deleteConfirmWord, deleteButtonLabel)}
          </button>
        </section>}

      {deleteModalOpen && (
        <div className="settings-modal-backdrop" role="presentation">
          <div
            className="settings-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-modal-title"
          >
            <button
              type="button"
              className="settings-modal-close"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingAccount}
              aria-label={getDeleteCopy(locale, "cancel", deleteConfirmWord, "Cancel")}
            >
              ×
            </button>

            <p className="eyebrow danger-eyebrow">
              {t("settings.dangerEyebrow")}
            </p>
            <h3 id="delete-account-modal-title">
              {getDeleteCopy(locale, "deleteModalTitle", deleteConfirmWord, "Delete account permanently?")}
            </h3>
            <p>
              {getDeleteCopy(locale, "deleteModalIntro", deleteConfirmWord, getDeleteCopy(locale, "confirmDialog", deleteConfirmWord, t("settings.deleteConfirmDialog")))}
            </p>
            <p className="danger-warning">
              {getDeleteCopy(locale, "deleteModalWarning", deleteConfirmWord, "This cannot be undone.")}
            </p>

            <div className="settings-delete-form">
              <label>{getDeleteCopy(locale, "reasonLabel", deleteConfirmWord, "Why are you deleting your account?")}</label>
              <select
                className="input"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                disabled={deletingAccount}
              >
                <option value="">
                  {getDeleteCopy(locale, "reasonPlaceholder", deleteConfirmWord, "Choose a reason")}
                </option>
                {deleteReasonOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p>{getDeleteCopy(locale, "reasonOptional", deleteConfirmWord, "Optional, but helps us improve Spreelo")}</p>

              <label>{getDeleteCopy(locale, "reasonDetailsLabel", deleteConfirmWord, "Anything else you want to tell us?")}</label>
              <textarea
                className="input"
                rows={3}
                value={deleteReasonDetails}
                onChange={(event) => setDeleteReasonDetails(event.target.value)}
                placeholder={getDeleteCopy(locale, "reasonDetailsPlaceholder", deleteConfirmWord, "Optional details")}
                disabled={deletingAccount}
              />

              <label>{deleteConfirmationLabel}</label>
              <input
                className="input"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={deletePlaceholder}
                disabled={deletingAccount}
              />

              <p>{getDeleteCopy(locale, "billingNotice", deleteConfirmWord, "If you have an active Stripe subscription, Spreelo cancels it automatically before permanently deleting the account.")}</p>
            </div>

            {deleteMessage && (
              <p className="settings-delete-message">{deleteMessage}</p>
            )}

            <div className="settings-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletingAccount}
              >
                {getDeleteCopy(locale, "cancel", deleteConfirmWord, "Cancel")}
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? deletingAccountLabel : deleteButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
