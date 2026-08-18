import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.spreelo.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.startsWith("sv") || raw.includes("swedish") || raw.includes("svenska")) return "sv";
  return "en";
}

function copyFor(locale) {
  const sv = locale === "sv";
  return sv
    ? {
        pageTitle: "Förhandsgranska ditt inlägg",
        intro: "Se exakt hur innehållet ser ut innan du godkänner publiceringen.",
        productPost: "PRODUKTINLÄGG",
        postText: "Inläggstext",
        scheduled: "Planerad publicering",
        visibility: "Synlighet",
        link: "Länk",
        public: "Offentligt",
        private: "Privat",
        unlisted: "Olistat",
        readyTitle: "Redo att publicera?",
        readyText: "Granska videon och texten. Godkänn när allt ser rätt ut.",
        requestChange: "Begär ändring",
        requestChangeHelp: "Skicka dina ändringar till Spreelo-teamet",
        approveNow: "Godkänn & publicera",
        approveLater: "Godkänn inlägg",
        approveNowHelp: "Inlägget är redo för publicering",
        approveLaterHelp: "Publiceras automatiskt enligt planen",
        reject: "Avvisa inlägg",
        rejectHelp: "Inlägget kommer inte att publiceras",
        secure: "Sidan är säker och personlig för dig. Dela inte länken med andra.",
        footer: "Spreelo gör det enkelt att skapa innehåll som engagerar.",
        close: "Stäng",
        approved: "Inlägget är godkänt",
        approvedText: "Spreelo håller inlägget redo och publicerar det enligt din plan.",
        published: "Publicerat",
        publishedText: "Inlägget har publicerats av Spreelo.",
        rejected: "Ändring begärd",
        rejectedText: "Inlägget har avvisats och kommer inte att publiceras.",
        invalid: "Länken kan inte öppnas",
        invalidText: "Förhandsgranskningslänken är ogiltig, har gått ut eller inlägget finns inte längre.",
        videoUnavailable: "Videon är inte tillgänglig ännu.",
        autoplayHint: "Videon startar utan ljud. Slå på ljudet i spelaren om du vill.",
        feedbackChangeTitle: "Vad vill du ändra?",
        feedbackChangeIntro: "Beskriv vad Spreelo ska justera innan inlägget publiceras.",
        feedbackRejectTitle: "Avvisa inlägget",
        feedbackRejectIntro: "Berätta kort varför du inte vill använda den här versionen.",
        reasonLabel: "Vad gäller det?",
        reasonPlaceholder: "Välj ett område",
        reasonIncorrect: "Felaktig information",
        reasonProduct: "Fel produkt eller tjänst",
        reasonTone: "Ton eller formulering",
        reasonVisual: "Bild eller video",
        reasonTiming: "Timing eller kampanj",
        reasonOther: "Annat",
        detailsLabel: "Din kommentar",
        detailsPlaceholder: "Skriv vad du vill att Spreelo ska ändra…",
        cancel: "Avbryt",
        sendChanges: "Skicka ändringsönskemål",
        confirmReject: "Avvisa inlägg",
      }
    : {
        pageTitle: "Preview your post",
        intro: "See exactly how the content looks before you approve publishing.",
        productPost: "PRODUCT POST",
        postText: "Post copy",
        scheduled: "Scheduled publishing",
        visibility: "Visibility",
        link: "Link",
        public: "Public",
        private: "Private",
        unlisted: "Unlisted",
        readyTitle: "Ready to publish?",
        readyText: "Review the video and copy. Approve when everything looks right.",
        requestChange: "Request changes",
        requestChangeHelp: "Send your changes to the Spreelo team",
        approveNow: "Approve & publish",
        approveLater: "Approve post",
        approveNowHelp: "The post is ready to publish",
        approveLaterHelp: "Publishes automatically according to the plan",
        reject: "Reject post",
        rejectHelp: "The post will not be published",
        secure: "This page is secure and personal to you. Do not share the link with others.",
        footer: "Spreelo makes it simple to create content that engages.",
        close: "Close",
        approved: "Post approved",
        approvedText: "Spreelo is keeping the post ready and will publish it according to your plan.",
        published: "Published",
        publishedText: "The post has been published by Spreelo.",
        rejected: "Changes requested",
        rejectedText: "The post was rejected and will not be published.",
        invalid: "This link cannot be opened",
        invalidText: "The preview link is invalid, expired, or the post no longer exists.",
        videoUnavailable: "The video is not available yet.",
        autoplayHint: "The video starts muted. Turn on sound in the player if you want.",
        feedbackChangeTitle: "What would you like to change?",
        feedbackChangeIntro: "Describe what Spreelo should adjust before the post is published.",
        feedbackRejectTitle: "Reject this post",
        feedbackRejectIntro: "Tell us briefly why you do not want to use this version.",
        reasonLabel: "What is it about?",
        reasonPlaceholder: "Choose an area",
        reasonIncorrect: "Incorrect information",
        reasonProduct: "Wrong product or service",
        reasonTone: "Tone or wording",
        reasonVisual: "Image or video",
        reasonTiming: "Timing or campaign",
        reasonOther: "Other",
        detailsLabel: "Your comment",
        detailsPlaceholder: "Tell Spreelo what should be changed…",
        cancel: "Cancel",
        sendChanges: "Send change request",
        confirmReject: "Reject post",
      };
}

