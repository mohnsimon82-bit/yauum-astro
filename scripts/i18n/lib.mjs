// 多语言构建后处理共用工具。
//
// 核心约束：只替换「文本节点」，标签、属性、图片、SVG 一律原样保留。
// node-html-parser 的 node.range 给出节点在原始 HTML 字符串中的精确偏移，
// 因此可以做到「解析定位 → 字符串切片替换」，避免整页重新序列化带来的风险。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DIST = path.join(ROOT, "dist");
export const I18N_DIR = path.join(ROOT, "src", "i18n");

export const CONFIG = JSON.parse(
  fs.readFileSync(path.join(I18N_DIR, "config.json"), "utf8"),
);
export const SEO_OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(I18N_DIR, "seo-overrides.json"), "utf8"),
);

export const SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,li,td,th,summary,figcaption,blockquote,dt,dd,a,button,label,option,time,span,strong,small,b,em,div";

// 可翻译容器：命中这些标签的祖先已经把其内部文本整体翻译过一次，
// 因此后代元素不再单独翻译，避免同一段文字被重复替换。
const CONTAINER_TAGS = new Set([
  "H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "TD", "TH",
  "SUMMARY", "FIGCAPTION", "BLOCKQUOTE", "DT", "DD", "LABEL", "BUTTON",
  "OPTION", "TIME", "A", "SPAN", "STRONG", "SMALL", "B", "EM", "DIV",
]);

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG"]);

export const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const decodeEntities = (value) =>
  String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

export const plainText = (html) => norm(decodeEntities(parse(String(html)).textContent));

/** 元素内部在原始字符串中的精确区间 [start, end)；自闭合/空元素返回 null */
function innerBounds(node, html) {
  const start = node.range?.[0];
  const end = node.range?.[1];
  if (typeof start !== "number" || typeof end !== "number") return null;
  const tag = node.rawTagName;
  if (!tag) return null;

  let quote = null;
  let openEnd = -1;
  for (let i = start + 1; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") {
      openEnd = i + 1;
      break;
    }
  }
  if (openEnd < 0) return null;

  const close = `</${tag}>`;
  if (html.slice(end - close.length, end).toLowerCase() !== close.toLowerCase()) {
    return null; // void element: img / br / input …
  }
  return [openEnd, end - close.length];
}

function parentElement(node) {
  let current = node.parentNode;
  while (current) {
    if (current.nodeType === 1) return current;
    current = current.parentNode;
  }
  return null;
}

function hasSkippedAncestor(node) {
  let current = parentElement(node);
  while (current) {
    const tag = (current.rawTagName || "").toUpperCase();
    if (SKIP_TAGS.has(tag)) return true;
    if (current.getAttribute?.("data-no-translate") !== undefined) return true;
    current = parentElement(current);
  }
  return false;
}

function hasBlockAncestor(node) {
  let current = parentElement(node);
  while (current) {
    const tag = (current.rawTagName || "").toUpperCase();
    if (CONTAINER_TAGS.has(tag)) {
      // div 只有携带直属文本时才算容器；纯布局 div 不拦住内部块
      if (tag !== "DIV") return true;
      const directText = (current.childNodes || []).some(
        (child) => child.nodeType === 3 && String(child.rawText ?? "").trim(),
      );
      if (directText) return true;
    }
    current = parentElement(current);
  }
  return false;
}

/** 收集块内所有可见文本节点（排除 script/style/svg 等） */
function textNodes(node, html) {
  const out = [];
  const walk = (current) => {
    for (const child of current.childNodes || []) {
      if (child.nodeType === 3) {
        const [start, end] = child.range || [];
        if (typeof start !== "number") continue;
        const raw = html.slice(start, end);
        if (raw.trim()) out.push({ start, end, raw });
      } else if (child.nodeType === 1) {
        const tag = (child.rawTagName || "").toUpperCase();
        if (SKIP_TAGS.has(tag)) continue;
        walk(child);
      }
    }
  };
  walk(node);
  return out;
}

