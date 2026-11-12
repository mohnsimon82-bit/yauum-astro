#!/usr/bin/env node
// 小语种文案构建后翻译。
//
// 流程：
//  1. 从 dist 的英文页面里收集「文本块」（外层块元素的 innerHTML）与元数据字符串；
//  2. 用 Google 公开翻译端点补齐词典（src/i18n/<locale>-block-dictionary.json），
//     已翻译过的字符串直接命中缓存，因此日常构建零网络请求；
//  3. 把小语种路由的页面按词典原位替换：只改文本节点，标签/属性/图片/SVG 原样保留；
//  4. 标题/描述/H1 用人工撰写的 seo-overrides.json 覆盖，保证关键词与长度达标。
//
// 用法：
//   node scripts/i18n/translate.mjs              # 全部语言
//   node scripts/i18n/translate.mjs de fr        # 指定语言
//   node scripts/i18n/translate.mjs --refresh-seo # 仅重放 overrides（不联网）
import fs from "node:fs";
import path from "node:path";
import {
  CONFIG,
  DIST,
  SEO_OVERRIDES,
  applyReplacements,
  buildTextReplacements,
  collectBlocks,
  escapeHtml,
  loadDictionary,
  localizedFile,
  norm,
  plainText,
  saveDictionary,
  sourceFile,
} from "./lib.mjs";

const SPLIT = "\n@@@\n";
const MAX_BATCH_CHARS = 750; // 同时兼容 Google 与 Bing（Bing 单次上限约 1000 字符）
const repairMode = process.argv.includes("--repair");
const provider =
  process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1] ?? "google";
const argValue = (name) =>
  process.argv.find((arg) => arg.startsWith(`${name}=`))?.split("=")[1];
// 本地批量补词时可放宽批大小提速；默认 750 兼容 Bing 上限，CI 更稳。
const allowBingFallback = !process.argv.includes("--no-bing");
const BATCH_LIMIT = Number(argValue("--batch") ?? MAX_BATCH_CHARS);
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const locales = args.length ? args : CONFIG.locales;

// 判读「值等于原文」的词典项是不是真没翻译：
// 单个品牌/术语（Yauum、MOQ、Streetwear、FAQ）本来就该保持一致，
// 含两个以上英文词或典型英文功能词的才是失败残留，需要重译。
// 只保护真正不该翻译的标识：公司法定名、电话、邮箱、纯品牌名。
// 注意不能保护所有含 "Yauum" 的段落——正文里正常会出现品牌名，那些要照常翻译。
const PROTECTED =
  /Dongguan Yauum Apparel|WhatsApp \/ \+|mumu@yauum\.com|^Yauum$|^YAUUM$|^\d{4} Yauum/i;
const ENGLISH_HINT =
  /\b(the|and|for|with|from|your|our|you|this|that|are|is|of|in|on|by|we|how|what|why|when|where|which|who|about|home|blog|contact|production|services?|solutions?|products?|overview|read|more|learn|send|inquiry|quote|language|menu|close|open|next|previous|page|author|quality|process|materials|fit|styles?|specification|fabric|decoration|workflow|buyers?|details|branding|brief)\b/i;

