#!/usr/bin/env node
// 给 sitemap 补 hreflang 互指（xhtml:link）。
//
// @astrojs/sitemap 已把 /de/…、/fr/…、/es/… 作为独立 URL 收录，且 urlset
// 自带 xmlns:xhtml 声明；这里只在「可翻译页面」的 <url> 内补 4 个语言版本
// + x-default。英文单语页面（文章等）不加，避免指向不存在的地址。
import fs from "node:fs";
import path from "node:path";
import { CONFIG, DIST } from "./lib.mjs";

const SITEMAP = path.join(DIST, "sitemap-0.xml");
if (!fs.existsSync(SITEMAP)) {
  console.warn("sitemap-0.xml not found, skip hreflang injection");
  process.exit(0);
}

const LOCALIZED = new Set(CONFIG.localizedPaths);
const LOCALES = CONFIG.locales;
const LOCALE_RE = /^\/(de|fr|es)(?=\/|$)/;

let xml = fs.readFileSync(SITEMAP, "utf8");
let touched = 0;

xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, (whole, inner) => {
  const loc = inner.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (!loc) return whole;

  const pathname = new URL(loc).pathname;
  const base = pathname.replace(LOCALE_RE, "") || "/";
  if (!LOCALIZED.has(base)) return whole;

  const origin = new URL(loc).origin;
  const alternate = (locale) => {
    const prefix = locale === "en" ? "" : `/${locale}`;
    const localized = base === "/" ? `${prefix}/` : `${prefix}${base}`;
    return `${origin}${localized}`;
  };
  const links = [
    ["en", alternate("en")],
    ...LOCALES.map((locale) => [locale, alternate(locale)]),
    ["x-default", alternate("en")],
  ]
    .map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`)
    .join("");

  // 去掉上一次运行留下的同类节点，保证幂等
  const cleaned = inner.replace(/<xhtml:link\b[^>]*\/>/g, "");
  touched += 1;
  return `<url>${cleaned}${links}</url>`;
});

fs.writeFileSync(SITEMAP, xml);
console.log(`sitemap: injected hreflang for ${touched} URLs`);
