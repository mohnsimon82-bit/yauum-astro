// 博客文章数据（内容生产系统产出的真实文章，按发布时间倒序）。
//
// 新文章 = 在这里加一条（route 必须与 seo.ts 里的条目一致，缩略图会自动
// 取该条目的 og 图）。/blog/ 列表与 /blog/page/N/ 分页都从这里取数。

export type Article = {
  route: string;
  title: string;
  description: string;
  /** ISO 日期（<time datetime>） */
  date: string;
  /** 展示日期 */
  dateLabel: string;
  /** 卡片标签（编辑分类） */
  tag: string;
};

/** 每页文章数（自定义分页大小改这里即可） */
export const PAGE_SIZE = 10;

export const articles: Article[] = [
  {
    route: "/top-puff-print-hoodie-manufacturers-china/",
    title: "Top 10 Puff Print Hoodie Supplier Types in China: How to Shortlist by Region & Capability",
    description: "Ten puff print hoodie supplier types in China by region and capability, six evaluation criteria, and a five-step vetting sequence.",
    date: "2026-10-09",
    dateLabel: "October 9, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/top-8-zip-up-hoodie-manufacturers-china/",
    title: "Top 8 Zip Up Hoodie Manufacturers in China: A 2026 Buyer's Guide to Choosing the Right Factory",
    description: "Eight zip up hoodie manufacturers in China, the six evaluation dimensions, and the specs that decide whether bulk matches your approved sample.",
    date: "2026-10-09",
    dateLabel: "October 9, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/top-10-embroidered-hoodie-manufacturers-china/",
    title: "Top 10 Embroidered Hoodie Manufacturers in China: A Buyer's Guide to Choosing the Right Factory",
    description: "Ten embroidered hoodie manufacturers in China, the five-point selection criteria, and how to evaluate embroidery quality, MOQ, and lead time.",
    date: "2026-10-07",
    dateLabel: "October 7, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/oversized-hoodie-manufacturer-types-china/",
    title: "10 Types of Oversized Hoodie Manufacturers in China: How to Choose the Right Factory Profile",
    description: "Ten oversized hoodie manufacturer archetypes, the seven-point vetting criteria behind them, and the spec details to lock before contacting a factory.",
    date: "2026-10-07",
    dateLabel: "October 7, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/cotton-hoodie-manufacturer-types-china/",
    title: "10 Types of Cotton Hoodie Manufacturers in China: How to Vet Suppliers (2026)",
    description: "Ten supplier archetypes for 100% cotton hoodies in China, a six-dimension vetting methodology, and the mistakes that decide whether an order runs.",
    date: "2026-10-07",
    dateLabel: "October 7, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/best-400-gsm-hoodie-manufacturers-china/",
    title: "Best 400 GSM Hoodie Manufacturers in China: A Buyer's Guide to Vetting, Sampling & Sourcing",
    description: "A 7-point framework for vetting 400 GSM hoodie manufacturers, the red flags that separate real mills from trading companies, and a scoring method for any shortlist.",
    date: "2026-10-07",
    dateLabel: "October 7, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/fleece-hoodie-manufacturer-types-china/",
    title: "10 Types of Fleece Hoodie Manufacturers in China: How to Pick the Right Factory Profile",
    description: "Ten factory profiles for fleece hoodies in China, the criteria behind the list, and the sourcing mistakes that cost buyers money.",
    date: "2026-10-06",
    dateLabel: "October 6, 2026",
    tag: "Buyer's guide",
  },
  {
    route: "/where-are-t-shirts-manufactured/",
    title: "Where Are T-Shirts Manufactured? A Complete Guide to Global T-Shirt Production",
    description: "The major producing countries, why production concentrates where it does, and how to turn origin into a sourcing decision.",
    date: "2026-10-06",
    dateLabel: "October 6, 2026",
    tag: "Sourcing guide",
  },
];

/** 总页数（至少 1 页） */
export const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));

/** 第 n 页（1 起）的文章切片 */
export function articlesOnPage(page: number): Article[] {
  return articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

/** 分页链接：第 1 页回 /blog/，其余走 /blog/page/N/ */
export function pageHref(page: number): string {
  return page === 1 ? "/blog/" : `/blog/page/${page}/`;
}

// ---------- 文章分类（=文章自带的 tag，筛选栏与分类页共用） ----------

export type Category = { slug: string; label: string; count: number };

/** "Buyer's guide" → "buyers-guide" */
export function categorySlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 全部分类（按文章里首次出现的顺序，带文章数） */
export const categories: Category[] = (() => {
  const map = new Map<string, Category>();
  for (const article of articles) {
    const slug = categorySlug(article.tag);
    const found = map.get(slug);
    if (found) found.count += 1;
    else map.set(slug, { slug, label: article.tag, count: 1 });
  }
  return [...map.values()];
})();

/** 分类链接 */
export function categoryHref(slug: string): string {
  return `/blog/category/${slug}/`;
}

/** 某一分类下的文章（按发布时间倒序，继承 articles 顺序） */
export function articlesInCategory(slug: string): Article[] {
  return articles.filter((article) => categorySlug(article.tag) === slug);
}