function looksUntranslated(key) {
  if (PROTECTED.test(key)) return false;
  const text = key.replace(/<[^>]*>/g, " ");
  const words = text.match(/[A-Za-z]{3,}/g) ?? [];
  return words.length >= 2 || ENGLISH_HINT.test(text);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- 术语后处理 ----------
// Google 直译在服装 B2B 语境里会稳定地错几类词，这里按语言做定点纠正。
const GLOSSARY = {
  de: [
    [/\bHandelsmarken\b/g, "Private Label"],
    [/\bHandelsmarke\b/g, "Private Label"],
    [/\bEigenmarken\b/g, "Private Label"],
    [/\bPrivatmarke\b/g, "Private Label"],
    [/\bPrivatmarken\b/g, "Private Label"],
    [/\bZuhause\b/g, "Startseite"],
    [/\bSemmelbrösel\b/g, "Breadcrumb-Navigation"],
    [/\bKäufer passt\b/g, "Passform"],
    [/\bKäufer-Passform\b/g, "Passform"],
    [/\bStraßenmode\b/g, "Streetwear"],
    [/\bStraßenkleidung\b/g, "Streetwear"],
    [/\bStraßenbekleidung\b/g, "Streetwear"],
    [/\bKapuzenpullis\b/g, "Kapuzenpullover"],
    [/\bKapuzenpulli\b/g, "Kapuzenpullover"],
    [/\bUnterhosen\b/g, "Hosen"],
    [/Schneid-und-Näh/g, "Cut-and-Sew"],
    [/\bSTÜCK\b/g, "Stück"],
    [/\bSTK\b/g, "Stück"],
    [/\bT-Shirt-Hersteller\b/g, "T-Shirt Hersteller"],
    [/\bBekleidungshersteller\b/g, "Bekleidungshersteller"],
  ],
  fr: [
    [/\bBlogue\b/g, "Blog"],
    [/\b(\d+)\s*PCS\b/gi, (m, n) => `${n} pièces`],
    [/\bblogue\b/g, "blog"],
    [/\bvêtements de rue\b/gi, "streetwear"],
    [/\bmode de rue\b/gi, "streetwear"],
    [/\bsweats? à capuche\b/gi, (match) => (match.toLowerCase().endsWith("s") ? "sweats à capuche" : "sweat à capuche")],
    [/\bmarque privée\b/gi, "marque privée"],
  ],
  es: [
    [/\bropa urbana\b/gi, "streetwear"],
    [/\bropa de calle\b/gi, "streetwear"],
    [/\b(\d+)\s*PCS\b/gi, (m, n) => `${n} piezas`],
    [/\bplayeras\b/gi, "camisetas"],
    [/\bfranelas\b/gi, "camisetas"],
    [/\bpoleras\b/gi, "camisetas"],
    [/\bprendas de vestir\b/gi, "ropa"],
  ],
};

// 机器翻译偶尔会把句号后的首词留成小写（"…zu planen ist. es handelt…"）。
// 只在「句末标点 + 空格」后纠正常见句首词，避免误伤 URL、品牌名与正文中的小写专名。
const SENTENCE_STARTERS = {
  de: /([.!?]\s+)(es|sie|der|die|das|wir|ihre|ihr|uns|diese|dieser|ein|eine|im|in|am|an|auf|für|mit|von|zu|bei|aus|nach|ohne|um|als|wenn|aber|oder|und|ist|sind|wird|werden|kann|können|muss|müssen|dann|so|hier|dort)\b/g,
  fr: /([.!?]\s+)(il|elle|on|nous|vous|ils|elles|le|la|les|un|une|des|du|ce|cette|ces|pour|avec|sans|dans|sur|au|aux|et|ou|mais|si|quand|comme|votre|notre|chaque|leurs)\b/g,
  es: /([.!?]\s+)(el|la|los|las|un|una|unos|unas|es|son|se|su|sus|para|con|sin|en|por|y|o|pero|si|cuando|como|nuestro|vuestra|este|esta|estos|estas|que)\b/g,
};

function capitalizeSentences(text, locale) {
  const pattern = SENTENCE_STARTERS[locale];
  if (!pattern) return text;
  return text.replace(pattern, (match, prefix, word) => prefix + word[0].toUpperCase() + word.slice(1));
}

function postprocess(text, locale) {
  let value = String(text);
  for (const [pattern, replacement] of GLOSSARY[locale] ?? []) {
    value = value.replace(pattern, replacement);
  }
  value = capitalizeSentences(value, locale);
  value = value
    .replace(/[ \t]+([,.;!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
  return value;
}

/** 标题统一成「关键词短语 | Yauum」，且只允许一个竖线 */
function normalizeTitle(value, locale) {
  let title = postprocess(norm(value), locale);
  title = title.replace(/\|/g, " ");
  title = title.replace(/\bYauum\b/gi, "").replace(/\s+/g, " ").trim();
  title = title.replace(/[\s\-–—:|,.;]+$/g, "");
  return `${title} | Yauum`;
}

// ---------- Google 翻译 ----------
// 同一 IP 连续批量翻译会触发 429；一旦命中就停止重试，整轮改走 Bing，
// 避免每个批次都卡 6 次退避。
let googleRateLimited = false;

async function googleTranslate(text, locale) {
  if (googleRateLimited) return null;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${locale}&dt=t`;
  const body = new URLSearchParams({ q: text });
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "Mozilla/5.0 (compatible; YauumI18n/1.0)",
        },
        body,
      });
      if (response.status === 429) {
        googleRateLimited = true;
        throw new Error("HTTP 429 rate limited");
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return (data?.[0] ?? []).map((part) => part?.[0] ?? "").join("");
    } catch (error) {
      lastError = error;
      if (googleRateLimited) break;
      const wait = error?.message?.includes("429") ? 4000 * (attempt + 1) : 900 * (attempt + 1);
      await sleep(wait);
    }
  }
  console.warn(`  ! translate failed (${locale}): ${lastError?.message ?? "unknown"}`);
  return null; // 不把英文原文写进词典，否则会被误判为已翻译
}

// ---------- Bing 网页翻译（Google gtx 被限流时的备用通道） ----------
// 免费、无需密钥：先取 translator 页面里的 IG / IID / token，再调 ttranslatev3。
// 单次 text 上限约 1000 字符，因此批大小压到 700。
let bingSession = null;

async function bingInit() {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  const response = await fetch("https://www.bing.com/translator", {
    headers: { "user-agent": userAgent },
  });
  const html = await response.text();
  const helper = html.match(/params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]/);
  const ig = html.match(/IG:"([^"]+)"/);
  const iid = html.match(/data-iid="([^"]+)"/);
  if (!helper || !ig || !iid) throw new Error("bing session parse failed");
  const [key, token] = helper[1].split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
  bingSession = { key, token, ig: ig[1], iid: iid[1], at: Date.now(), userAgent };
  return bingSession;
}

async function bingTranslate(text, locale) {
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      if (!bingSession || Date.now() - bingSession.at > 20 * 60 * 1000) await bingInit();
      const session = bingSession;
      const body = new URLSearchParams({
        fromLang: "en",
        to: locale,
        text,
        token: session.token,
        key: session.key,
      });
      const response = await fetch(
        `https://www.bing.com/ttranslatev3?isVertical=1&IG=${session.ig}&IID=${session.iid}`,
        {
          method: "POST",
          headers: {
            "user-agent": session.userAgent,
            "content-type": "application/x-www-form-urlencoded",
            referer: "https://www.bing.com/translator",
          },
          body,
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const translated = data?.[0]?.translations?.[0]?.text;
      if (translated) return translated;
      throw new Error("bing empty translation");
    } catch (error) {
      lastError = error;
      bingSession = null; // token 失效或限流：下次重取会话
      await sleep(1500 * (attempt + 1));
    }
  }
  console.warn(`  ! bing failed (${locale}): ${lastError?.message ?? "unknown"}`);
  return null;
}

async function translateText(text, locale) {
  if (provider === "bing") return bingTranslate(text, locale);
  const viaGoogle = await googleTranslate(text, locale);
  if (viaGoogle) return viaGoogle;
  return allowBingFallback ? bingTranslate(text, locale) : null;
}

const CHUNK_SIZE = Number(argValue("--chunk") ?? 750);

function chunk(text, size = CHUNK_SIZE) {
  if (text.length <= size) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf(" ", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateLong(text, locale) {
  const pieces = [];
  for (const part of chunk(text)) {
    const translated = await translateText(part, locale);
    if (translated) pieces.push(translated);
  }
  return pieces.length ? pieces.join(" ") : null;
}

async function translateMissing(keys, locale, dictionary) {
  const missing = keys.filter((key) => !(key in dictionary));
  console.log(`  ${locale}: ${keys.length} keys, ${missing.length} new`);
  if (!missing.length) return dictionary;

  const batches = [];
  let batch = [];
  let size = 0;
  for (const key of missing) {
    const projected = key.length + SPLIT.length;
    if (batch.length && size + projected > BATCH_LIMIT) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    if (projected > BATCH_LIMIT) {
      batches.push([key]); // 超长单块单独走
      continue;
    }
    batch.push(key);
    size += projected;
  }
  if (batch.length) batches.push(batch);

  // 批次失败（限流/分隔符被改写）时二分重试，避免整批逐条翻译造成长时间卡顿。
  async function translateGroup(group) {
    if (group.length === 1 && group[0].length > BATCH_LIMIT) {
      return [await translateLong(group[0], locale)];
    }
    const raw = await translateText(group.join(SPLIT), locale);
    const parts = raw == null ? null : raw.split(/\s*@@@\s*/);
    if (parts && parts.length === group.length) return parts;
    if (group.length === 1) return [await translateLong(group[0], locale)];
    const mid = Math.ceil(group.length / 2);
    return [
      ...(await translateGroup(group.slice(0, mid))),
      ...(await translateGroup(group.slice(mid))),
    ];
  }

  // Bing 支持并发请求（实测 8 路并发均成功），默认 6 路以缩短补词时间；
  // Google gtx 对并发不友好，默认保持串行。
  const CONCURRENCY = Number(argValue("--concurrency") ?? (provider === "bing" ? 6 : 1));
  let cursor = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= batches.length) return;
      const translated = await translateGroup(batches[index]);
      batches[index].forEach((key, i) => {
        const value = translated[i];
        if (value && value.trim()) dictionary[key] = postprocess(value, locale);
      });
      done += 1;
      if (done % 20 === 0 || done === batches.length) {
        saveDictionary(locale, dictionary);
        console.log(`  ${locale}: batch ${done}/${batches.length}`);
      }
      await sleep(provider === "bing" || googleRateLimited ? 150 : 150);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()),
  );
  saveDictionary(locale, dictionary);
  return dictionary;
}

// ---------- 收集英文侧需要翻译的字符串 ----------
function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[2] ?? match[3] ?? match[4] ?? "") : null;
}

