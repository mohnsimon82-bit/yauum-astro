/**
 * 一次性工具：把 Google Fonts 上的字体下载到本地（public/fonts），
 * 并生成 src/styles/fonts.css（同源 @font-face，保留 unicode-range 子集划分）。
 *
 * 为什么自托管：
 *  - fonts.googleapis.com / fonts.gstatic.com 在中国大陆不可直连 → 品牌字形丢失；
 *  - Google Fonts CDN 在欧盟已被判定存在 GDPR 风险（访客 IP 传给 Google）；
 *  - 少两个跨源请求（DNS/TLS）。
 *
 * 只下载 latin 与 latin-ext 两个子集：英语正文必需 + 欧洲客户常见的变音符号。
 * 用法：node scripts/fetch-fonts.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap';

// 用现代 Chrome UA 获取 woff2 版本（老 UA 会返回 ttf）
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const outDir = path.resolve('public/fonts');
const cssOut = path.resolve('src/styles/fonts.css');

const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** 从 unicode-range 判断子集归属；返回 null 表示不下载该子集 */
function subsetOf(unicodeRange) {
  if (!unicodeRange) return null;
  const r = unicodeRange.replace(/\s+/g, '');
  if (r.includes('U+0000-00FF')) return 'latin';
  if (r.includes('U+0100-024F')) return 'latin-ext';
  return null;
}

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

const blocks = [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
console.log(`Google 返回 ${blocks.length} 个 @font-face 块`);

const faces = [];
for (const block of blocks) {
  const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
  const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
  const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
  const display = block.match(/font-display:\s*([a-z]+)/)?.[1] ?? 'swap';
  const style = block.match(/font-style:\s*([a-z]+)/)?.[1] ?? 'normal';
  if (!family || !weight || !url) continue;
  const subset = subsetOf(unicodeRange);
  if (!subset) continue;
  faces.push({ family, weight, style, url, unicodeRange, display, subset });
}

await mkdir(outDir, { recursive: true });
const downloaded = [];
for (const face of faces) {
  const file = `${slug(face.family)}-${face.weight}-${face.subset}.woff2`;
  const target = path.join(outDir, file);
  const res = await fetch(face.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`下载失败 ${face.url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const magic = buf.subarray(0, 4).toString('ascii');
  if (magic !== 'wOF2') throw new Error(`${file} 不是 woff2（magic=${magic}）`);
  await writeFile(target, buf);
  downloaded.push({ ...face, file, bytes: buf.length });
  console.log(`  ✓ ${file.padEnd(34)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB  ← ${face.family} ${face.weight} (${face.subset})`);
}

const header = `/* 自托管字体（SIL Open Font License 1.1）。
 * 由 scripts/fetch-fonts.mjs 生成，来源：Google Fonts CSS2 API。
 * 只保留 latin 与 latin-ext 子集；字体名与 Google 版本一致，
 * 因此现有 CSS 里的 var(--display)/var(--body)/var(--mono) 无需改动。
 */\n`;
const body = downloaded
  .map(
    (face) => `@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: ${face.display};
  src: url('/fonts/${face.file}') format('woff2');
  unicode-range: ${face.unicodeRange};
}`,
  )
  .join('\n\n');

await writeFile(cssOut, `${header}\n${body}\n`, 'utf8');
console.log(`\n已写入 ${path.relative(process.cwd(), cssOut)}（${downloaded.length} 条 @font-face）`);
console.log(`字体文件总大小：${(downloaded.reduce((s, f) => s + f.bytes, 0) / 1024).toFixed(1)} KB`);
