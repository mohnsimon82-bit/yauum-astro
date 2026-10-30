// 正文内链体检：只统计 <article class="ar-body"> 到侧栏之间的链接，
// 页头页脚模板链接不计入（模板链接每页一样，看它没有决策价值）。
//
// 每篇文章的内链预算（2026-10-27 定的口径）：
//   /contact-us/   1 条（收尾 CTA；转化另由页尾 V2Inquiry 表单承担）
//   首页 "/"       1 条（品牌锚文本）
//   集合页/产品页  2 条起（与文章主题同类别的产品页，锚文本用关键词）
//   /our-services/ /production/ 合计 1–2 条
//   /blog/         0 条（面包屑已经链了）
//
// 用法：node scripts/check-internal-links.mjs [--strict]
//   默认只报告；--strict 在有违规时以退出码 1 结束（可挂进 CI）。

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const CONTACT = "/contact-us/";
const HOME = "/";
const COLLECTIONS = [
  "/hoodie-manufacturer/",
  "/mens-hoodie-manufacturer/",
  "/t-shirt-manufacturer/",
  "/pants-manufacturer/",
  "/jackets-manufacturer/",
  "/streetwear-manufacturer/",
  "/sportswear-manufacturer/",
];

function articleRoutes() {
  const src = readFileSync("src/lib/articles.ts", "utf8");
  return [...src.matchAll(/route: "([^"]+)"/g)].map((m) => m[1]);
}

function bodyLinks(html) {
  const start = html.indexOf("<article");
  if (start < 0) return [];
  const end = html.indexOf("ar-rail", start);
  const seg = html.slice(start, end > start ? end : undefined);
  return [...seg.matchAll(/href=("[^"]*"|[^ >]+)/g)].map((m) =>
    m[1].replace(/^"|"$/g, ""),
  );
}

const counts = (hrefs, target) =>
  hrefs.filter((h) => h === target || h.startsWith(target + "#")).length;

const rows = [];
for (const route of articleRoutes()) {
  const file = join(DIST, route, "index.html");
  if (!existsSync(file)) continue;
  const links = bodyLinks(readFileSync(file, "utf8"));
  const collection = COLLECTIONS.reduce(
    (sum, c) => sum + counts(links, c),
    0,
  );
  rows.push({
    route,
    total: links.length,
    contact: counts(links, CONTACT),
    home: counts(links, HOME),
    collection,
    blog: counts(links, "/blog/"),
  });
}

rows.sort((a, b) => b.contact - a.contact);

const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad("文章", 56) + pad("正文链", 7) + pad("contact", 9) + pad("首页", 6) + pad("集合页", 7) + "blog",
);
for (const r of rows) {
  console.log(
    pad(r.route.slice(0, 55), 56) +
      pad(r.total, 7) +
      pad(r.contact, 9) +
      pad(r.home, 6) +
      pad(r.collection, 7) +
      r.blog,
  );
}

const bad = rows.filter(
  (r) => r.contact > 1 || r.home < 1 || r.collection < 2 || r.blog > 0,
);
const sums = {
  total: rows.reduce((n, r) => n + r.total, 0),
  contact: rows.reduce((n, r) => n + r.contact, 0),
  collection: rows.reduce((n, r) => n + r.collection, 0),
  home: rows.reduce((n, r) => n + r.home, 0),
};
console.log(
  `\n共 ${rows.length} 篇 / 正文内链 ${sums.total} 条：contact-us ${sums.contact}（${Math.round(
    (sums.contact / sums.total) * 100,
  )}%）、集合页 ${sums.collection}、首页 ${sums.home}`,
);
console.log(`违规 ${bad.length} 篇（contact-us>1 或 首页<1 或 集合页<2 或 正文链到 /blog/）`);

if (process.argv.includes("--strict") && bad.length) process.exit(1);