function setAttribute(tag, name, value) {
  return tag.replace(
    new RegExp(`(\\b${name}\\s*=\\s*)("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
    (match, prefix, _whole, dq, sq, bare) => {
      const quoted = dq !== undefined ? `"${value}"` : sq !== undefined ? `'${value}'` : value;
      return `${prefix}${quoted}`;
    },
  );
}

const META_KEYS = new Set([
  "description",
  "og:title",
  "og:description",
  "twitter:title",
  "twitter:description",
  "og:image:alt",
  "twitter:image:alt",
]);

const ATTR_KEYS = ["alt", "aria-label", "placeholder", "title"];

function collectMeta(html) {
  const keys = new Set();
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  if (title && /[A-Za-z]/.test(title)) keys.add(norm(title));

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = (getAttribute(tag, "property") || getAttribute(tag, "name") || "").toLowerCase();
    if (!META_KEYS.has(prop)) continue;
    const content = getAttribute(tag, "content");
    if (content && /[A-Za-z]/.test(content)) keys.add(norm(content));
  }

  for (const tag of html.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    for (const attr of ATTR_KEYS) {
      const value = getAttribute(tag, attr);
      if (value && /[A-Za-z]/.test(value) && norm(value).length > 1) keys.add(norm(value));
    }
  }
  return [...keys];
}

// JSON-LD：只收集可能出现在自然语言字段里的字符串
const JSONLD_SKIP_KEYS = new Set([
  "@context", "@type", "@id", "url", "image", "logo", "sameAs", "telephone", "email",
  "priceCurrency", "availability", "datePublished", "dateModified", "inLanguage",
  "streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry",
  "itemCondition", "gtin", "sku", "mpn", "ratingValue", "reviewCount",
]);

const URL_LIKE = /^(?:https?:|mailto:|tel:|\/|#)/i;

function walkJsonLd(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((item) => walkJsonLd(item, visit));
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (JSONLD_SKIP_KEYS.has(key)) continue;
      if (typeof value === "string") visit(value);
      else walkJsonLd(value, visit);
    }
  }
}

function collectJsonLdStrings(html) {
  const keys = new Set();
  const re = /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      const data = JSON.parse(match[1]);
      walkJsonLd(data, (value) => {
        const text = norm(value);
        if (text.length > 1 && /[A-Za-z]/.test(text) && !URL_LIKE.test(text) && !/\d{4}-\d{2}-\d{2}/.test(text)) {
          keys.add(text);
        }
      });
    } catch {
      /* 不是合法 JSON 就跳过 */
    }
  }
  return [...keys];
}

// ---------- 应用译文到小语种页面 ----------
function lookup(dictionary, raw) {
  if (raw in dictionary) return dictionary[raw];
  // 内链本地化可能已经跑过（href 变成 /de/…），词典键是英文 href，
  // 去掉语言前缀后再匹配一次，保证处理顺序不影响命中率。
  const unlocalized = raw.replace(/(href=(?:"|')?)\/(?:de|fr|es)(?=\/)/g, "$1");
  if (unlocalized in dictionary) return dictionary[unlocalized];
  const plain = norm(plainText(raw));
  if (plain in dictionary) return dictionary[plain];
  return null;
}

function translateJsonLd(html, locale, dictionary) {
  return html.replace(
    /(<script[^>]*type=["']?application\/ld\+json["']?[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (whole, open, body, close) => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return whole;
      }
      const walk = (node) => {
        if (Array.isArray(node)) return node.map(walk);
        if (!node || typeof node !== "object") return node;
        for (const [key, value] of Object.entries(node)) {
          if (key === "inLanguage") {
            node[key] = locale;
          } else if (JSONLD_SKIP_KEYS.has(key)) {
            continue;
          } else if (typeof value === "string") {
            if (URL_LIKE.test(value) || /\d{4}-\d{2}-\d{2}/.test(value)) continue;
            const hit = dictionary[value] ?? dictionary[norm(value)];
            if (hit) node[key] = norm(plainText(hit));
          } else {
            node[key] = walk(value);
          }
        }
        return node;
      };
      return `${open}${JSON.stringify(walk(data))}${close}`;
    },
  );
}

function applyOverrides(html, locale, route) {
  const override = SEO_OVERRIDES?.[locale]?.[route];
  if (!override) return html;
  let out = html;

  if (override.title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(override.title)}</title>`);
  }
  if (override.description) {
    out = out.replace(/<meta\b[^>]*>/gi, (tag) => {
      const prop = (getAttribute(tag, "property") || getAttribute(tag, "name") || "").toLowerCase();
      if (!["description", "og:description", "twitter:description"].includes(prop)) return tag;
      return setAttribute(tag, "content", escapeHtml(override.description));
    });
  }
  if (override.h1Html || override.h1) {
    const h1 = override.h1Html ?? escapeHtml(override.h1);
    out = out.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, (tag) => {
      const open = tag.match(/^<h1\b[^>]*>/i)?.[0] ?? "<h1>";
      return `${open}${h1}</h1>`;
    });
  }
  return out;
}

