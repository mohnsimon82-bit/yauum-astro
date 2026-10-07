import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import compress from "astro-compress";
import mdx from "@astrojs/mdx";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * sitemap 的 lastmod。
 *
 * Google 会把 lastmod 当作「这个页面变了、值得重新抓取」的信号，而 @astrojs/sitemap
 * 默认只输出 <loc>，没有任何时间信息。这里递归收集每个页面依赖的源码文件，
 * 取其中最后一次 git 提交时间作为该页 lastmod。
 *
 * 两个必须注意的点：
 *  1. Cloudflare Pages 构建环境是全新检出，文件 mtime 等于构建时间；用它会让所有 URL
 *     变成同一个时间戳并被 Google 忽略，所以以 git 提交时间为主、mtime 仅作兜底；
 *  2. 只映射页面文件本身不够（改组件也会改动页面输出），必须递归遍历其 import 依赖。
 */

const gitDateCache = new Map();
const gitStateCache = new Map();
const fileSetCache = new Map();

/**
 * 项目根目录。
 * 注意：不能用 new URL(".", import.meta.url).pathname —— 它返回百分号编码路径，
 * 项目路径含中文（男装）时会变成 %E7%94%B7%E8%A3%85 导致 cwd 无效、git 命令全部失败，
 * 进而让所有 lastmod 静默退化成构建机上的文件时间。
 */
const projectRoot = dirname(fileURLToPath(import.meta.url));

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * 取单个源文件的更新时间。
 *
 * 关键点：Cloudflare Pages 构建环境是全新检出，文件 mtime 等于「构建时间」，
 * 用它当 lastmod 会让所有 URL 变成同一个时间戳、并被 Google 忽略。
 * 所以以「最后一次 git 提交时间」为准，只有本地存在未提交改动时才用 mtime。
 */
function sourceDate(file) {
  if (gitDateCache.has(file)) return gitDateCache.get(file);

  let iso = null;
  if (existsSync(file)) {
    const committed = git(["log", "-1", "--format=%cI", "--", file]);
    iso = committed ? new Date(committed).toISOString() : null;

    if (!gitStateCache.has(file)) {
      gitStateCache.set(file, git(["status", "--porcelain", "--", file]) !== "");
    }
    if (gitStateCache.get(file) || !iso) {
      try {
        iso = statSync(file).mtime.toISOString();
      } catch {
        /* 忽略 */
      }
    }
  }

  gitDateCache.set(file, iso);
  return iso;
}

/**
 * 全局骨架文件：它们被所有页面共用，改动会波及全站。
 * 如果把它们算进 lastmod，每次改页头页脚都会让 13 条 URL 变成同一个时间戳，
 * Google 会直接判定 lastmod 不可信并忽略。lastmod 只应反映「页面自身内容」的变化。
 */
const GLOBAL_CHROME = new Set([
  "src/layouts/BaseLayout.astro",
  "src/layouts/EditorialLayout.astro",
  "src/components/SiteHeader.astro",
  "src/components/SiteFooter.astro",
  "src/components/chrome/SiteChromeTop.astro",
  "src/components/chrome/SiteChromeFooter.astro",
  "src/components/InquiryForm.astro",
  "src/components/InquirySection.astro",
  "src/components/SeoMeta.astro",
  "src/components/EmptyState.astro",
  "src/lib/contact-intent.ts",
].map((file) => join(projectRoot, file)));

/** 解析相对 import，补全常见扩展名与目录索引 */
function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.astro`,
    `${base}.ts`,
    `${base}.js`,
    `${base}.mdx`,
    `${base}.md`,
    `${base}.css`,
    join(base, "index.astro"),
    join(base, "index.ts"),
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    } catch {
      /* 忽略 */
    }
  }
  return null;
}

/**
 * 收集一个页面依赖的所有源码文件（递归，限深 4 层）。
 * 只扫 frontmatter 与 script 块，避免把正文里的 "from ..." 当成 import。
 */
function collectSources(entry, depth = 0, seen = new Set()) {
  if (depth > 4 || !entry || seen.has(entry)) return seen;
  let text;
  try {
    text = readFileSync(entry, "utf8");
  } catch {
    return seen;
  }
  seen.add(entry);

  const code = entry.endsWith(".astro")
    ? (() => {
        const fm = text.match(/^---[\s\S]*?---/);
        const scripts = [...text.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map(m => m[0]).join("\n");
        return `${fm ? fm[0] : ""}\n${scripts}`;
      })()
    : text;

  const pattern = /(?:import\s+(?:[^'"]*?\sfrom\s+)?|from\s+|import\()\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(pattern)) {
    const resolved = resolveImport(entry, match[1]);
    // 跳过全局骨架：页头页脚/布局/表单的改动不代表每个页面的内容都更新了
    if (resolved && !GLOBAL_CHROME.has(resolved)) collectSources(resolved, depth + 1, seen);
  }
  return seen;
}

/** 每个 URL 的入口文件；依赖遍历后取其中最新的提交时间作为 lastmod */
function lastmodFor(url) {
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  // 首页、6 个产品页与 /production/ 都有自己的页面文件，各自独立算 lastmod；
  // 其余内容页（about-us / blog / contact-us / our-services / solutions）由动态
  // 路由 [...slug].astro 渲染，共用同一个入口，因此它们的 lastmod 同组。
  // 用「文件是否存在」而不是写死 slug 列表，新增独立页时不用再改这里。
  const own = path === "" ? "src/pages/index.astro" : `src/pages/${path}.astro`;
  const entry = existsSync(join(projectRoot, own)) ? own : "src/pages/[...slug].astro";

  const key = entry;
  if (!fileSetCache.has(key)) fileSetCache.set(key, [...collectSources(entry)]);
  const dates = fileSetCache.get(key).map(sourceDate).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : undefined;
}

export default defineConfig({
  site: "https://yauum.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  // 站内跳转预取：prefetchAll 才会对站内链接全部生效（仅 prefetch: true 时
  // 需要链接自带 data-astro-prefetch 属性，站内并未添加）
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    sitemap({
      // 显式排除 noindex 页面（404 由集成自动排除；/thank-you/ 是表单致谢页，
      // 刻意不收录——SEO 条目里同样带 noindex）。
      filter: (page) => !page.endsWith("/thank-you/"),
      serialize(item) {
        const lastmod = lastmodFor(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    compress(),
    mdx(),
  ],
});