/** 收集页面中需要翻译的块：{ inner, start, end, texts } */
export function collectBlocks(html) {
  const root = parse(html, { comment: false });
  const blocks = [];
  const seen = new Set();
  for (const el of root.querySelectorAll(SELECTOR)) {
    const tag = (el.rawTagName || "").toUpperCase();
    if (!tag || SKIP_TAGS.has(tag)) continue;
    if (hasSkippedAncestor(el)) continue;
    if (hasBlockAncestor(el)) continue;
    if (tag === "DIV") {
      const directText = (el.childNodes || []).some(
        (child) => child.nodeType === 3 && String(child.rawText ?? "").trim(),
      );
      if (!directText) continue;
    }

    const bounds = innerBounds(el, html);
    if (!bounds) continue;
    const [start, end] = bounds;
    if (end <= start) continue;
    const inner = html.slice(start, end);
    if (!/[A-Za-z]/.test(plainText(inner))) continue;
    const texts = textNodes(el, html);
    if (!texts.length) continue;
    const key = `${start}:${end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push({ inner, start, end, texts });
  }
  return blocks;
}

/** 解析翻译结果中的文本节点（忽略 Google 可能改写的标签/属性） */
export function fragmentTexts(fragment) {
  if (!fragment) return [];
  const root = parse(`<div>${fragment}</div>`, { comment: false });
  const out = [];
  const walk = (current) => {
    for (const child of current.childNodes || []) {
      if (child.nodeType === 3) {
        const value = child.rawText ?? child.text;
        if (value && String(value).trim()) out.push(String(value));
      } else if (child.nodeType === 1) {
        const tag = (child.rawTagName || "").toUpperCase();
        if (SKIP_TAGS.has(tag)) continue;
        walk(child);
      }
    }
  };
  walk(root);
  return out;
}

/** 把整句译文按原文本节点长度比例切开（兜底：标签数量不一致时） */
function splitTranslation(lengths, text) {
  const clean = norm(text);
  if (!clean) return null;
  if (lengths.length === 1) return [clean];
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const parts = [];
  let cursor = 0;
  let consumed = 0;
  for (let index = 0; index < lengths.length - 1; index += 1) {
    consumed += lengths[index];
    let target = Math.round((clean.length * consumed) / total);
    target = Math.max(cursor + 1, Math.min(clean.length - (lengths.length - index - 1), target));
    if (target > 0 && target < clean.length && !/\s/.test(clean[target - 1] + clean[target])) {
      const forward = clean.indexOf(" ", target);
      const backward = clean.lastIndexOf(" ", target);
      if (forward !== -1 && (backward <= cursor || forward - target <= target - backward)) {
        target = forward;
      } else if (backward > cursor) {
        target = backward;
      }
    }
    parts.push(clean.slice(cursor, target).trim());
    cursor = target;
  }
  parts.push(clean.slice(cursor).trim());
  return parts;
}

/** 法语排版：问号/感叹号前补不换行空格（只作用于纯文本，不碰 HTML 属性与 URL）。 */
export function fixTypography(text, locale) {
  if (locale !== "fr") return text;
  return String(text).replace(/([^\s\u00A0])([?!])/g, "$1\u00A0$2");
}

function withSpacing(original, translated) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  let text = String(translated).trim();
  if (
    !leading &&
    text &&
    /[A-Za-zÀ-ÿ]/.test(text[0]) &&
    /^[,;:.!?"'«»“”—–]/.test(original.trim())
  ) {
    text = ` ${text}`;
  }
  return leading + text + trailing;
}

/** 生成用于替换的 {start,end,text} 列表；失败返回 null */
export function buildTextReplacements(block, translatedFragment, locale = "en") {
  const originalTexts = block.texts;
  const translated = fragmentTexts(translatedFragment);
  if (!translated.length) return null;

  let mapped = null;
  if (translated.length === originalTexts.length) {
    mapped = translated.map((value) => String(value));
  } else {
    mapped = splitTranslation(
      originalTexts.map((node) => node.raw.trim().length),
      translated.join(" "),
    );
  }
  if (!mapped || mapped.length !== originalTexts.length) return null;

  // 保留原文首字母大小写意图：原文以大写开头、译文却以小写开头时补上大写。
  const firstOriginal = originalTexts[0].raw;
  const firstMapped = String(mapped[0] ?? "");
  if (/^\s*[A-ZÀ-Ý]/.test(firstOriginal) && /^\s*[a-zà-ÿ]/.test(firstMapped)) {
    mapped[0] = firstMapped.replace(/([a-zà-ÿ])/, (ch) => ch.toUpperCase());
  }

  return originalTexts.map((node, index) => ({
    start: node.start,
    end: node.end,
    text: withSpacing(node.raw, fixTypography(mapped[index], locale)),
  }));
}

/** 应用不重叠的替换（从后往前） */
export function applyReplacements(html, replacements) {
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  let out = html;
  for (const item of sorted) {
    out = out.slice(0, item.start) + item.text + out.slice(item.end);
  }
  return out;
}

/** 读取/写入词典 */
export function dictionaryPath(locale) {
  return path.join(I18N_DIR, `${locale}-block-dictionary.json`);
}

export function loadDictionary(locale) {
  const file = dictionaryPath(locale);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveDictionary(locale, dictionary) {
  const sorted = {};
  for (const key of Object.keys(dictionary).sort()) sorted[key] = dictionary[key];
  fs.writeFileSync(dictionaryPath(locale), `${JSON.stringify(sorted, null, 1)}\n`);
}

/** 英文页面路径 → dist 文件路径 */
export function sourceFile(route) {
  return route === "/"
    ? path.join(DIST, "index.html")
    : path.join(DIST, route.replace(/^\/|\/$/g, ""), "index.html");
}

export function localizedFile(locale, route) {
  return route === "/"
    ? path.join(DIST, locale, "index.html")
    : path.join(DIST, locale, route.replace(/^\/|\/$/g, ""), "index.html");
}

/** 属性值替换（保留原有引号/裸值写法） */
export function replaceAttribute(html, tagRegex, attr, transform) {
  return html.replace(tagRegex, (tag) => {
    const re = new RegExp(`(\\b${attr}\\s*=\\s*)("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
    const match = tag.match(re);
    if (!match) return tag;
    const raw = match[3] ?? match[4] ?? match[5] ?? "";
    const next = transform(raw);
    if (next == null || next === raw) return tag;
    const quoted = match[3] !== undefined ? `"${next}"` : match[4] !== undefined ? `'${next}'` : next;
    return tag.replace(re, `${match[1]}${quoted}`);
  });
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
