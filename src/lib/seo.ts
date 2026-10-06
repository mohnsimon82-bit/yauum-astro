// 全站统一的 SEO Head 数据模型。
// 所有页面的 title / description / canonical / OG / Twitter / JSON-LD
// 都从这里取值，两个 layout（EditorialLayout / BaseLayout）只负责渲染，
// 页面组件不允许再各自手写 meta，避免重复或不一致。
//
// 事实边界：以下字段只用已经公开确认的信息——
//   - 公司法律名：页脚 "Dongguan Yauum Apparel Co., Ltd."
//   - 邮箱 mumu@yauum.com、电话/WhatsApp +8615733728976：全站联系方式
//   - 不写地址、认证、产能、MOQ 数值、交期、客户案例、社交账号（未确认）。

export const SITE = {
  origin: "https://yauum.com",
  name: "Yauum",
  legalName: "Dongguan Yauum Apparel Co., Ltd.",
  email: "mumu@yauum.com",
  telephone: "+8615733728976",
  logo: "https://yauum.com/uploads/logo/yauum-site-logo.webp",
} as const;

export type SeoData = {
  /** <title>，英文 30–60 字符，核心词在前，品牌在后 */
  title: string;
  /** meta description，英文 120–160 字符，每页唯一 */
  description: string;
  /** 规范路径（以 / 开头、以 / 结尾），canonical = SITE.origin + path */
  path: string;
  /** 文章页用 article，其余一律 website */
  ogType: "website" | "article";
  /** og:image / twitter:image 的绝对 URL，必须是真实存在的文件 */
  ogImage: string;
  ogImageAlt: string;
  ogImageWidth: number;
  ogImageHeight: number;
  /** 只允许显式配置（当前全站为公开可索引页面，不设置） */
  noindex?: boolean;
  /** 结构化数据，全部在初始 HTML 输出 */
  jsonLd?: Record<string, unknown>[];
};

const abs = (p: string) => `${SITE.origin}${p}`;

// ---------- JSON-LD 构造器 ----------

export const provider = (): Record<string, unknown> => ({
  "@type": "Organization",
  name: SITE.name,
  url: abs("/"),
});

function breadcrumb(items: Array<[name: string, path: string]>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: abs(path),
    })),
  };
}

/** 首页：Organization + WebSite，字段只用已确认信息 */
export function homeJsonLd(): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      legalName: SITE.legalName,
      url: abs("/"),
      logo: SITE.logo,
      email: SITE.email,
      telephone: SITE.telephone,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: abs("/"),
    },
  ];
}

function serviceJsonLd(opts: {
  name: string;
  serviceType: string;
  path: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    serviceType: opts.serviceType,
    provider: provider(),
    url: abs(opts.path),
    description: opts.description,
  };
}

function pageJsonLd(
  type: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage",
  opts: { name: string; path: string; description: string; extra?: Record<string, unknown> },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: opts.name,
    url: abs(opts.path),
    description: opts.description,
    ...opts.extra,
  };
}

/** 文章详情页：Article JSON-LD。作者为团队署名（Organization），不得伪装成个人身份。 */
function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    image: [abs(opts.image)],
    author: { "@type": "Organization", name: opts.author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: abs("/"),
      logo: { "@type": "ImageObject", url: SITE.logo },
    },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(opts.path) },
  };
}

/** FAQPage JSON-LD。问答必须与页面可见 FAQ 逐字一致（内容生产系统的硬规则）。 */
function faqJsonLd(items: Array<[string, string]>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

// ---------- 每页配置 ----------

function productSeo(opts: {
  path: string;
  name: string; // "Hoodie"
  serviceType: string; // "Hoodie manufacturing and product development"
  title: string;
  description: string;
  ogImage: string;
  ogImageAlt: string;
  ogImageWidth: number;
  ogImageHeight: number;
}): SeoData {
  return {
    title: opts.title,
    description: opts.description,
    path: opts.path,
    ogType: "website",
    ogImage: abs(opts.ogImage),
    ogImageAlt: opts.ogImageAlt,
    ogImageWidth: opts.ogImageWidth,
    ogImageHeight: opts.ogImageHeight,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        [`${opts.name} Manufacturer`, opts.path],
      ]),
      serviceJsonLd({
        name: `Custom and Private Label ${opts.name} Manufacturing`,
        serviceType: opts.serviceType,
        path: opts.path,
        description: opts.description,
      }),
    ],
  };
}

