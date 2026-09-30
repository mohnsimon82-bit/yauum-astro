// Browser-side helpers shared by the inquiry form and the contact-click
// tracker: first-touch attribution, visitor geo, and inquiry delivery.
// Both consumers run in client <script> blocks, so this stays DOM-only.

// Delivery goes to our own same-origin Pages Function (functions/api/inquiry.ts)
// which calls Resend server-side. The recipients and the API key live there, so
// neither is shipped in the client bundle any more. Replaced the previous direct
// fan-out to formsubmit.co after that endpoint began returning HTTP 500 for
// every submission.
export const INQUIRY_ENDPOINT = "/api/inquiry";

const ENTRY_KEY = "yauum_entry";

const AI_SOURCES: Record<string, string> = {
  "chatgpt.com": "ChatGPT", "chat.openai.com": "ChatGPT", "openai.com": "ChatGPT",
  "perplexity.ai": "Perplexity", "gemini.google.com": "Gemini", "bard.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot", "claude.ai": "Claude", "anthropic.com": "Claude",
  "grok.com": "Grok", "x.ai": "Grok", "you.com": "You.com", "phind.com": "Phind",
  "kagi.com": "Kagi", "poe.com": "Poe", "deepseek.com": "DeepSeek", "mistral.ai": "Mistral",
};
const SEARCH_SOURCES: Record<string, string> = {
  "google.com": "Google", "google.co.uk": "Google", "google.de": "Google", "google.fr": "Google",
  "bing.com": "Bing", "duckduckgo.com": "DuckDuckGo", "baidu.com": "Baidu",
  "yandex.com": "Yandex", "ecosia.org": "Ecosia", "search.brave.com": "Brave",
};
const SOCIAL_SOURCES: Record<string, string> = {
  "linkedin.com": "LinkedIn", "facebook.com": "Facebook", "instagram.com": "Instagram",
  "x.com": "X", "twitter.com": "X", "youtube.com": "YouTube", "pinterest.com": "Pinterest",
  "tiktok.com": "TikTok", "reddit.com": "Reddit",
};

const matchSource = (map: Record<string, string>, host: string, src: string) =>
  Object.keys(map).find(
    (key) => host === key || host.endsWith("." + key) || src === key || src.startsWith(key.split(".")[0]),
  ) || "";

/** 首次落地信息，随会话保留——访客多半先落首页再逛到产品页。 */
export function captureEntry(): void {
  try {
    if (!sessionStorage.getItem(ENTRY_KEY)) {
      sessionStorage.setItem(
        ENTRY_KEY,
        JSON.stringify({ page: location.href, referrer: document.referrer || "", at: new Date().toISOString() }),
      );
    }
  } catch {
    /* 隐私模式下 sessionStorage 不可用：退化为只用当次上下文 */
  }
}

export function readEntry(): { page?: string; referrer?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(ENTRY_KEY) || "{}");
  } catch {
    return {};
  }
}

/** 访客国家/城市：取一次缓存，失败静默（不阻塞提交）。 */
let geoPromise: Promise<{ country: string; city: string }> | null = null;
export function loadGeo(): Promise<{ country: string; city: string }> {
  if (!geoPromise) {
    geoPromise = fetch("https://ipwho.is/", { signal: AbortSignal.timeout(2500) })
      .then((res) => res.json())
      .then((geo) => (geo && geo.success !== false
        ? { country: String(geo.country || ""), city: String(geo.city || "") }
        : { country: "", city: "" }))
      .catch(() => ({ country: "", city: "" }));
  }
  return geoPromise;
}

/** 渠道归类：AI 推荐 / 付费搜索 / 自然搜索 / 社交 / 站内 / 外链 / 直接。 */
export function attribution(): {
  traffic: string; channel: string; entryPage: string; entryReferrer: string; sourcePage: string;
} {
  const entry = readEntry();
  const referrer = entry.referrer || document.referrer || "";
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  let params: URLSearchParams;
  try {
    params = new URL(entry.page || location.href).searchParams;
  } catch {
    params = new URLSearchParams();
  }
  const utmSource = (params.get("utm_source") || "").toLowerCase();
  const utmMedium = (params.get("utm_medium") || "").toLowerCase();
  const gclid = params.get("gclid") || params.get("gbraid") || params.get("wbraid") || "";

  const ai = matchSource(AI_SOURCES, host, utmSource);
  const search = matchSource(SEARCH_SOURCES, host, utmSource);
  const social = matchSource(SOCIAL_SOURCES, host, utmSource);

  let channel: string;
  let traffic: string;
  if (ai) {
    channel = "AI 推荐";
    traffic = `AI 推荐（${AI_SOURCES[ai]}）`;
  } else if (gclid || /cpc|paid|ppc/.test(utmMedium)) {
    channel = "付费搜索";
    traffic = `付费搜索（${search ? SEARCH_SOURCES[search] : "Google Ads"}）`;
  } else if (search) {
    channel = "自然搜索";
    traffic = `自然搜索（${SEARCH_SOURCES[search]}）`;
  } else if (social) {
    channel = "社交媒体";
    traffic = `社交媒体（${SOCIAL_SOURCES[social]}）`;
  } else if (/yauum\.com$/.test(host)) {
    channel = "站内跳转";
    traffic = `站内跳转（${host}）`;
  } else if (host) {
    channel = "外链";
    traffic = `外链（${host}）`;
  } else if (utmSource) {
    channel = "带参来源";
    traffic = `带参来源（utm_source=${utmSource}）`;
  } else {
    channel = "直接访问";
    traffic = "直接访问（或来源被 AI/浏览器隐藏）";
  }
  ["utm_source", "utm_medium", "utm_campaign", "gclid"].forEach((key) => {
    const value = params.get(key);
    if (value) traffic += ` · ${key}=${value}`;
  });

  return {
    traffic,
    channel,
    entryPage: entry.page || location.href,
    entryReferrer: referrer,
    sourcePage: location.href,
  };
}

export const beijingTime = () =>
  new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + "（北京时间）";

/** 点击位置标签，与现有 GA 事件口径一致。 */
export function getClickLocation(link: Element): string {
  if (link.closest(".mobile-menu")) return "mobile_menu";
  if (link.closest(".contact-dock, .site-dock, .dock")) return "floating_dock";
  if (link.closest(".site-header, .site-top, header")) return "header";
  if (link.closest(".home-hero, .product-hero, .standard-hero, .hero, .pd-hero")) return "hero";
  if (link.closest(".inquiry-section, .pd-inq, [data-od-id='inquiry-conversion']")) return "inquiry_section";
  if (link.closest(".site-footer, footer")) return "footer";
  return "content";
}

/** 投递到同源接口；主收件与提醒邮箱的fan-out在服务端完成。 */
export async function deliver(payload: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(INQUIRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({} as Record<string, unknown>));
    return res.ok && body.success !== "false" && body.success !== false;
  } catch {
    return false;
  }
}