function translatePage(file, route, locale, dictionary) {
  let html = fs.readFileSync(file, "utf8");
  const blocks = collectBlocks(html);
  const replacements = [];
  let matched = 0;

  for (const block of blocks) {
    const translated = lookup(dictionary, block.inner);
    if (!translated) continue;
    const parts = buildTextReplacements(block, translated);
    if (!parts) continue;
    replacements.push(...parts);
    matched += 1;
  }
  html = applyReplacements(html, replacements);

  // 标题
  html = html.replace(/<title>([\s\S]*?)<\/title>/i, (whole, value) => {
    const hit = dictionary[norm(value)];
    return hit ? `<title>${escapeHtml(normalizeTitle(hit, locale))}</title>` : whole;
  });

  // meta 描述 / OG / Twitter
  html = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const prop = (getAttribute(tag, "property") || getAttribute(tag, "name") || "").toLowerCase();
    if (!META_KEYS.has(prop)) return tag;
    const content = getAttribute(tag, "content");
    if (!content) return tag;
    const hit = dictionary[norm(content)];
    if (!hit) return tag;
    return setAttribute(tag, "content", escapeHtml(norm(plainText(hit))));
  });

  // img alt / aria-label / placeholder / title —— 只处理 <main> 内。
  // 页头页脚已由 chrome-labels 在构建期本地化，且带 data-no-translate；
  // 若继续按词典替换属性，会把 "Yauum home" 之类翻成怪异短语。
  const mainStart = html.indexOf("<main");
  const mainEnd = html.indexOf("</main>");
  if (mainStart !== -1 && mainEnd !== -1) {
    const translateAttrs = (segment) =>
      segment.replace(/<[a-zA-Z][^>]*>/g, (tag) => {
        let out = tag;
        for (const attr of ATTR_KEYS) {
          const value = getAttribute(out, attr);
          if (!value) continue;
          const hit = dictionary[norm(value)];
          if (!hit) continue;
          out = setAttribute(out, attr, escapeHtml(norm(plainText(hit))));
        }
        return out;
      });
    html =
      html.slice(0, mainStart) +
      translateAttrs(html.slice(mainStart, mainEnd)) +
      html.slice(mainEnd);
  }

  html = translateJsonLd(html, locale, dictionary);
  html = applyOverrides(html, locale, route);

  fs.writeFileSync(file, html);
  return { total: blocks.length, matched };
}

