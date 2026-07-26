const BLOCKED_RESOURCE_TYPES = new Set(["font", "media"]);
const IMAGE_URL_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;

function normalizeCandidate(candidate) {
  const url = String(candidate?.url || "").trim();
  const source = String(candidate?.source || "rendered:browser");
  const sourceCanProveImage = /rendered:(?:img|picture)/i.test(source);
  if (
    !url ||
    !/^https?:\/\//i.test(url) ||
    (!sourceCanProveImage && !IMAGE_URL_PATTERN.test(url))
  ) {
    return null;
  }

  return {
    url,
    source,
    alt: String(candidate?.alt || ""),
    context: String(candidate?.context || "").slice(0, 700),
    declaredWidth: Number(
      candidate?.declaredWidth || candidate?.naturalWidth || 0
    ),
    naturalWidth: Number(candidate?.naturalWidth || 0),
    naturalHeight: Number(candidate?.naturalHeight || 0),
    roleScore: Number.isFinite(Number(candidate?.roleScore))
      ? Number(candidate.roleScore)
      : undefined,
  };
}

async function getBrowserLaunchOptions() {
  const [{ default: puppeteer }, chromiumModule] = await Promise.all([
    import("puppeteer-core"),
    import("@sparticuz/chromium"),
  ]);
  const chromium = chromiumModule.default || chromiumModule;
  const configuredExecutable = String(
    process.env.PRODUCT_IMAGE_BROWSER_EXECUTABLE_PATH ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      ""
  ).trim();
  const executablePath =
    configuredExecutable || (await chromium.executablePath());

  return {
    puppeteer,
    launchOptions: {
      executablePath,
      args: chromium.args,
      defaultViewport: { width: 1440, height: 1600, deviceScaleFactor: 1 },
      headless: "shell",
    },
  };
}

async function collectRenderedCandidates(page) {
  return page.evaluate(() => {
    const imageUrlPattern =
      /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
    const candidates = [];
    const seen = new Set();
    const add = (entry) => {
      let absoluteUrl = "";
      try {
        absoluteUrl = new URL(entry?.url || "", document.baseURI).toString();
      } catch {
        return;
      }
      if (
        !/^https?:\/\//i.test(absoluteUrl) ||
        (!/^rendered:(?:img|picture)/i.test(entry?.source || "") &&
          !imageUrlPattern.test(absoluteUrl)) ||
        seen.has(absoluteUrl)
      ) {
        return;
      }
      seen.add(absoluteUrl);
      candidates.push({ ...entry, url: absoluteUrl });
    };
    const contextFor = (element) => {
      const container =
        element.closest(
          "[role=dialog],main,[data-testid*=product],[class*=product],[class*=gallery],[class*=media]"
        ) || element.parentElement;
      return [
        element.getAttribute("data-testid"),
        element.getAttribute("class"),
        element.getAttribute("role"),
        container?.getAttribute?.("data-testid"),
        container?.getAttribute?.("class"),
        container?.getAttribute?.("role"),
        element.alt,
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 700);
    };
    const scoreFor = (element, context, width) => {
      const combined = `${context} ${element.currentSrc || element.src || ""}`;
      let score = element.closest("main,[role=main]") ? 98 : 72;
      if (element.closest("[role=dialog]")) score = Math.max(score, 122);
      if (/gallery|product.media|main.image|zoom|lightbox|full/i.test(combined)) {
        score = Math.max(score, 116);
      }
      if (/thumb|thumbnail|tablist|swatch|recommend|similar|related/i.test(combined)) {
        score -= 60;
      }
      if (width >= 1000) score += 10;
      return score;
    };

    for (const image of document.querySelectorAll("img")) {
      const context = contextFor(image);
      const width = Number(image.naturalWidth || image.width || 0);
      const common = {
        alt: image.alt || "",
        context,
        naturalWidth: Number(image.naturalWidth || 0),
        naturalHeight: Number(image.naturalHeight || 0),
        roleScore: scoreFor(image, context, width),
      };
      const attributes = [
        "currentSrc",
        "src",
        "data-src",
        "data-original",
        "data-lazy-src",
        "data-zoom-image",
        "data-full",
        "data-large",
        "data-large-image",
      ];
      for (const attribute of attributes) {
        const value =
          attribute === "currentSrc"
            ? image.currentSrc
            : image.getAttribute(attribute);
        add({
          ...common,
          url: value,
          source: `rendered:img:${attribute}`,
        });
      }
      for (const attribute of ["srcset", "data-srcset", "data-lazy-srcset"]) {
        const value = image.getAttribute(attribute) || "";
        for (const entry of value.split(",")) {
          const parts = entry.trim().split(/\s+/);
          const descriptor = parts.at(-1) || "";
          const widthMatch = descriptor.match(/^(\d+)w$/i);
          add({
            ...common,
            url: widthMatch ? parts.slice(0, -1).join(" ") : parts.join(" "),
            source: `rendered:img:${attribute}`,
            declaredWidth: Number(widthMatch?.[1] || 0),
          });
        }
      }

      const linkedImage = image.closest("a[href]");
      if (linkedImage) {
        add({
          ...common,
          url: linkedImage.href,
          source: "rendered:anchor:image",
          roleScore: common.roleScore + 12,
        });
      }
    }

    for (const source of document.querySelectorAll("picture source")) {
      const context = contextFor(source);
      for (const attribute of ["srcset", "data-srcset"]) {
        const value = source.getAttribute(attribute) || "";
        for (const entry of value.split(",")) {
          const parts = entry.trim().split(/\s+/);
          const descriptor = parts.at(-1) || "";
          const widthMatch = descriptor.match(/^(\d+)w$/i);
          add({
            url: widthMatch ? parts.slice(0, -1).join(" ") : parts.join(" "),
            source: `rendered:picture:${attribute}`,
            context,
            declaredWidth: Number(widthMatch?.[1] || 0),
          });
        }
      }
    }

    return candidates;
  });
}

