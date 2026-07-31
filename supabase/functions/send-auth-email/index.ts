import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type Copy = {
  subject: string;
  title: string;
  intro: string;
  code: string;
  expires: string;
  ignore: string;
};

type HookPayload = {
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token?: string;
    redirect_to?: string;
  };
};

const copyByLocale: Record<string, Copy> = {
  en: { subject: "Your Spreelo sign-in code", title: "Welcome to Spreelo", intro: "Use this code to sign in or create your Spreelo account.", code: "Your secure code", expires: "The code expires shortly.", ignore: "If you did not request this email, you can safely ignore it." },
  sv: { subject: "Din inloggningskod till Spreelo", title: "Välkommen till Spreelo", intro: "Använd koden för att logga in eller skapa ditt Spreelo-konto.", code: "Din säkra kod", expires: "Koden upphör snart att gälla.", ignore: "Om du inte begärde detta mejl kan du ignorera det." },
  es: { subject: "Tu código de acceso a Spreelo", title: "Te damos la bienvenida a Spreelo", intro: "Usa este código para iniciar sesión o crear tu cuenta de Spreelo.", code: "Tu código seguro", expires: "El código caducará pronto.", ignore: "Si no solicitaste este correo, puedes ignorarlo." },
  pt: { subject: "O seu código de acesso ao Spreelo", title: "Bem-vindo ao Spreelo", intro: "Use este código para iniciar sessão ou criar a sua conta Spreelo.", code: "O seu código seguro", expires: "O código expira em breve.", ignore: "Se não pediu este e-mail, pode ignorá-lo." },
  fr: { subject: "Votre code de connexion Spreelo", title: "Bienvenue sur Spreelo", intro: "Utilisez ce code pour vous connecter ou créer votre compte Spreelo.", code: "Votre code sécurisé", expires: "Ce code expirera bientôt.", ignore: "Si vous n’avez pas demandé cet e-mail, vous pouvez l’ignorer." },
  de: { subject: "Ihr Spreelo-Anmeldecode", title: "Willkommen bei Spreelo", intro: "Mit diesem Code können Sie sich anmelden oder Ihr Spreelo-Konto erstellen.", code: "Ihr sicherer Code", expires: "Der Code läuft in Kürze ab.", ignore: "Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren." },
  it: { subject: "Il tuo codice di accesso a Spreelo", title: "Benvenuto su Spreelo", intro: "Usa questo codice per accedere o creare il tuo account Spreelo.", code: "Il tuo codice sicuro", expires: "Il codice scadrà a breve.", ignore: "Se non hai richiesto questa e-mail, puoi ignorarla." },
  nl: { subject: "Je Spreelo-inlogcode", title: "Welkom bij Spreelo", intro: "Gebruik deze code om in te loggen of je Spreelo-account aan te maken.", code: "Je beveiligde code", expires: "De code verloopt binnenkort.", ignore: "Heb je deze e-mail niet aangevraagd, dan kun je hem negeren." },
  da: { subject: "Din login-kode til Spreelo", title: "Velkommen til Spreelo", intro: "Brug koden til at logge ind eller oprette din Spreelo-konto.", code: "Din sikre kode", expires: "Koden udløber snart.", ignore: "Hvis du ikke har bedt om denne e-mail, kan du ignorere den." },
  no: { subject: "Din innloggingskode til Spreelo", title: "Velkommen til Spreelo", intro: "Bruk koden for å logge inn eller opprette Spreelo-kontoen din.", code: "Din sikre kode", expires: "Koden utløper snart.", ignore: "Hvis du ikke ba om denne e-posten, kan du ignorere den." },
  fi: { subject: "Spreelo-kirjautumiskoodisi", title: "Tervetuloa Spreeloon", intro: "Käytä tätä koodia kirjautumiseen tai Spreelo-tilin luomiseen.", code: "Turvallinen koodisi", expires: "Koodi vanhenee pian.", ignore: "Jos et pyytänyt tätä viestiä, voit jättää sen huomiotta." },
  pl: { subject: "Twój kod logowania do Spreelo", title: "Witamy w Spreelo", intro: "Użyj tego kodu, aby się zalogować lub utworzyć konto Spreelo.", code: "Twój bezpieczny kod", expires: "Kod wkrótce wygaśnie.", ignore: "Jeśli nie zamawiałeś tej wiadomości, możesz ją zignorować." },
  tr: { subject: "Spreelo giriş kodunuz", title: "Spreelo’ya hoş geldiniz", intro: "Giriş yapmak veya Spreelo hesabınızı oluşturmak için bu kodu kullanın.", code: "Güvenli kodunuz", expires: "Kodun süresi yakında dolacak.", ignore: "Bu e-postayı siz istemediyseniz güvenle yok sayabilirsiniz." },
  ar: { subject: "رمز تسجيل الدخول إلى Spreelo", title: "مرحبًا بك في Spreelo", intro: "استخدم هذا الرمز لتسجيل الدخول أو إنشاء حساب Spreelo.", code: "رمزك الآمن", expires: "ستنتهي صلاحية الرمز قريبًا.", ignore: "إذا لم تطلب هذه الرسالة، يمكنك تجاهلها بأمان." },
  hi: { subject: "आपका Spreelo साइन-इन कोड", title: "Spreelo में आपका स्वागत है", intro: "साइन इन करने या अपना Spreelo खाता बनाने के लिए इस कोड का उपयोग करें।", code: "आपका सुरक्षित कोड", expires: "कोड शीघ्र ही समाप्त हो जाएगा।", ignore: "यदि आपने यह ईमेल नहीं माँगा है, तो इसे अनदेखा कर सकते हैं।" },
  id: { subject: "Kode masuk Spreelo Anda", title: "Selamat datang di Spreelo", intro: "Gunakan kode ini untuk masuk atau membuat akun Spreelo Anda.", code: "Kode aman Anda", expires: "Kode akan segera kedaluwarsa.", ignore: "Jika Anda tidak meminta email ini, Anda dapat mengabaikannya." },
  ja: { subject: "Spreeloログインコード", title: "Spreeloへようこそ", intro: "このコードを使用してログインするか、Spreeloアカウントを作成してください。", code: "安全なコード", expires: "コードはまもなく期限切れになります。", ignore: "このメールに心当たりがない場合は、無視してください。" },
  ko: { subject: "Spreelo 로그인 코드", title: "Spreelo에 오신 것을 환영합니다", intro: "이 코드로 로그인하거나 Spreelo 계정을 만드세요.", code: "보안 코드", expires: "코드는 곧 만료됩니다.", ignore: "요청하지 않은 이메일이라면 무시하셔도 됩니다." },
  zh: { subject: "您的 Spreelo 登录验证码", title: "欢迎使用 Spreelo", intro: "使用此验证码登录或创建您的 Spreelo 帐户。", code: "您的安全验证码", expires: "验证码即将过期。", ignore: "如果您没有请求此邮件，可以放心忽略。" },
  th: { subject: "รหัสเข้าสู่ระบบ Spreelo ของคุณ", title: "ยินดีต้อนรับสู่ Spreelo", intro: "ใช้รหัสนี้เพื่อเข้าสู่ระบบหรือสร้างบัญชี Spreelo ของคุณ", code: "รหัสที่ปลอดภัยของคุณ", expires: "รหัสจะหมดอายุเร็ว ๆ นี้", ignore: "หากคุณไม่ได้ขออีเมลนี้ คุณสามารถเพิกเฉยได้" },
  uk: { subject: "Ваш код входу до Spreelo", title: "Ласкаво просимо до Spreelo", intro: "Використайте цей код, щоб увійти або створити обліковий запис Spreelo.", code: "Ваш безпечний код", expires: "Термін дії коду скоро завершиться.", ignore: "Якщо ви не запитували цей лист, його можна проігнорувати." },
  ru: { subject: "Ваш код входа в Spreelo", title: "Добро пожаловать в Spreelo", intro: "Используйте этот код, чтобы войти или создать аккаунт Spreelo.", code: "Ваш безопасный код", expires: "Срок действия кода скоро истечёт.", ignore: "Если вы не запрашивали это письмо, его можно проигнорировать." },
  bg: { subject: "Вашият код за вход в Spreelo", title: "Добре дошли в Spreelo", intro: "Използвайте този код, за да влезете или да създадете профил в Spreelo.", code: "Вашият защитен код", expires: "Кодът скоро ще изтече.", ignore: "Ако не сте поискали този имейл, можете да го игнорирате." },
  vi: { subject: "Mã đăng nhập Spreelo của bạn", title: "Chào mừng đến với Spreelo", intro: "Dùng mã này để đăng nhập hoặc tạo tài khoản Spreelo.", code: "Mã bảo mật của bạn", expires: "Mã sẽ sớm hết hạn.", ignore: "Nếu bạn không yêu cầu email này, bạn có thể bỏ qua." },
  cs: { subject: "Váš přihlašovací kód do Spreelo", title: "Vítejte ve Spreelo", intro: "Tento kód použijte k přihlášení nebo vytvoření účtu Spreelo.", code: "Váš bezpečný kód", expires: "Platnost kódu brzy vyprší.", ignore: "Pokud jste si tento e-mail nevyžádali, můžete jej ignorovat." },
  ro: { subject: "Codul tău de conectare la Spreelo", title: "Bun venit la Spreelo", intro: "Folosește acest cod pentru a te conecta sau pentru a crea contul Spreelo.", code: "Codul tău securizat", expires: "Codul va expira în curând.", ignore: "Dacă nu ai solicitat acest e-mail, îl poți ignora." },
  hu: { subject: "Spreelo bejelentkezési kódod", title: "Üdvözlünk a Spreelóban", intro: "Ezzel a kóddal jelentkezhetsz be vagy hozhatod létre Spreelo-fiókodat.", code: "Biztonságos kódod", expires: "A kód hamarosan lejár.", ignore: "Ha nem te kérted ezt az e-mailt, nyugodtan hagyd figyelmen kívül." },
  el: { subject: "Ο κωδικός σύνδεσής σας στο Spreelo", title: "Καλώς ήρθατε στο Spreelo", intro: "Χρησιμοποιήστε αυτόν τον κωδικό για σύνδεση ή δημιουργία λογαριασμού Spreelo.", code: "Ο ασφαλής κωδικός σας", expires: "Ο κωδικός λήγει σύντομα.", ignore: "Αν δεν ζητήσατε αυτό το email, μπορείτε να το αγνοήσετε." },
  ms: { subject: "Kod log masuk Spreelo anda", title: "Selamat datang ke Spreelo", intro: "Gunakan kod ini untuk log masuk atau mencipta akaun Spreelo anda.", code: "Kod selamat anda", expires: "Kod akan tamat tempoh tidak lama lagi.", ignore: "Jika anda tidak meminta e-mel ini, anda boleh mengabaikannya." },
  fil: { subject: "Ang iyong Spreelo sign-in code", title: "Maligayang pagdating sa Spreelo", intro: "Gamitin ang code na ito para mag-sign in o gumawa ng Spreelo account.", code: "Ang iyong secure na code", expires: "Mag-e-expire ang code sa lalong madaling panahon.", ignore: "Kung hindi mo hiniling ang email na ito, maaari mo itong balewalain." },
};

