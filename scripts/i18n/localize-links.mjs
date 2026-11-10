#!/usr/bin/env node
// 让小语种页面内部跳转留在当前语言。
//
// 只改写指向「存在小语种版本」的页面的站内链接；文章、博客列表、llm-instructions
// 等纯英文页面保持原链接，避免出现 404 或半翻译页。链接指向的页面由
// src/i18n/config.json 的 localizedPaths 决定，与路由、hreflang 同源。
import fs from "node:fs";
import { CONFIG, localizedFile, replaceAttribute } from "./lib.mjs";

const LOCALIZED = new Set(CONFIG.localizedPaths);
const ANCHOR_RE = /<a\b[^>]*>/gi;
const LOCALE_RE = /^\/(de|fr|es)(?=\/|$)/;

function localizeHref(value, locale) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return value;
  if (value === `/${locale}/` || value.startsWith(`/${locale}/`)) return value;

  const [beforeHash, hash = ""] = value.split(/(?=#)/);
  const [pathname, query = ""] = beforeHash.split(/(?=\?)/);
  const base = pathname.replace(LOCALE_RE, "") || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  if (!LOCALIZED.has(normalized)) return value;

  const prefixed = normalized === "/" ? `/${locale}/` : `/${locale}${normalized}`;
  return `${prefixed}${query}${hash}`;
}

let total = 0;
for (const locale of CONFIG.locales) {
  let changed = 0;
  for (const route of CONFIG.localizedPaths) {
    const file = localizedFile(locale, route);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    // data-no-prefix：语言切换链接必须保持各自语言的地址，不能被当前语言前缀改写
    const next = html.replace(ANCHOR_RE, (tag) => {
      if (/\bdata-no-prefix\b/i.test(tag)) return tag;
      return replaceAttribute(tag, ANCHOR_RE, "href", (value) => {
        const localized = localizeHref(value, locale);
        if (localized !== value) changed += 1;
        return localized;
      });
    });
    if (next !== html) fs.writeFileSync(file, next);
  }
  console.log(`/${locale}/: localized ${changed} internal links`);
  total += changed;
}
console.log(`total: ${total}`);