async function clickPrimaryProductImage(page, primaryImageUrl = "") {
  const handle = await page.evaluateHandle((preferredUrl) => {
    const negativePattern =
      /thumb|thumbnail|tablist|swatch|recommend|similar|related|logo|icon/i;
    let preferredPath = "";
    try {
      preferredPath = new URL(preferredUrl).pathname.toLowerCase();
    } catch {
      preferredPath = "";
    }
    const images = [...document.querySelectorAll("main img,[role=main] img,img")]
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const context = [
          image.getAttribute("data-testid"),
          image.getAttribute("class"),
          image.closest("[class],[data-testid]")?.getAttribute("class"),
          image.closest("[class],[data-testid]")?.getAttribute("data-testid"),
        ]
          .filter(Boolean)
          .join(" ");
        const area =
          Math.max(Number(image.naturalWidth || 0), rect.width) *
          Math.max(Number(image.naturalHeight || 0), rect.height);
        let currentPath = "";
        try {
          currentPath = new URL(
            image.currentSrc || image.src || "",
            document.baseURI
          ).pathname.toLowerCase();
        } catch {
          currentPath = "";
        }
        const samePreferredAsset =
          preferredPath && currentPath && preferredPath === currentPath;
        const contextWeight = negativePattern.test(context) ? 0.05 : 1;
        return {
          image,
          score: area * contextWeight * (samePreferredAsset ? 100 : 1),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
    const primary = images[0]?.image;
    if (!primary) return null;
    return (
      primary.closest("button,[role=button]") ||
      (getComputedStyle(primary).cursor === "zoom-in" ? primary : null)
    );
  }, primaryImageUrl);

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    return false;
  }

  try {
    await element.click({ delay: 30 });
    await new Promise((resolve) => setTimeout(resolve, 900));
    return true;
  } catch {
    return false;
  } finally {
    await handle.dispose();
  }
}

export async function createProductImageBrowserSession({ validateUrl }) {
  if (typeof validateUrl !== "function") {
    throw new Error("A browser URL validation callback is required");
  }

  const { puppeteer, launchOptions } = await getBrowserLaunchOptions();
  const browser = await puppeteer.launch(launchOptions);
  const validatedHosts = new Map();

  const validateRequestUrl = async (value) => {
    const parsed = new URL(value);
    const hostKey = `${parsed.protocol}//${parsed.host}`;
    if (!validatedHosts.has(hostKey)) {
      validatedHosts.set(
        hostKey,
        Promise.resolve(validateUrl(`${parsed.protocol}//${parsed.host}/`))
      );
    }
    await validatedHosts.get(hostKey);
  };

  return {
    async discover({ pageUrl, primaryImageUrl = "" }) {
      const safePageUrl = await validateUrl(pageUrl);
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", async (request) => {
        const requestUrl = request.url();
        if (/^(?:data|blob):/i.test(requestUrl)) {
          request.continue().catch(() => {});
          return;
        }
        try {
          await validateRequestUrl(requestUrl);
          if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
            request.abort().catch(() => {});
          } else {
            request.continue().catch(() => {});
          }
        } catch {
          request.abort().catch(() => {});
        }
      });

      try {
        await page.goto(safePageUrl, {
          waitUntil: "domcontentloaded",
          timeout: 18_000,
        });
        await new Promise((resolve) => setTimeout(resolve, 1_200));
        await page.evaluate(() => {
          const main = document.querySelector("main,[role=main]");
          (main || document.scrollingElement)?.scrollTo?.(0, 500);
        });
        await new Promise((resolve) => setTimeout(resolve, 500));

        const beforeClick = await collectRenderedCandidates(page);
        const clicked = await clickPrimaryProductImage(page, primaryImageUrl);
        const afterClick = clicked ? await collectRenderedCandidates(page) : [];
        const unique = new Map();
        for (const candidate of [...beforeClick, ...afterClick]) {
          const normalized = normalizeCandidate(candidate);
          if (!normalized) continue;
          const existing = unique.get(normalized.url);
          if (
            !existing ||
            Number(normalized.roleScore || 0) > Number(existing.roleScore || 0)
          ) {
            unique.set(normalized.url, normalized);
          }
        }
        return [...unique.values()].slice(0, 160);
      } finally {
        await page.close().catch(() => {});
      }
    },
    async close() {
      await browser.close();
    },
  };
}