function platformPresentation(platform, contentFormat) {
  const raw = String(platform || "").toLowerCase();
  const isVideo = String(contentFormat || "").toLowerCase() === "animated_video";
  if (raw.includes("youtube")) return { label: isVideo ? "YouTube Shorts" : "YouTube", type: "youtube" };
  if (raw.includes("instagram")) return { label: isVideo ? "Instagram Reels" : "Instagram", type: "instagram" };
  if (raw.includes("facebook")) return { label: isVideo ? "Facebook Reels" : "Facebook", type: "facebook" };
  if (raw.includes("threads")) return { label: "Threads", type: "threads" };
  if (raw.includes("pinterest")) return { label: "Pinterest", type: "pinterest" };
  return { label: String(platform || "Social media"), type: "generic" };
}

function formatDate(value, locale) {
  const date = new Date(value || 0);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Stockholm",
    }).format(date);
  } catch {
    return date.toISOString().replace("T", " ").slice(0, 16);
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function firstProduct(post) {
  const items = Array.isArray(post?.admin_product_items) ? post.admin_product_items : [];
  const first = items.find((item) => item?.title || item?.url) || null;
  if (!first) return null;
  const rawTitle = String(first.title || "").trim();
  return {
    title: rawTitle.replace(/\s*\|\s*[^|]+$/, "").trim(),
    url: String(first.url || post?.website_url || "").trim(),
  };
}

function displayUrl(value) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const result = `${parsed.hostname.replace(/^www\./, "")}${path}`;
    return result.length > 54 ? `${result.slice(0, 51)}…` : result;
  } catch {
    return String(value || "");
  }
}

function visibilityCopy(post, labels) {
  const platform = String(post?.platform || "").toLowerCase();
  if (!platform.includes("youtube")) return "—";
  const configured = String(process.env.YOUTUBE_DEFAULT_PRIVACY || "private").toLowerCase();
  if (configured === "public") return labels.public;
  if (configured === "unlisted") return labels.unlisted;
  return labels.private;
}

