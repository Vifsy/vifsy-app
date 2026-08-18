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
        readyText: "Granska videon och texten. Godkänn när allt ser rätt ut, eller skicka tillbaka inlägget med en ändring.",
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
        rejectedText: "Inlägget är skickat tillbaka till Spreelo och kommer inte att publiceras i nuvarande version.",
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
        readyText: "Review the video and copy. Approve when everything looks right, or send the post back with requested changes.",
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
        rejectedText: "The post has been sent back to Spreelo and will not be published in its current version.",
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

function pageHtml({ post, brand, user, locale, token }) {
  const labels = copyFor(locale);
  const product = firstProduct(post);
  const platform = platformPresentation(post?.platform, post?.content_format);
  const title = product?.title || brand?.business_name || post?.post_type || "Spreelo post";
  const brandName = brand?.business_name || "Spreelo";
  const metadata = user?.user_metadata || {};
  const ownerName = String(metadata.full_name || metadata.name || metadata.display_name || user?.email || "").trim();
  const imageUrl = String(post?.image_url || "").trim();
  const videoUrl = String(post?.video_url || "").trim();
  const websiteUrl = String(product?.url || post?.website_url || "").trim();
  const safeToken = encodeURIComponent(token);
  const safeLocale = encodeURIComponent(locale);
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
        <div class="decision-copy">
          <span class="sparkle">✦</span>
          <div><h2>${escapeHtml(labels.readyTitle)}</h2><p>${escapeHtml(labels.readyText)}</p></div>
        </div>
        <div class="actions-grid">
          <button class="action-card change" type="button" onclick="openFeedback('changes')"><span class="action-title">✎ ${escapeHtml(labels.requestChange)}</span><span>${escapeHtml(labels.requestChangeHelp)}</span></button>
          <form class="approve-form" method="post" action="/api/approve-post"><input type="hidden" name="token" value="${escapeHtml(token)}"/><input type="hidden" name="lang" value="${escapeHtml(locale)}"/><button class="action-card approve" type="submit"><span class="action-title">✓ ${escapeHtml(dueNow ? labels.approveNow : labels.approveLater)}</span><span>${escapeHtml(dueNow ? labels.approveNowHelp : labels.approveLaterHelp)}</span></button></form>
          <button class="action-card reject" type="button" onclick="openFeedback('reject')"><span class="action-title">× ${escapeHtml(labels.reject)}</span><span>${escapeHtml(labels.rejectHelp)}</span></button>
        </div>
        <div class="feedback-panel" id="feedback-panel" hidden>
          <div class="feedback-head"><div><h3 id="feedback-title">${escapeHtml(labels.feedbackChangeTitle)}</h3><p id="feedback-intro">${escapeHtml(labels.feedbackChangeIntro)}</p></div><button class="feedback-close" type="button" onclick="closeFeedback()">×</button></div>
          <form method="post" action="/api/reject-post">
            <input type="hidden" name="token" value="${escapeHtml(token)}" />
            <input type="hidden" name="lang" value="${escapeHtml(locale)}" />
            <input type="hidden" id="decision-type" name="decision_type" value="changes" />
            <div class="feedback-grid">
              <label><span>${escapeHtml(labels.reasonLabel)}</span><select name="reason_category" required><option value="">${escapeHtml(labels.reasonPlaceholder)}</option><option value="incorrect_information">${escapeHtml(labels.reasonIncorrect)}</option><option value="wrong_product_or_service">${escapeHtml(labels.reasonProduct)}</option><option value="tone_or_wording">${escapeHtml(labels.reasonTone)}</option><option value="image_or_video">${escapeHtml(labels.reasonVisual)}</option><option value="timing_or_campaign">${escapeHtml(labels.reasonTiming)}</option><option value="other">${escapeHtml(labels.reasonOther)}</option></select></label>
              <label class="feedback-comment"><span>${escapeHtml(labels.detailsLabel)}</span><textarea name="reason_text" required minlength="10" maxlength="3000" placeholder="${escapeHtml(labels.detailsPlaceholder)}"></textarea></label>
            </div>
            <div class="feedback-actions"><button class="feedback-cancel" type="button" onclick="closeFeedback()">${escapeHtml(labels.cancel)}</button><button class="feedback-submit" id="feedback-submit" type="submit">${escapeHtml(labels.sendChanges)}</button></div>
          </form>
        </div>
      </section>`
    : statusPanel;

  const platformIcon = platform.type === "youtube"
    ? `<span class="platform-icon youtube"><span>▶</span></span>`
    : `<span class="platform-icon generic">●</span>`;

  const mediaMarkup = mediaIsVideo && videoUrl
    ? `<video id="spreelo-video" src="${escapeHtml(videoUrl)}" ${imageUrl ? `poster="${escapeHtml(imageUrl)}"` : ""} autoplay muted playsinline controls preload="metadata"></video>`
    : imageUrl
      ? `<img class="static-preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />`
      : `<div class="media-empty">${escapeHtml(labels.videoUnavailable)}</div>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>${escapeHtml(labels.pageTitle)} · Spreelo</title>
<style>
:root{--bg:#070b11;--panel:#0c121b;--panel2:#101721;--line:rgba(255,255,255,.11);--muted:#a8b0bd;--white:#f8fafc;--orange:#ff6a00;--orange2:#ff7b24;--purple:#d984ff;--red:#ff4d4f;--green:#43d17c}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#05090f;color:var(--white);padding:34px 18px 48px}.backdrop{position:fixed;inset:-32px;z-index:-3;background:radial-gradient(circle at 18% 14%,rgba(255,106,0,.13),transparent 30%),radial-gradient(circle at 78% 82%,rgba(121,92,255,.11),transparent 32%),linear-gradient(180deg,#0a0f16,#03070b)}.backdrop-image{position:fixed;inset:-50px;z-index:-4;background-image:url("${escapeHtml(imageUrl)}");background-size:cover;background-position:center;filter:blur(44px) brightness(.16) saturate(.8);opacity:${imageUrl ? ".48" : "0"}}.shell{width:min(1160px,100%);margin:0 auto}.modal{position:relative;border:1px solid rgba(255,255,255,.14);border-radius:28px;background:linear-gradient(145deg,rgba(13,20,30,.97),rgba(7,12,19,.98));box-shadow:0 38px 110px rgba(0,0,0,.58);overflow:hidden}.modal:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.035),transparent 28%)}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:30px 34px 10px}.brand{display:flex;align-items:center;gap:10px;font-size:29px;font-weight:850;letter-spacing:-.04em}.brand-mark{font-size:38px;font-weight:950;font-style:italic;line-height:.8;background:linear-gradient(145deg,#ff8a00,#ff4b16);-webkit-background-clip:text;background-clip:text;color:transparent}.close{border:0;background:transparent;color:#c8ced7;font-size:36px;line-height:1;cursor:pointer;padding:0 4px}.headline-row{display:flex;align-items:flex-start;justify-content:space-between;gap:22px;padding:14px 34px 28px}.headline h1{margin:0 0 8px;font-size:clamp(30px,4vw,42px);letter-spacing:-.045em;line-height:1.05}.headline p{margin:0;color:#c5cbd4;font-size:17px}.platform{min-width:255px;display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.025);padding:13px 15px}.platform-icon{width:42px;height:32px;border-radius:9px;display:grid;place-items:center;font-weight:900}.platform-icon.youtube{background:#ff0033;color:#fff}.platform-icon.youtube span{font-size:15px;transform:translateX(1px)}.platform-icon.generic{background:#273243}.platform strong{display:block;font-size:15px}.platform small{display:block;color:#aab2bf;margin-top:3px}.content-grid{display:grid;grid-template-columns:minmax(0,1.16fr) minmax(340px,.84fr);gap:24px;padding:0 34px 30px}.media-card{position:relative;border:1px solid rgba(255,255,255,.16);border-radius:18px;overflow:hidden;background:#05080c;min-height:640px;display:grid;place-items:center}.media-card video,.static-preview{display:block;width:100%;height:100%;max-height:790px;object-fit:contain;background:#05080c}.duration{position:absolute;z-index:3;top:14px;left:14px;padding:7px 10px;border-radius:9px;background:rgba(5,10,16,.78);backdrop-filter:blur(9px);font-size:14px;font-weight:800}.autoplay-hint{position:absolute;z-index:3;right:14px;top:14px;max-width:250px;padding:7px 10px;border-radius:9px;background:rgba(5,10,16,.72);backdrop-filter:blur(9px);color:#d6dbe2;font-size:11px}.media-empty{padding:40px;color:var(--muted)}.detail-card{border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.06);padding:24px;align-self:stretch}.pill{display:inline-flex;align-items:center;gap:7px;background:rgba(180,100,255,.14);color:#e7b4ff;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:850;letter-spacing:.04em}.detail-card h2{margin:18px 0 18px;font-size:29px;line-height:1.2;letter-spacing:-.035em}.author{display:flex;align-items:center;gap:11px;padding-bottom:19px;border-bottom:1px solid var(--line)}.avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#079da5,#157d83);font-weight:800}.author strong,.author span{display:block}.author span{color:#b8c0cb;margin-top:2px;font-size:14px}.copy{padding:21px 0 20px;border-bottom:1px solid var(--line)}.copy-label{display:block;font-size:13px;font-weight:850;margin-bottom:13px}.copy-text{white-space:pre-wrap;color:#edf0f5;line-height:1.62;font-size:15px}.meta{margin-top:20px;border:1px solid var(--line);border-radius:14px;padding:16px}.meta-row{display:grid;grid-template-columns:25px 1fr;gap:10px;padding:9px 0}.meta-row+.meta-row{border-top:1px solid rgba(255,255,255,.055)}.meta-icon{color:#dce2e9;font-size:17px}.meta-label{display:block;color:#9fa8b5;font-size:12px;margin-bottom:3px}.meta-value{display:block;color:#f4f6f8;font-size:14px;word-break:break-word}.meta-value a{color:#f4f6f8;text-decoration:none}.decision-zone,.state-card{margin:0 24px 24px;border-top:1px solid var(--line);padding:28px 10px 0}.decision-copy{display:flex;gap:14px;align-items:flex-start;margin:0 8px 22px}.sparkle{font-size:25px}.decision-copy h2{margin:0 0 7px;font-size:21px}.decision-copy p{margin:0;color:#b5bdc8;line-height:1.55}.actions-grid{display:grid;grid-template-columns:1fr 2.1fr 1fr;gap:16px}.approve-form{margin:0}.approve-form .action-card{width:100%;height:100%}.action-card{min-height:112px;border-radius:14px;text-decoration:none;padding:20px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transition:transform .16s ease,filter .16s ease,box-shadow .16s ease}.action-card:hover{transform:translateY(-2px);filter:brightness(1.06)}.action-card span:last-child{margin-top:8px;font-size:12px;line-height:1.45}.action-title{font-size:17px;font-weight:850}.action-card.change{border:1px solid rgba(215,132,255,.75);color:#f0c3ff;background:rgba(158,71,207,.055)}.action-card.approve{border:1px solid #ff7c1e;color:#fff;background:linear-gradient(135deg,#ff6900,#ff7b22);box-shadow:0 14px 32px rgba(255,106,0,.19)}.action-card.reject{border:1px solid rgba(255,77,79,.8);color:#ff6264;background:rgba(255,45,48,.035)}button.action-card{font:inherit;cursor:pointer}.feedback-panel{margin:18px 0 0;border:1px solid rgba(216,132,255,.24);border-radius:16px;background:rgba(11,17,26,.92);padding:20px}.feedback-panel.reject-mode{border-color:rgba(255,77,79,.30)}.feedback-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.feedback-head h3{margin:0 0 6px;font-size:20px}.feedback-head p{margin:0;color:#aeb7c3;line-height:1.5}.feedback-close{border:0;background:transparent;color:#aeb7c3;font-size:26px;cursor:pointer}.feedback-grid{display:grid;grid-template-columns:.72fr 1.28fr;gap:14px}.feedback-grid label>span{display:block;margin-bottom:7px;font-size:12px;font-weight:800;color:#c8cfd8}.feedback-grid select,.feedback-grid textarea{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:#0a1018;color:#f5f7fa;padding:12px 13px;font:inherit}.feedback-grid textarea{min-height:112px;resize:vertical}.feedback-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.feedback-cancel,.feedback-submit{min-height:44px;border-radius:10px;padding:0 16px;font:inherit;font-weight:800;cursor:pointer}.feedback-cancel{border:1px solid rgba(255,255,255,.15);background:transparent;color:#d2d7df}.feedback-submit{border:0;background:linear-gradient(135deg,#8e49bd,#ba65e5);color:#fff}.feedback-panel.reject-mode .feedback-submit{background:linear-gradient(135deg,#c43238,#f05155)}.security{width:max-content;max-width:calc(100% - 40px);margin:4px auto 26px;padding:8px 13px;border-radius:8px;background:rgba(255,255,255,.035);color:#9ea7b3;font-size:12px}.state-card{display:flex;align-items:center;gap:14px;border:1px solid rgba(67,209,124,.28);background:rgba(67,209,124,.07);border-radius:14px;padding:18px 20px}.state-card.rejected{border-color:rgba(255,77,79,.28);background:rgba(255,77,79,.07)}.state-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:rgba(67,209,124,.13);color:#6df09d;font-weight:900}.state-card.rejected .state-icon{background:rgba(255,77,79,.12);color:#ff7274}.state-card strong,.state-card span{display:block}.state-card>div>span{color:#bac2cc;margin-top:4px}.footer{text-align:center;color:#98a2af;font-size:13px;padding:2px 0 0}.footer-mark{display:block;margin:12px auto 0;font-size:31px;font-weight:950;font-style:italic;background:linear-gradient(145deg,#ff8a00,#ff4b16);-webkit-background-clip:text;background-clip:text;color:transparent;width:max-content}
@media(max-width:900px){body{padding:16px 10px 30px}.modal{border-radius:22px}.top{padding:22px 20px 8px}.brand{font-size:25px}.headline-row{padding:12px 20px 22px;display:block}.platform{margin-top:18px;width:100%;min-width:0}.content-grid{grid-template-columns:1fr;padding:0 20px 22px}.media-card{min-height:0;aspect-ratio:9/16;max-height:72vh}.detail-card{padding:20px}.actions-grid{grid-template-columns:1fr}.action-card{min-height:86px}.decision-zone{margin:0 14px 16px;padding-top:23px}.security{margin-bottom:18px}.autoplay-hint{display:none}.feedback-grid{grid-template-columns:1fr}.feedback-actions{flex-direction:column-reverse}.feedback-cancel,.feedback-submit{width:100%}}
</style>
</head>
<body>
<div class="backdrop-image" aria-hidden="true"></div><div class="backdrop" aria-hidden="true"></div>
<main class="shell">
<section class="modal">
  <div class="top"><div class="brand"><span class="brand-mark">S</span><span>spreelo</span></div><button class="close" type="button" aria-label="${escapeHtml(labels.close)}" onclick="closePreview()">×</button></div>
  <div class="headline-row"><div class="headline"><h1>${escapeHtml(labels.pageTitle)}</h1><p>${escapeHtml(labels.intro)}</p></div><div class="platform">${platformIcon}<div><strong>${escapeHtml(platform.label)}</strong><small>${escapeHtml(status === "pending_approval" ? (dueNow ? labels.approveNowHelp : labels.approveLaterHelp) : status)}</small></div></div></div>
  <div class="content-grid">
    <div class="media-card">${videoUrl ? `<span class="duration">${escapeHtml(duration)}</span>` : ""}${mediaIsVideo ? `<span class="autoplay-hint">${escapeHtml(labels.autoplayHint)}</span>` : ""}${mediaMarkup}</div>
    <aside class="detail-card"><span class="pill">▣ ${escapeHtml(labels.productPost)}</span><h2>${escapeHtml(title)}</h2><div class="author"><span class="avatar">${escapeHtml((ownerName || brandName || "S").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(ownerName || brandName)}</strong><span>${escapeHtml(brandName)}</span></div></div><div class="copy"><span class="copy-label">${escapeHtml(labels.postText)}</span><div class="copy-text">${escapeHtml(post?.content || "")}</div></div><div class="meta"><div class="meta-row"><span class="meta-icon">▣</span><div><span class="meta-label">${escapeHtml(labels.scheduled)}</span><span class="meta-value">${escapeHtml(formatDate(post?.scheduled_for, locale))}</span></div></div><div class="meta-row"><span class="meta-icon">◎</span><div><span class="meta-label">${escapeHtml(labels.visibility)}</span><span class="meta-value">${escapeHtml(visibilityCopy(post, labels))}</span></div></div>${websiteUrl ? `<div class="meta-row"><span class="meta-icon">↗</span><div><span class="meta-label">${escapeHtml(labels.link)}</span><span class="meta-value"><a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noreferrer">${escapeHtml(displayUrl(websiteUrl))}</a></span></div></div>` : ""}</div></aside>
  </div>
  ${actionPanel}
  <div class="security">🔒 ${escapeHtml(labels.secure)}</div>
</section>
<div class="footer">${escapeHtml(labels.footer)}<span class="footer-mark">S</span></div>
</main>
<script>
function closePreview(){try{if(history.length>1){history.back();return}}catch(e){}location.href=${JSON.stringify(APP_URL)}}
function openFeedback(mode){const panel=document.getElementById('feedback-panel');if(!panel)return;const isReject=mode==='reject';document.getElementById('decision-type').value=isReject?'reject':'changes';document.getElementById('feedback-title').textContent=isReject?${JSON.stringify(labels.feedbackRejectTitle)}:${JSON.stringify(labels.feedbackChangeTitle)};document.getElementById('feedback-intro').textContent=isReject?${JSON.stringify(labels.feedbackRejectIntro)}:${JSON.stringify(labels.feedbackChangeIntro)};document.getElementById('feedback-submit').textContent=isReject?${JSON.stringify(labels.confirmReject)}:${JSON.stringify(labels.sendChanges)};panel.classList.toggle('reject-mode',isReject);panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
function closeFeedback(){const panel=document.getElementById('feedback-panel');if(panel)panel.hidden=true;}
window.addEventListener('DOMContentLoaded',()=>{const video=document.getElementById('spreelo-video');if(video){video.muted=true;const play=video.play();if(play&&play.catch)play.catch(()=>{});}});
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
