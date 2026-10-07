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