function pageHtml({ post, brand, locale, token }) {
  const labels = copyFor(locale);
  const product = firstProduct(post);
  const platform = platformPresentation(post?.platform, post?.content_format);
  const title = product?.title || brand?.business_name || post?.post_type || "Spreelo post";
  const brandName = brand?.business_name || "Spreelo";
  const imageUrl = String(post?.image_url || "").trim();
  const videoUrl = String(post?.video_url || "").trim();
  const websiteUrl = String(product?.url || post?.website_url || "").trim();
  const dueNow = !post?.scheduled_for || new Date(post.scheduled_for).getTime() <= Date.now() + 60_000;
  const status = String(post?.status || "").toLowerCase();
  const isPublished = Boolean(post?.published_at) || status === "published";
  const isApproved = status === "approved" || Boolean(post?.approved_at);
  const isRejected = status === "rejected";
  const duration = formatDuration(post?.video_duration_seconds || 0);
  const mediaIsVideo = String(post?.content_format || "").toLowerCase() === "animated_video";

  let statusPanel = "";
  if (isPublished) {
    statusPanel = `<div class="state-card success"><span class="state-icon">✓</span><div><strong>${escapeHtml(labels.published)}</strong><span>${escapeHtml(labels.publishedText)}</span></div></div>`;
  } else if (isApproved) {
    statusPanel = `<div class="state-card success"><span class="state-icon">✓</span><div><strong>${escapeHtml(labels.approved)}</strong><span>${escapeHtml(labels.approvedText)}</span></div></div>`;
  } else if (isRejected) {
    statusPanel = `<div class="state-card rejected"><span class="state-icon">!</span><div><strong>${escapeHtml(labels.rejected)}</strong><span>${escapeHtml(labels.rejectedText)}</span></div></div>`;
  }

  const actionPanel = status === "pending_approval"
    ? `<section class="decision-zone">
        <div class="decision-copy"><span class="sparkle">✦</span><div><h2>${escapeHtml(labels.readyTitle)}</h2><p>${escapeHtml(labels.readyText)}</p></div></div>
        <div class="decision-actions">
          <form class="approve-form" method="post" action="/api/approve-post"><input type="hidden" name="token" value="${escapeHtml(token)}"/><input type="hidden" name="lang" value="${escapeHtml(locale)}"/><button class="approve-button" type="submit"><strong>✓ ${escapeHtml(dueNow ? labels.approveNow : labels.approveLater)}</strong><span>${escapeHtml(dueNow ? labels.approveNowHelp : labels.approveLaterHelp)}</span></button></form>
          <button class="reject-link" type="button" onclick="openReject()">${escapeHtml(labels.reject)}</button>
        </div>
        <div class="feedback-panel reject-mode" id="feedback-panel" hidden>
          <div class="feedback-head"><div><h3>${escapeHtml(labels.feedbackRejectTitle)}</h3><p>${escapeHtml(labels.feedbackRejectIntro)}</p></div><button class="feedback-close" type="button" onclick="closeReject()">×</button></div>
          <form method="post" action="/api/reject-post">
            <input type="hidden" name="token" value="${escapeHtml(token)}" />
            <input type="hidden" name="lang" value="${escapeHtml(locale)}" />
            <input type="hidden" name="decision_type" value="reject" />
            <input type="hidden" name="reason_category" value="other" />
            <label class="feedback-comment"><span>${escapeHtml(labels.detailsLabel)}</span><textarea name="reason_text" required minlength="10" maxlength="3000" placeholder="${escapeHtml(labels.feedbackRejectIntro)}"></textarea></label>
            <div class="feedback-actions"><button class="feedback-cancel" type="button" onclick="closeReject()">${escapeHtml(labels.cancel)}</button><button class="feedback-submit" type="submit">${escapeHtml(labels.confirmReject)}</button></div>
          </form>
        </div>
      </section>`
    : statusPanel;

  const platformIcon = platform.type === "youtube"
    ? `<span class="platform-icon youtube"><span>▶</span></span>`
    : `<span class="platform-icon generic">●</span>`;

  const mediaMarkup = mediaIsVideo && videoUrl
    ? `<video id="spreelo-video" src="${escapeHtml(videoUrl)}" ${imageUrl ? `poster="${escapeHtml(imageUrl)}"` : ""} autoplay muted loop playsinline controls preload="metadata"></video>`
    : imageUrl
      ? `<img class="static-preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />`
      : `<div class="media-empty">${escapeHtml(labels.videoUnavailable)}</div>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(labels.pageTitle)} · Spreelo</title>
<style>
:root{--navy:#13203a;--ink:#17233d;--muted:#687386;--line:#dfe4ec;--soft:#f4f6fa;--card:#fff;--orange:#ff6a00;--pink:#f23a75;--purple:#7847ff;--red:#d94343;--green:#1f9d62}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;}body{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--ink);background:#edf1f7;padding:12px;overflow:hidden}.backdrop{position:fixed;inset:0;z-index:-2;background:radial-gradient(circle at 8% 10%,rgba(255,106,0,.10),transparent 24%),radial-gradient(circle at 92% 18%,rgba(120,71,255,.09),transparent 26%),linear-gradient(180deg,#f8f9fc,#edf1f7)}.shell{width:min(1220px,100%);height:calc(100vh - 24px);margin:0 auto;display:flex;justify-content:center;align-items:center}.modal{width:100%;max-height:100%;overflow:hidden;border:1px solid rgba(19,32,58,.10);border-radius:24px;background:rgba(255,255,255,.98);box-shadow:0 28px 80px rgba(22,36,65,.14);display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto}.top{display:flex;align-items:center;justify-content:space-between;padding:16px 22px 4px}.brand-logo{display:block;width:152px;height:auto}.close{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:#fff;color:#586276;font-size:25px;line-height:1;cursor:pointer}.headline-row{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:8px 22px 12px}.headline h1{margin:0;color:var(--navy);font-size:clamp(27px,2.25vw,38px);letter-spacing:-1.2px}.headline p{margin:5px 0 0;color:var(--muted);font-size:14px}.platform{display:flex;align-items:center;gap:10px;min-width:240px;border:1px solid var(--line);border-radius:13px;background:#fafbfe;padding:9px 12px}.platform strong,.platform small{display:block}.platform strong{font-size:13px;color:var(--navy)}.platform small{font-size:10px;color:#7a8495;margin-top:2px}.platform-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;font-weight:900}.platform-icon.youtube{background:#ff0033}.platform-icon.generic{background:linear-gradient(135deg,var(--orange),var(--pink),var(--purple))}.content-grid{min-height:0;display:grid;grid-template-columns:minmax(340px,.86fr) minmax(390px,1.14fr);gap:18px;padding:0 22px 14px;align-items:stretch}.media-card{position:relative;height:min(61vh,690px);aspect-ratio:9/16;max-width:100%;justify-self:center;align-self:center;border-radius:18px;overflow:hidden;background:#0b111a;border:1px solid #d6dce6;box-shadow:0 12px 32px rgba(15,27,49,.10)}.media-card video,.media-card .static-preview{width:100%;height:100%;display:block;object-fit:contain;background:#0b111a}.duration{position:absolute;z-index:2;left:12px;top:12px;padding:6px 9px;border-radius:8px;background:rgba(11,17,26,.78);color:#fff;font-size:12px;font-weight:800}.media-empty{height:100%;display:grid;place-items:center;color:#9ba5b4}.detail-card{min-height:0;height:min(61vh,690px);overflow:auto;border:1px solid var(--line);border-radius:18px;background:#fff;padding:20px 22px;box-shadow:0 8px 24px rgba(21,36,63,.04)}.pill{display:inline-flex;align-items:center;border-radius:8px;padding:6px 9px;background:linear-gradient(135deg,rgba(242,58,117,.10),rgba(120,71,255,.12));color:#783a94;font-size:10px;font-weight:900;letter-spacing:.35px}.detail-card h2{margin:13px 0 4px;color:var(--navy);font-size:25px;line-height:1.12}.brand-row{color:#788295;font-size:12px;font-weight:750;margin-bottom:15px}.copy{padding-top:15px;border-top:1px solid #edf0f5}.copy-label{display:block;color:#3e4a61;font-size:11px;font-weight:850;margin-bottom:8px}.copy-text{white-space:pre-wrap;color:#2a354b;font-size:13px;line-height:1.55}.meta{margin-top:16px;border:1px solid #e3e7ee;border-radius:13px;background:#fafbfd;padding:5px 13px}.meta-row{display:grid;grid-template-columns:24px 1fr;gap:9px;align-items:start;padding:10px 0;border-bottom:1px solid #e9edf3}.meta-row:last-child{border-bottom:0}.meta-icon{color:#7b8596}.meta-label,.meta-value{display:block}.meta-label{font-size:9px;color:#8a93a2}.meta-value{font-size:11px;font-weight:750;color:#2b3548;margin-top:2px}.meta-value a{color:#44516a;text-decoration:none}.decision-zone{margin:0 22px 10px;padding:12px 0 0;border-top:1px solid #e8ecf2;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,390px);gap:18px;align-items:center}.decision-copy{display:flex;gap:11px;align-items:flex-start}.sparkle{font-size:22px;color:var(--orange)}.decision-copy h2{margin:0 0 4px;color:var(--navy);font-size:18px}.decision-copy p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}.decision-actions{text-align:center}.approve-form{margin:0}.approve-button{width:100%;min-height:58px;border:0;border-radius:13px;background:linear-gradient(110deg,#ff6500,#ff7f24 50%,#f04b58);color:#fff;padding:10px 18px;cursor:pointer;box-shadow:0 10px 24px rgba(255,105,15,.20)}.approve-button strong,.approve-button span{display:block}.approve-button strong{font-size:16px}.approve-button span{font-size:10px;opacity:.88;margin-top:3px}.reject-link{margin-top:7px;border:0;background:transparent;color:#9b4b4b;text-decoration:underline;text-underline-offset:3px;font-size:11px;cursor:pointer}.feedback-panel{grid-column:1/-1;margin-top:4px;border:1px solid #efcaca;border-radius:13px;background:#fff9f9;padding:14px}.feedback-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:10px}.feedback-head h3{margin:0 0 3px;font-size:16px}.feedback-head p{margin:0;color:#7b6570;font-size:11px}.feedback-close{border:0;background:transparent;font-size:22px;color:#8a7480;cursor:pointer}.feedback-comment>span{display:block;margin-bottom:6px;font-size:10px;font-weight:800}.feedback-comment textarea{width:100%;min-height:72px;resize:vertical;border:1px solid #e4caca;border-radius:10px;padding:10px;font:inherit}.feedback-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.feedback-cancel,.feedback-submit{min-height:38px;border-radius:9px;padding:0 13px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.feedback-cancel{border:1px solid #d9dfe8;background:#fff;color:#5c6678}.feedback-submit{border:0;background:#c63c43;color:#fff}.security{width:max-content;max-width:calc(100% - 44px);margin:0 auto 12px;padding:6px 10px;border-radius:8px;background:#f6f7fa;color:#8a93a2;font-size:10px}.state-card{margin:0 22px 14px;display:flex;align-items:center;gap:12px;border:1px solid #bfe5d0;background:#f3fbf6;border-radius:13px;padding:13px 15px}.state-card.rejected{border-color:#edc6c6;background:#fff7f7}.state-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:#dff4e7;color:var(--green);font-weight:900}.state-card.rejected .state-icon{background:#f8dddd;color:var(--red)}.state-card strong,.state-card span{display:block}.state-card>div>span{color:#697486;font-size:11px;margin-top:2px}
@media(max-width:900px){body{padding:10px;overflow:auto}.shell{width:100%;height:auto;min-height:calc(100vh - 20px);align-items:flex-start}.modal{width:min(100%,430px);max-height:none;overflow:visible;margin:0 auto;border-radius:20px;display:block}.top{padding:15px 16px 3px}.brand-logo{width:132px}.headline-row{display:block;padding:8px 16px 14px}.headline h1{font-size:27px}.headline p{font-size:12px}.platform{margin-top:12px;width:100%;min-width:0}.content-grid{display:block;padding:0 16px 12px}.media-card{width:min(100%,360px);height:auto;max-width:none;aspect-ratio:9/16;margin:0 auto 14px}.detail-card{height:auto;max-height:none;overflow:visible;padding:17px}.detail-card h2{font-size:23px}.decision-zone{display:block;margin:0 16px 12px;padding-top:14px}.decision-copy{margin-bottom:12px}.approve-button{min-height:62px}.feedback-panel{margin-top:12px}.security{max-width:calc(100% - 32px);margin-bottom:12px}.state-card{margin:0 16px 12px}}
@media(min-width:901px) and (max-height:820px){.top{padding-top:10px}.headline-row{padding-top:4px;padding-bottom:8px}.headline h1{font-size:29px}.content-grid{gap:14px}.media-card,.detail-card{height:min(58vh,560px)}.detail-card{padding:15px 18px}.copy-text{font-size:11.5px;line-height:1.42}.meta-row{padding:7px 0}.decision-zone{padding-top:8px;margin-bottom:7px}.security{margin-bottom:7px}}
</style>
</head>
<body>
<div class="backdrop" aria-hidden="true"></div>
<main class="shell">
<section class="modal">
  <div class="top"><img class="brand-logo" src="/brand/spreelologo.png" alt="Spreelo"/><button class="close" type="button" aria-label="${escapeHtml(labels.close)}" onclick="closePreview()">×</button></div>
  <div class="headline-row"><div class="headline"><h1>${escapeHtml(labels.pageTitle)}</h1><p>${escapeHtml(labels.intro)}</p></div><div class="platform">${platformIcon}<div><strong>${escapeHtml(platform.label)}</strong><small>${escapeHtml(status === "pending_approval" ? (dueNow ? labels.approveNowHelp : labels.approveLaterHelp) : status)}</small></div></div></div>
  <div class="content-grid">
    <div class="media-card">${videoUrl ? `<span class="duration">${escapeHtml(duration)}</span>` : ""}${mediaMarkup}</div>
    <aside class="detail-card"><span class="pill">▣ ${escapeHtml(labels.productPost)}</span><h2>${escapeHtml(title)}</h2><div class="brand-row">${escapeHtml(brandName)}</div><div class="copy"><span class="copy-label">${escapeHtml(labels.postText)}</span><div class="copy-text">${escapeHtml(post?.content || "")}</div></div><div class="meta"><div class="meta-row"><span class="meta-icon">▣</span><div><span class="meta-label">${escapeHtml(labels.scheduled)}</span><span class="meta-value">${escapeHtml(formatDate(post?.scheduled_for, locale))}</span></div></div><div class="meta-row"><span class="meta-icon">◎</span><div><span class="meta-label">${escapeHtml(labels.visibility)}</span><span class="meta-value">${escapeHtml(visibilityCopy(post, labels))}</span></div></div>${websiteUrl ? `<div class="meta-row"><span class="meta-icon">↗</span><div><span class="meta-label">${escapeHtml(labels.link)}</span><span class="meta-value"><a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noreferrer">${escapeHtml(displayUrl(websiteUrl))}</a></span></div></div>` : ""}</div></aside>
  </div>
  ${actionPanel}
  <div class="security">🔒 ${escapeHtml(labels.secure)}</div>
</section>
</main>
<script>
function closePreview(){try{if(history.length>1){history.back();return}}catch(e){}location.href=${JSON.stringify(APP_URL)}}
function openReject(){const panel=document.getElementById('feedback-panel');if(panel){panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function closeReject(){const panel=document.getElementById('feedback-panel');if(panel)panel.hidden=true;}
window.addEventListener('DOMContentLoaded',()=>{const video=document.getElementById('spreelo-video');if(video){video.muted=true;video.loop=true;const play=video.play();if(play&&play.catch)play.catch(()=>{});}});
</script>
</body></html>`;
}


function invalidHtml(locale) {
  const labels = copyFor(locale);
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(labels.invalid)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b11;color:#fff;font-family:Arial,sans-serif;padding:20px}.card{max-width:560px;padding:34px;border:1px solid #283241;border-radius:22px;background:#0e151f;box-shadow:0 30px 80px #0008}.mark{color:#ff6a00;font-size:34px;font-weight:900}h1{font-size:30px;margin:16px 0 10px}p{color:#aeb7c3;line-height:1.6}a{display:inline-block;margin-top:18px;background:#ff6a00;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800}</style></head><body><main class="card"><div class="mark">S spreelo</div><h1>${escapeHtml(labels.invalid)}</h1><p>${escapeHtml(labels.invalidText)}</p><a href="${escapeHtml(APP_URL)}">Spreelo</a></main></body></html>`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("lang") || request.headers.get("accept-language"));
  const token = String(url.searchParams.get("token") || "").trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return new Response(invalidHtml(locale), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: post, error } = await admin
    .from("posts")
    .select("id,user_id,brand_profile_id,status,content,platform,post_type,content_format,image_url,video_url,video_duration_seconds,scheduled_for,website_url,approval_token,approved_at,published_at,language,admin_product_items")
    .eq("approval_token", token)
    .maybeSingle();

  if (error || !post) {
    return new Response(invalidHtml(locale), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const [{ data: brand }, userResult] = await Promise.all([
    post.brand_profile_id
      ? admin.from("brand_profiles").select("id,business_name,content_language").eq("id", post.brand_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    post.user_id ? admin.auth.admin.getUserById(post.user_id).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
  ]);

  const finalLocale = normalizeLocale(url.searchParams.get("lang") || post.language || brand?.content_language || locale);
  return new Response(pageHtml({ post, brand: brand || null, user: userResult?.data?.user || null, locale: finalLocale, token }), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private" },
  });
}