const supportedLocales = new Set(Object.keys(copyByLocale));

function normalizeLocale(value: unknown) {
  const locale = String(value || "").trim().toLowerCase().replace("_", "-");
  const short = locale.split("-")[0];
  return supportedLocales.has(locale) ? locale : supportedLocales.has(short) ? short : "en";
}

function getLocale(payload: HookPayload) {
  try {
    const redirect = new URL(payload.email_data.redirect_to || "https://app.spreelo.com");
    const redirectLocale = redirect.searchParams.get("lang");
    if (redirectLocale) return normalizeLocale(redirectLocale);
  } catch {
    // Fall back to the locale stored when a new user is created.
  }

  return normalizeLocale(payload.user.user_metadata?.app_locale);
}

function renderEmail(copy: Copy, token: string, locale: string) {
  const direction = locale === "ar" ? "rtl" : "ltr";
  return `<!doctype html>
<html lang="${locale}" dir="${direction}">
  <body style="margin:0;background:#eef1f6;font-family:Inter,Arial,sans-serif;color:#111a2e;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 14px;background:#eef1f6;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;overflow:hidden;border:1px solid #dfe4ec;border-radius:24px;background:#ffffff;box-shadow:0 18px 55px rgba(17,26,46,.12);">
          <tr><td style="padding:30px 36px;background:linear-gradient(135deg,#071d32,#123b5d);">
            <img src="https://app.spreelo.com/brand/spreelologo.png" width="145" alt="Spreelo" style="display:block;filter:brightness(0) invert(1);">
          </td></tr>
          <tr><td style="padding:38px 36px 18px;">
            <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#fff0ea;color:#cf4f33;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Spreelo</div>
            <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.16;color:#111a2e;">${copy.title}</h1>
            <p style="margin:0;color:#68758c;font-size:16px;line-height:1.65;">${copy.intro}</p>
          </td></tr>
          <tr><td style="padding:8px 36px 24px;">
            <div style="padding:24px;border:1px solid #ffd4c7;border-radius:18px;background:#fff8f5;text-align:center;">
              <p style="margin:0 0 10px;color:#96503c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;">${copy.code}</p>
              <div style="font-size:38px;font-weight:850;letter-spacing:.24em;color:#071d32;direction:ltr;">${token}</div>
              <p style="margin:12px 0 0;color:#7b8495;font-size:13px;">${copy.expires}</p>
            </div>
          </td></tr>
          <tr><td style="padding:0 36px 36px;">
            <p style="margin:0;padding-top:22px;border-top:1px solid #e7eaf0;color:#7b8495;font-size:13px;line-height:1.6;">${copy.ignore}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const webhookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const from = Deno.env.get("SPREELO_AUTH_EMAIL_FROM") || "Spreelo <noreply@spreelo.com>";

    if (!webhookSecret || !resendApiKey) {
      throw new Error("Missing SEND_EMAIL_HOOK_SECRET or RESEND_API_KEY");
    }

    const rawPayload = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const webhook = new Webhook(webhookSecret.replace("v1,whsec_", ""));
    const payload = webhook.verify(rawPayload, headers) as HookPayload;
    const recipient = String(payload.user.email || "").trim();
    const token = String(payload.email_data.token || "").trim();

    if (!recipient || !token) throw new Error("Missing recipient or token");

    const locale = getLocale(payload);
    const copy = copyByLocale[locale] || copyByLocale.en;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: copy.subject,
        html: renderEmail(copy, token, locale),
        text: `${copy.title}\n\n${copy.intro}\n\n${copy.code}: ${token}\n${copy.expires}\n\n${copy.ignore}`,
      }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Resend delivery failed");
    }

    return Response.json({});
  } catch (error) {
    console.error("Spreelo auth email hook failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Email hook failed" },
      { status: 500 }
    );
  }
});