// ---------- 主流程 ----------
const routes = CONFIG.localizedPaths;
const english = new Map();
for (const route of routes) {
  const file = sourceFile(route);
  if (!fs.existsSync(file)) {
    console.warn(`skip missing English page: ${route}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const blockKeys = collectBlocks(html).map((block) => block.inner);
  const metaKeys = collectMeta(html);
  const jsonLdKeys = collectJsonLdStrings(html);
  english.set(route, new Set([...blockKeys, ...metaKeys, ...jsonLdKeys]));
}

console.log(`English pages: ${english.size}`);
for (const locale of locales) {
  console.log(`\n=== ${locale} ===`);
  const dictionary = loadDictionary(locale);
  // 词典里的旧译文也过一遍术语表：改了术语后不用重新联网翻译。
  for (const key of Object.keys(dictionary)) {
    dictionary[key] = postprocess(dictionary[key], locale);
  }
  if (repairMode) {
    let removed = 0;
    for (const key of Object.keys(dictionary)) {
      if (dictionary[key] === key && looksUntranslated(key)) {
        delete dictionary[key];
        removed += 1;
      }
    }
    console.log(`  ${locale}: repair removed ${removed} untranslated entries`);
  }
  const keys = new Set();
  for (const set of english.values()) for (const key of set) keys.add(key);
  await translateMissing([...keys], locale, dictionary);

  let blockTotal = 0;
  let blockMatched = 0;
  for (const route of routes) {
    const file = localizedFile(locale, route);
    if (!fs.existsSync(file)) {
      console.warn(`  missing localized page: /${locale}${route}`);
      continue;
    }
    const result = translatePage(file, route, locale, dictionary);
    blockTotal += result.total;
    blockMatched += result.matched;
    const rate = result.total ? ((result.matched / result.total) * 100).toFixed(1) : "0";
    console.log(`  /${locale}${route}: blocks ${result.matched}/${result.total} (${rate}%)`);
  }
  const rate = blockTotal ? ((blockMatched / blockTotal) * 100).toFixed(1) : "0";
  console.log(`  coverage: ${blockMatched}/${blockTotal} blocks (${rate}%)`);
}