export const SEO: Record<string, SeoData> = {
  "/": {
    title: "Custom Clothing Manufacturers | Private Label | Yauum",
    description:
      "Custom menswear and streetwear manufacturing for private label brands: hoodies, T-shirts, jackets, pants, and sportswear, from sample approval to packing.",
    path: "/",
    ogType: "website",
    // 首页 hero 即此图（2400×1600）
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Garment sewing line with operators and workstations",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: homeJsonLd(),
  },

  "/hoodie-manufacturer/": productSeo({
    path: "/hoodie-manufacturer/",
    name: "Hoodie",
    serviceType: "Hoodie manufacturing and product development",
    title: "Custom Hoodie Manufacturer | Private Label | Yauum",
    description:
      "Custom hoodie manufacturer for private label brands. Explore styles, fabrics, GSM, printing, embroidery, labels, sampling and quality control.",
    ogImage: "/uploads/hoodie-manufacturer/hero-blank-pullover.webp",
    ogImageAlt: "Blank pullover hoodie as a private label style reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
  }),

  "/t-shirt-manufacturer/": productSeo({
    path: "/t-shirt-manufacturer/",
    name: "T-Shirt",
    serviceType: "T-shirt manufacturing and product development",
    title: "Custom T-Shirt Manufacturer | Private Label | Yauum",
    description:
      "Custom T-shirt manufacturing for private label brands: styles, fabric weights, printing and embroidery, labels, sample approval, and packing.",
    ogImage: "/uploads/t-shirt-manufacturer/showroom-tshirt-samples.webp",
    ogImageAlt: "T-shirt samples presented in the sample showroom",
    ogImageWidth: 1600,
    ogImageHeight: 1067,
  }),

  "/jackets-manufacturer/": productSeo({
    path: "/jackets-manufacturer/",
    name: "Jacket",
    serviceType: "Jacket manufacturing and product development",
    title: "Custom Jacket Manufacturer | Private Label | Yauum",
    description:
      "Custom jacket development for private label brands: shell, lining, insulation, decoration, sampling, quality checks, and packing requirements.",
    ogImage: "/uploads/products/jackets-manufacturer.webp",
    ogImageAlt: "Jacket product reference",
    ogImageWidth: 844,
    ogImageHeight: 1448,
  }),

  "/pants-manufacturer/": productSeo({
    path: "/pants-manufacturer/",
    name: "Pants",
    serviceType: "Pants manufacturing and product development",
    title: "Custom Pants Manufacturer | Private Label | Yauum",
    description:
      "Custom pants development for private label brands: fit blocks, waist construction, pockets, hardware, branding, sample approval, and checks.",
    ogImage: "/uploads/products/pants-manufacturer.webp",
    ogImageAlt: "Pants product reference",
    ogImageWidth: 844,
    ogImageHeight: 1448,
  }),

  "/sportswear-manufacturer/": productSeo({
    path: "/sportswear-manufacturer/",
    name: "Sportswear",
    serviceType: "Sportswear manufacturing and product development",
    title: "Custom Sportswear Manufacturer | Private Label | Yauum",
    description:
      "Custom sportswear development for private label brands: performance fabrics, fit, construction, branding, sampling, quality checks, and packing.",
    ogImage: "/uploads/products/sportswear-manufacturer.webp",
    ogImageAlt: "Sportswear product reference",
    ogImageWidth: 844,
    ogImageHeight: 1448,
  }),

  "/streetwear-manufacturer/": productSeo({
    path: "/streetwear-manufacturer/",
    name: "Streetwear",
    serviceType: "Streetwear manufacturing and product development",
    title: "Custom Streetwear Manufacturer | Private Label | Yauum",
    description:
      "Build coordinated streetwear programs for private label brands: silhouette, materials, washes and decoration, labels, sampling, and pack-out rules.",
    ogImage: "/uploads/products/streetwear-manufacturer.webp",
    ogImageAlt: "Streetwear product reference",
    ogImageWidth: 844,
    ogImageHeight: 1448,
  }),

  "/our-services/": {
    title: "Custom Apparel Manufacturing Services | Yauum",
    description:
      "Yauum covers product development and sampling, fabrics, printing and decoration, sizing, private label finishing, packaging, and quality inspection.",
    path: "/our-services/",
    ogType: "website",
    // 印花/装饰是服务清单之一，图为本页主题相关的真实产线照
    ogImage: abs("/uploads/factory/factory-printing.webp"),
    ogImageAlt: "Garment printing equipment and operators",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Our Services", "/our-services/"],
      ]),
      serviceJsonLd({
        name: "Custom Apparel Manufacturing Services",
        serviceType: "Apparel manufacturing services",
        path: "/our-services/",
        description:
          "Yauum covers product development and sampling, fabrics, printing and decoration, sizing, private label finishing, packaging, and quality inspection.",
      }),
    ],
  },

  "/production/": {
    title: "Custom Clothing Production Process | Yauum",
    description:
      "A sample-first apparel production workflow: brief review, specification, sample approval, bulk production, then check, pack, and shipment preparation.",
    path: "/production/",
    ogType: "website",
    // 本页"Supplied factory record"板块使用的真实图片
    ogImage: abs("/uploads/factory/factory-pattern.webp"),
    ogImageAlt: "Pattern preparation in the production environment",
    ogImageWidth: 2000,
    ogImageHeight: 1500,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Production", "/production/"],
      ]),
      pageJsonLd("WebPage", {
        name: "Custom Clothing Production Process",
        path: "/production/",
        description:
          "A sample-first apparel production workflow: brief review, specification, sample approval, bulk production, then check, pack, and shipment preparation.",
      }),
    ],
  },

  "/solutions/": {
    title: "Apparel Manufacturing Solutions by Buyer Type | Yauum",
    description:
      "Manufacturing support shaped by how you buy: private label brands, wholesalers, e-commerce sellers, and sourcing teams get a fitting workflow.",
    path: "/solutions/",
    ogType: "website",
    ogImage: abs("/uploads/factory/factory-packout.webp"),
    ogImageAlt: "Finished garments being folded and prepared for packing",
    ogImageWidth: 2400,
    ogImageHeight: 1798,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Solutions", "/solutions/"],
      ]),
      pageJsonLd("WebPage", {
        name: "Apparel Manufacturing Solutions by Buyer Type",
        path: "/solutions/",
        description:
          "Manufacturing support shaped by how you buy: private label brands, wholesalers, e-commerce sellers, and sourcing teams get a fitting workflow.",
      }),
    ],
  },

  "/about-us/": {
    title: "About Yauum | Custom Clothing Manufacturer",
    description:
      "Yauum is a B2B menswear and streetwear manufacturing partner. See what the site states responsibly and which company facts await verification.",
    path: "/about-us/",
    ogType: "website",
    // 本页"Supplied factory record"板块使用的真实图片
    ogImage: abs("/uploads/factory/factory-showroom.webp"),
    ogImageAlt: "Garment sample showroom with apparel on display",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["About Us", "/about-us/"],
      ]),
      pageJsonLd("AboutPage", {
        name: "About Yauum",
        path: "/about-us/",
        description:
          "Yauum is a B2B menswear and streetwear manufacturing partner. See what the site states responsibly and which company facts await verification.",
      }),
    ],
  },

  "/contact-us/": {
    title: "Contact Yauum | Custom Clothing Manufacturing",
    description:
      "Send a product brief with fabric, fit, branding, packing, and destination details through the inquiry page, WhatsApp, or email for a useful review.",
    path: "/contact-us/",
    ogType: "website",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Garment sewing line with operators and workstations",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Contact Us", "/contact-us/"],
      ]),
      pageJsonLd("ContactPage", {
        name: "Contact Yauum",
        path: "/contact-us/",
        description:
          "Send a product brief with fabric, fit, branding, packing, and destination details through the inquiry page, WhatsApp, or email for a useful review.",
        extra: {
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "sales",
              email: SITE.email,
              telephone: SITE.telephone,
            },
          ],
        },
      }),
    ],
  },

  "/blog/": {
    title: "Apparel Manufacturing Insights | Yauum Blog",
    description:
      "Practical B2B guidance for buyers developing custom apparel: product development, fabric and workmanship, decoration, private label, and packing.",
    path: "/blog/",
    ogType: "website", // 列表页保持 website；文章详情页（ogType: article）各自独立条目
    ogImage: abs("/uploads/factory/sample-showroom.webp"),
    ogImageAlt: "Garment samples in the showroom",
    ogImageWidth: 1920,
    ogImageHeight: 1280,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
      ]),
      pageJsonLd("CollectionPage", {
        name: "Apparel Manufacturing Insights",
        path: "/blog/",
        description:
          "Practical B2B guidance for buyers developing custom apparel: product development, fabric and workmanship, decoration, private label, and packing.",
      }),
    ],
  },

  // 文章详情页（内容生产系统流水线产出，逐篇新增条目）。
  // FAQ 问答与页面可见 FAQ 逐字一致，改正文 FAQ 时必须同步改这里。
  "/where-are-t-shirts-manufactured/": {
    title: "Where Are T-Shirts Manufactured? Global Guide | YAUUM",
    description:
      "Discover where T-shirts are manufactured worldwide, how origin affects quality & cost, and how to choose the right factory. Get a custom quote today.",
    path: "/where-are-t-shirts-manufactured/",
    ogType: "article",
    ogImage: abs("/uploads/t-shirt-manufacturer/hero-tshirt-private-label.webp"),
    ogImageAlt: "Finished private label T-shirt shown as a full-garment product reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Where Are T-Shirts Manufactured?", "/where-are-t-shirts-manufactured/"],
      ]),
      articleJsonLd({
        headline:
          "Where Are T-Shirts Manufactured? A Complete Guide to Global T-Shirt Production",
        description:
          "Discover where T-shirts are manufactured worldwide, how origin affects quality & cost, and how to choose the right factory.",
        path: "/where-are-t-shirts-manufactured/",
        image: "/uploads/t-shirt-manufacturer/hero-tshirt-private-label.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-06",
        dateModified: "2026-10-06",
      }),
      faqJsonLd([
        [
          "Where are most T-shirts manufactured?",
          "Most T-shirts are manufactured in Asia, led by China, Bangladesh, Vietnam, and India. China handles the widest range of builds, Bangladesh and Vietnam dominate high-volume cotton knits, and India is strong in organic and specialty cotton. Turkey and Portugal serve European demand, while the US and Mexico supply the Americas.",
        ],
        [
          "Are T-shirts still made in China?",
          "Yes. China remains the largest apparel exporter by value and the most vertically integrated T-shirt manufacturing country. It is particularly strong for complex decoration, specialty fabrics, and premium builds. For plain cotton basics at very high volume, other regions may offer lower unit costs.",
        ],
        [
          "What country makes the best quality T-shirts?",
          "Quality depends on the factory, not the country. China, Vietnam, and Portugal have mature export sectors with standardized QC, but strong and weak factories exist everywhere. The better question is whether a specific factory can meet your fabric, construction, and decoration spec consistently.",
        ],
        [
          "Why are so many T-shirts made in Bangladesh?",
          "Bangladesh built a large cotton knit industry around competitive labor and export scale. It is one of the world's largest apparel exporters, making it a natural fit for high-volume basic tees. The trade-off is lower flexibility for small runs and complex decoration.",
        ],
        [
          "Can I get T-shirts made in the USA?",
          "Yes, though US production typically suits smaller runs and premium or \"Made in USA\" positioning. Unit costs are higher than Asia, but lead times are shorter and domestic labeling can support higher retail pricing. Mexico and Central America offer a middle option for US-bound programs.",
        ],
        [
          "How do I choose the right country to manufacture my T-shirts?",
          "Start with your order profile. High-volume basics point to Bangladesh or Vietnam. Technical builds and complex decoration favor China. Fast replenishment for Europe favors Turkey or Portugal. Premium small batches suit Portugal or India. Then verify the specific factory, since capability varies more within a country than between countries.",
        ],
        [
          "What's the difference between a T-shirt factory and a trading company?",
          "A factory controls its own production lines, giving you direct visibility into QC and capacity. A trading company sources from multiple factories, which can broaden product range but adds a layer between you and production. Recurring private-label programs usually benefit from a direct factory relationship.",
        ],
        [
          "How long does it take to manufacture custom T-shirts?",
          "For standard cotton tees, production commonly runs 30–45 days after sample approval, plus 20–35 days for sea freight from Asia. Near-shore production in Turkey, Portugal, or Mexico can cut total lead time to 3–5 weeks. Timelines vary by fabric, decoration, season, and order size, so confirm current schedules with your supplier.",
        ],
      ]),
    ],
  },

  // 404 随 404 状态返回，不参与 sitemap；无 OG/JSON-LD 必要
  "/404/": {
    title: "Page Not Found | Yauum",
    description: "The requested Yauum page could not be found.",
    path: "/404/",
    ogType: "website",
    noindex: true,
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Garment sewing line with operators and workstations",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
  },
};

export function getSeo(path: string): SeoData {
  const data = SEO[path];
  if (!data) throw new Error(`SEO entry missing for path: ${path}`);
  return data;
}

export const canonicalUrl = (data: SeoData) => abs(data.path);
