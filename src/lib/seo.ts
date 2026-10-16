// 全站统一的 SEO Head 数据模型。
// 所有页面的 title / description / canonical / OG / Twitter / JSON-LD
// 都从这里取值，两个 layout（EditorialLayout / BaseLayout）只负责渲染，
// 页面组件不允许再各自手写 meta，避免重复或不一致。
//
// 标题格式（2026-10-09 起为正式约定，scripts/check-titles.mjs 在 postbuild 门禁校验）：
//   %title% | Yauum —— 分隔符只有一个竖线、且只出现在品牌前，结尾固定 " | Yauum"；
//   需要修饰词时用冒号分隔（如 "Custom Hoodie Manufacturer: Private Label | Yauum"）。
//   新增页面、上传文章（含流水线 TDK 自带 Guide/年份后缀的标题）都必须按此格式收尾。
//
// 事实边界：以下字段只用已经公开确认的信息——
//   - 公司法律名：页脚 "Dongguan Yauum Apparel Co., Ltd."
//   - 公司地址：东莞市南城街道中盛商务大厦808室（用户 2026-10-09 确认；页脚与结构化数据同步展示）
//   - 出口市场：美国、欧洲、澳大利亚、中东（用户 2026-10-09 确认；页脚与结构化数据同步展示）
//   - 邮箱 mumu@yauum.com、电话/WhatsApp +8619536852213：全站联系方式
//   - 不写认证、产能、MOQ 数值、交期、客户案例、社媒账号（未确认/未搭建）。

export const SITE = {
  origin: "https://yauum.com",
  name: "Yauum",
  /** 搜索结果里显示的站点名称（Google「站点名称」取自首页 WebSite 结构化数据与 og:site_name） */
  siteName: "Yauum Garment",
  legalName: "Dongguan Yauum Apparel Co., Ltd.",
  email: "mumu@yauum.com",
  telephone: "+8619536852213",
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

// 全站共享的实体 @id：所有页面引用同一组 id，Google 以知识图谱方式
// 把全站合并为同一个组织/网站实体（Organization 完整节点由首页声明，
// 其余页面自动携带同 @id 的节点副本，数据保持一致）。
export const ORGANIZATION_ID = abs("/#organization");

/** 已确认的出口市场（与页脚文案同步） */
const AREA_SERVED = ["United States", "Europe", "Australia", "Middle East"];
export const WEBSITE_ID = abs("/#website");

/** 组织实体。字段只用已确认信息（法定名/邮箱/电话均已公开于页脚与联系页）。 */
export function organizationNode(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: abs("/"),
    logo: { "@type": "ImageObject", url: SITE.logo },
    email: SITE.email,
    telephone: SITE.telephone,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: SITE.email,
        telephone: SITE.telephone,
      },
    ],
    description:
      "B2B menswear and streetwear manufacturer for private label brands: hoodies, T-shirts, jackets, pants, sportswear, and streetwear.",
    areaServed: AREA_SERVED,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Room 808, Zhongsheng Business Building, Nancheng Subdistrict",
      addressLocality: "Dongguan",
      addressRegion: "Guangdong",
      postalCode: "523000",
      addressCountry: "CN",
    },
  };
}

export const provider = (): Record<string, unknown> => ({
  "@id": ORGANIZATION_ID,
});

export function breadcrumb(items: Array<[name: string, path: string]>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": abs(items[items.length - 1][1]) + "#breadcrumb",
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
    organizationNode(),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE.siteName,
      alternateName: SITE.name,
      url: abs("/"),
      inLanguage: "en",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ];
}

function serviceJsonLd(opts: {
  name: string;
  serviceType: string;
  path: string;
  description: string;
  image: string;
  /** 该服务产出的产品实体 @id（产品页指向同页 Product 节点） */
  produces?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": abs(opts.path) + "#service",
    name: opts.name,
    serviceType: opts.serviceType,
    provider: provider(),
    url: abs(opts.path),
    description: opts.description,
    image: abs(opts.image),
    inLanguage: "en",
    audience: {
      "@type": "BusinessAudience",
      audienceType: "B2B apparel brands, private label brands and sourcing teams",
    },
    areaServed: AREA_SERVED,
    ...(opts.produces ? { produces: { "@id": opts.produces } } : {}),
    isPartOf: { "@id": WEBSITE_ID },
  };
}

/** 产品页：Product JSON-LD（产品实体 + 价格区间）。
 * 价格用 AggregateOffer（lowPrice/highPrice）：用户 2026-10-09 确认区间 US$10–15/件，
 * 六个产品页统一。实测（RRT 2026-10-09）：价格写文字如 "Quote on request" 会报
 * Invalid price format；带数字的 AggregateOffer 判定为 1 valid item，且不连带触发
 * Merchant listings 无效项。硬规则：offers 的价格必须与页面正文可见文案一致——各产品页
 * 报价/MOQ 区块已写入同一区间句（"typically quoted at US$10–15 per piece"），
 * 改价时两处必须同步改。起订量：用户 2026-10-09 确认最低 100 件/款，offers.
 * eligibleQuantity.minValue = 100（实测不影响有效判定），页面正文同步写
 * "Standard orders start at 100 pieces."——改 MOQ 时同样两处同步。
 * 与同页 Service 通过 produces 互链。 */
function productJsonLd(opts: {
  name: string;
  category: string;
  path: string;
  description: string;
  image: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${abs(opts.path)}#product`,
    name: `Custom and Private Label ${opts.name}`,
    description: opts.description,
    image: [abs(opts.image)],
    category: opts.category,
    url: abs(opts.path),
    manufacturer: { "@id": ORGANIZATION_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: 10,
      highPrice: 15,
      url: abs(opts.path),
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: 100,
        unitText: "pieces",
      },
    },
    isPartOf: { "@id": WEBSITE_ID },
  };
}

function pageJsonLd(
  type: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage",
  opts: { name: string; path: string; description: string; extra?: Record<string, unknown> },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": abs(opts.path) + "#webpage",
    name: opts.name,
    url: abs(opts.path),
    description: opts.description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
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
    "@id": abs(opts.path) + "#article",
    headline: opts.headline,
    description: opts.description,
    image: [abs(opts.image)],
    author: { "@type": "Organization", name: opts.author, url: abs("/about-us/") },
    publisher: { "@id": ORGANIZATION_ID },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
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
  category: string; // "Hoodies"（Product.category）
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
        image: opts.ogImage,
        produces: `${abs(opts.path)}#product`,
      }),
      productJsonLd({
        name: opts.name,
        category: opts.category,
        path: opts.path,
        description: opts.description,
        image: opts.ogImage,
      }),
    ],
  };
}

const RAW_SEO: Record<string, SeoData> = {
  "/": {
    title: "Custom Clothing Manufacturers: Private Label | Yauum",
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
    category: "Hoodies",
    serviceType: "Hoodie manufacturing and product development",
    title: "Custom Hoodie Manufacturer: Private Label | Yauum",
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
    category: "T-shirts",
    serviceType: "T-shirt manufacturing and product development",
    title: "Custom T-Shirt Manufacturer: Private Label | Yauum",
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
    category: "Jackets",
    serviceType: "Jacket manufacturing and product development",
    title: "Custom Jacket Manufacturer: Private Label | Yauum",
    description:
      "Custom jacket development for private label brands: shell, lining, insulation, decoration, sampling, quality checks, and packing requirements.",
    ogImage: "/uploads/jackets-manufacturer/hero-jackets-private-label.webp",
    ogImageAlt: "Private label jacket produced as a finished-garment reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
  }),

  "/pants-manufacturer/": productSeo({
    path: "/pants-manufacturer/",
    name: "Pants",
    category: "Pants",
    serviceType: "Pants manufacturing and product development",
    title: "Custom Pants Manufacturer: Private Label | Yauum",
    description:
      "Custom pants development for private label brands: fit blocks, waist construction, pockets, hardware, branding, sample approval, and checks.",
    ogImage: "/uploads/pants-manufacturer/hero-pants-private-label.webp",
    ogImageAlt: "Private label pants produced as a finished-garment reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
  }),

  "/sportswear-manufacturer/": productSeo({
    path: "/sportswear-manufacturer/",
    name: "Sportswear",
    category: "Sportswear",
    serviceType: "Sportswear manufacturing and product development",
    title: "Custom Sportswear Manufacturer: Private Label | Yauum",
    description:
      "Custom sportswear development for private label brands: performance fabrics, fit, construction, branding, sampling, quality checks, and packing.",
    ogImage: "/uploads/sportswear-manufacturer/hero-sportswear-private-label.webp",
    ogImageAlt: "Private label sportswear range produced as a finished-garment reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
  }),

  "/streetwear-manufacturer/": productSeo({
    path: "/streetwear-manufacturer/",
    name: "Streetwear",
    category: "Streetwear",
    serviceType: "Streetwear manufacturing and product development",
    title: "Custom Streetwear Manufacturer: Private Label | Yauum",
    description:
      "Build coordinated streetwear programs for private label brands: silhouette, materials, washes and decoration, labels, sampling, and pack-out rules.",
    ogImage: "/uploads/streetwear-manufacturer/hero-streetwear-private-label.webp",
    ogImageAlt: "Private label streetwear range produced as a finished-garment reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
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
    title: "About Us: Custom Clothing Manufacturer | Yauum",
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
    title: "Contact Us: Custom Clothing Manufacturing | Yauum",
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
    title: "Apparel Manufacturing Insights | Yauum",
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
    title: "Where Are T-Shirts Manufactured? Global Guide | Yauum",
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
        datePublished: "2026-10-06T00:00:00+08:00",
        dateModified: "2026-10-06T00:00:00+08:00",
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

  // 文章详情页 · 第二篇（2026-10-06）。slug 取自终稿 TDK（/fleece-hoodie-manufacturer-types-china/）。
  // 审核报告 84 分：红线通过、FAQ 逐字一致；P0-A（年份矛盾）已按报告修正，P0-B（减词）未执行。
  // Meta description 相对 TDK 删去 "Download our catalog."（站内无目录资源，对应 CTA 已替换）。
  "/fleece-hoodie-manufacturer-types-china/": {
    title: "10 Types of Fleece Hoodie Manufacturers in China | Yauum",
    description:
      "Compare 10 factory profiles for fleece hoodies in China. Learn how to evaluate suppliers, avoid sourcing mistakes & get a quote.",
    path: "/fleece-hoodie-manufacturer-types-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/hero-blank-pullover.webp"),
    ogImageAlt: "Blank pullover hoodie as a private label style reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["10 Types of Fleece Hoodie Manufacturers in China", "/fleece-hoodie-manufacturer-types-china/"],
      ]),
      articleJsonLd({
        headline:
          "10 Types of Fleece Hoodie Manufacturers in China: How to Pick the Right Factory Profile",
        description:
          "Compare 10 factory profiles for fleece hoodies in China. Learn how to evaluate suppliers, avoid sourcing mistakes & get a quote.",
        path: "/fleece-hoodie-manufacturer-types-china/",
        image: "/uploads/hoodie-manufacturer/hero-blank-pullover.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-06T00:00:00+08:00",
        dateModified: "2026-10-06T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom fleece hoodies from China?",
          "Most Chinese fleece hoodie manufacturers set MOQ between 300 and 500 pieces per colorway for custom orders, with lower minimums available from small-batch studios at a higher unit cost. MOQ is usually quoted per color, not per style, so a three-color hoodie may carry a three-color minimum. Always confirm whether the sampling fee is credited against the bulk order.",
        ],
        [
          "How long does fleece hoodie manufacturing and shipping take?",
          "Typical timelines run 7 to 15 days for sampling, 30 to 45 days for bulk production after sample approval, and 25 to 35 days for sea freight to major ports. Air freight cuts shipping to roughly 5 to 10 days at a much higher cost. Peak season and fabric availability stretch these windows, so get your dates written into the order confirmation.",
        ],
        [
          "What GSM fleece is best for hoodies?",
          "Most fleece hoodies fall between 280 and 400 GSM. Lightweight fleece around 280 to 320 GSM suits spring and layering pieces; 350 to 400 GSM delivers the heavyweight hand-feel associated with premium streetwear. Above 400 GSM, shrinkage control and sewing difficulty both increase, so confirm the factory has run production at that weight before.",
        ],
        [
          "What certifications should a fleece hoodie manufacturer have?",
          "The relevant certifications depend on your market. Common frameworks cover social compliance audits, quality management systems, and chemical safety standards for textile products. Rather than accepting a list of logos, request the specific report and confirm the certificate number with the issuing body. Match the certifications to the destination market where you actually sell.",
        ],
        [
          "How much does it cost to manufacture a fleece hoodie in China?",
          "FOB pricing spans a wide range driven by fabric weight, embellishment, and order quantity. A 280 GSM solid-color basic sits at the low end; a 400 GSM garment-dyed hoodie with four-color print, custom trims, and special packaging sits at the top, often at several times the price of the basic. Because fabric, print method, and volume all move the number, ask for a quotation against your actual tech pack.",
        ],
        [
          "How do I verify a factory before placing an order?",
          "Request the audit report and confirm its certificate number independently, ask for references or past production examples in your category, order a sample, and test communication responsiveness with a technical question before you commit. A factory that answers slowly or vaguely during the inquiry stage will behave the same way when a production problem appears.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第三篇（2026-10-07）。slug 取自终稿 TDK（/best-400-gsm-hoodie-manufacturers-china/）。
  // 审核报告 92 分：红线通过、FAQ 逐字一致、达标可发布；导出文件名的"❌不完整"前缀系 FAQ 渲染格式
  // 触发的误报（详见页面文件头注释）。站内没有 Supplier Scorecard 资源，相关承诺按发布规则替换。
  "/best-400-gsm-hoodie-manufacturers-china/": {
    title: "Best 400 GSM Hoodie Manufacturers in China | Yauum",
    description:
      "Compare the best 400 GSM hoodie manufacturers in China. Learn how to verify fabric weight, vet suppliers & get a quote.",
    path: "/best-400-gsm-hoodie-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/style-heavyweight.webp"),
    ogImageAlt: "Heavyweight hoodie on a model",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Best 400 GSM Hoodie Manufacturers in China", "/best-400-gsm-hoodie-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Best 400 GSM Hoodie Manufacturers in China: A Buyer's Guide to Vetting, Sampling & Sourcing",
        description:
          "Compare the best 400 GSM hoodie manufacturers in China. Learn how to verify fabric weight, vet suppliers & get a quote.",
        path: "/best-400-gsm-hoodie-manufacturers-china/",
        image: "/uploads/hoodie-manufacturer/style-heavyweight.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-07T00:00:00+08:00",
        dateModified: "2026-10-07T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom 400 gsm hoodies from China?",
          "For custom 400 gsm hoodies with your own labels and trims, MOQ commonly falls in the 300–500 pieces per color range. Custom-dyed fleece pushes MOQ higher than stock colors. Confirm how the minimum is counted per color before you lock your colorway range.",
        ],
        [
          "How long does sampling take for a 400 gsm hoodie?",
          "Sampling for a custom 400 gsm hoodie typically takes one to three weeks, depending on fabric availability and whether custom dyeing or decoration is involved. Stock fabric and simple decoration sit at the fast end; custom dye lots and complex embroidery sit at the slow end.",
        ],
        [
          "How can I verify that a manufacturer's hoodie is truly 400 gsm?",
          "Cut a precise 10 cm × 10 cm square from a flat area, weigh it on a scale accurate to 0.01 g, and multiply by 100. A 400 gsm swatch weighs about 4.0 g. Confirm with a third-party lab test report, and re-test after washing to check for shrinkage-related weight loss.",
        ],
        [
          "What's the typical lead time for bulk 400 gsm hoodie orders?",
          "Bulk production for 400 gsm hoodies typically runs 30–45 days after sample approval, plus 25–35 days for sea freight to most major markets. Add time for custom dyeing, complex decoration, or peak-season capacity constraints.",
        ],
        [
          "Which certifications should a 400 gsm hoodie manufacturer have?",
          "Look for current social compliance, quality management, and environmental certifications relevant to apparel manufacturing. Verify certificate numbers with the issuing body, and confirm the certificate scope covers the actual production site.",
        ],
        [
          "Can I get a custom 400 gsm hoodie made with my own design and labels?",
          "Yes. Custom 400 gsm hoodie manufacturing covers your own design, labels, hangtags, and packaging. Provide a tech pack or reference sample, and the factory produces a pre-production sample for your approval before bulk.",
        ],
        [
          "What's the difference between 400 gsm cotton and 400 gsm cotton-poly blend hoodies?",
          "Pure cotton 400 gsm fleece feels softer and breathes better but shrinks more and costs more. Cotton-poly blends hold shape and color better and resist shrinking, but pill differently and feel slightly less premium. Choose based on your target hand feel and care instructions.",
        ],
        [
          "How do I compare quotes from multiple 400 gsm hoodie manufacturers?",
          "Fix your spec sheet first — fabric composition, weight tolerance, trims, decoration, and packaging — then request quotes against that identical spec. Rank candidates on total landed cost and verified capability, and treat headline FOB price as the weakest signal in the set.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第四篇（2026-10-07）。slug 取自终稿 TDK（/cotton-hoodie-manufacturer-types-china/）。
  // 审核报告 84 分（未达标需人工复核，用户确认发布）。两类改写已获用户确认：年份 (2025)→(2026)；
  // sourcing 代理式表述最小改写为厂商口径（详见页面文件头注释）。meta description 尾句同步改写。
  "/cotton-hoodie-manufacturer-types-china/": {
    title: "10 Cotton Hoodie Manufacturer Types in China | Yauum",
    description:
      "Compare 10 types of cotton hoodie manufacturers in China by MOQ, certifications & lead time. Request a sample or a quote from YAUUM.",
    path: "/cotton-hoodie-manufacturer-types-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/fabric-cotton.webp"),
    ogImageAlt: "Cotton fabric arranged as a visual material reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["10 Types of Cotton Hoodie Manufacturers in China", "/cotton-hoodie-manufacturer-types-china/"],
      ]),
      articleJsonLd({
        headline:
          "10 Types of Cotton Hoodie Manufacturers in China: How to Vet Suppliers (2026)",
        description:
          "Compare 10 types of cotton hoodie manufacturers in China by MOQ, certifications & lead time. Request a sample or a quote from YAUUM.",
        path: "/cotton-hoodie-manufacturer-types-china/",
        image: "/uploads/hoodie-manufacturer/fabric-cotton.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-07T00:00:00+08:00",
        dateModified: "2026-10-07T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the typical MOQ for 100% cotton hoodies from Chinese manufacturers?",
          "MOQ varies widely by factory type. Small-batch specialists accept 50–150 pcs per color, mid-tier factories typically require 300–500 pcs per color, and large-volume exporters may set MOQ at 1,000–3,000 pcs per style. Always confirm whether the MOQ applies per style, per color, or per design.",
        ],
        [
          "How much does it cost to manufacture a custom cotton hoodie in China?",
          "For a 100% cotton fleece hoodie in the 300–400 GSM range, FOB pricing commonly falls in the $8–18 per unit band for orders of 500–3,000 pcs, depending on fabric weight, decoration, and construction. These are typical industry ranges, so request a live quote for your specific spec.",
        ],
        [
          "How long does production and shipping take for a hoodie order?",
          "Production typically runs 25–50 days depending on factory and order complexity. Sea freight to the US or EU adds roughly 25–35 days. Plan for 2–3 months from PO to delivery, and add buffer during peak season.",
        ],
        [
          "How can I verify if a Chinese hoodie factory is legitimate?",
          "Ask for a live video walkthrough of the production floor, verify certification numbers on the issuing body's database, request references or past samples, and arrange a third-party inspection before bulk production. A supplier that resists any of these steps warrants caution.",
        ],
        [
          "What GSM is best for a heavyweight cotton hoodie?",
          "Heavyweight hoodies generally fall in the 380–500 GSM range. For everyday premium wear, 400 GSM is a common target. Confirm actual fabric weight by weighing a pre-production sample, since \"GSM\" is frequently overstated.",
        ],
        [
          "Do Chinese hoodie manufacturers offer organic or GOTS-certified cotton?",
          "Yes. A number of factories specialize in GOTS-certified organic cotton hoodies, typically with MOQ of 500–1,000 pcs per color. Always verify that the GOTS transaction certificate specifically covers your order, not just the facility.",
        ],
        [
          "Can I get a sample before placing a bulk order?",
          "Yes, and you should. Most factories provide pre-production samples in 5–20 days for a sample fee, often credited against the bulk order. Never proceed to bulk production without an approved physical sample.",
        ],
        [
          "What's the difference between a trading company and a direct hoodie factory?",
          "A direct factory owns production equipment and controls quality on its own floor. A trading company coordinates production, often across multiple factories. Trading companies can add value in coordination and QC, but they typically add margin and reduce your visibility into production. Ask direct questions about sewing lines and floor capacity to tell them apart.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第五篇（2026-10-07）。slug 取自终稿 TDK（/oversized-hoodie-manufacturer-types-china/）。
  // 审核报告 83 分（未达标需人工复核，用户确认发布）。Title 年份按报告要求 (2025)→(2026)；
  // 两处 Lead Magnet 下载（vetting checklist / comparison sheet）站内不存在，按发布规则替换。
  "/oversized-hoodie-manufacturer-types-china/": {
    title: "10 Types of Oversized Hoodie Manufacturers in China | Yauum",
    description:
      "Compare 10 oversized hoodie manufacturer profiles in China. Vetting criteria, MOQ, GSM specs, sampling tips & how to request a custom quote.",
    path: "/oversized-hoodie-manufacturer-types-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/style-oversized.webp"),
    ogImageAlt: "Oversized drop-shoulder hoodie on a model",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["10 Types of Oversized Hoodie Manufacturers in China", "/oversized-hoodie-manufacturer-types-china/"],
      ]),
      articleJsonLd({
        headline:
          "10 Types of Oversized Hoodie Manufacturers in China: How to Choose the Right Factory Profile",
        description:
          "Compare 10 oversized hoodie manufacturer profiles in China. Vetting criteria, MOQ, GSM specs, sampling tips & how to request a custom quote.",
        path: "/oversized-hoodie-manufacturer-types-china/",
        image: "/uploads/hoodie-manufacturer/style-oversized.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-07T00:00:00+08:00",
        dateModified: "2026-10-07T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom oversized hoodies from China?",
          "MOQ depends on the factory tier and your customization level. Flexible workshops and ODM studios commonly accept 100–300 pcs per style per color, while large exporters often require 500 pcs or more per color. Adding custom fabric, garment dye, or complex decoration usually raises the minimum. Confirm MOQ per style and per color, not as a single order figure.",
        ],
        [
          "How much does it cost to manufacture an oversized hoodie in China?",
          "FOB pricing for a custom oversized hoodie commonly falls in the $8–22 per piece range, driven by fabric GSM, decoration complexity, order quantity, and finishing. A basic 380 GSM fleece pullover with one-color print sits at the lower end; garment-dyed or heavily embroidered pieces sit higher. Use these ranges for planning rather than as a quote.",
        ],
        [
          "Can Chinese factories produce true oversized / drop-shoulder fits?",
          "Yes, but capability varies sharply. Factories with existing oversized pattern blocks produce accurate drop-shoulder geometry on the first or second sample. Factories that grade a regular-fit block outward often deliver a garment that is wider but not correctly proportioned. Always request a physical fit sample and measure the drop-shoulder distance against your spec.",
        ],
        [
          "How long does sampling and production take?",
          "Sampling commonly runs 7–15 working days per stage, covering lab dip, fit sample, and pre-production sample. Bulk production typically takes 25–45 days after sample approval, with peak season adding time. Ocean freight adds roughly 25–35 days depending on destination.",
        ],
        [
          "What certifications should I look for in a hoodie manufacturer?",
          "The relevant set depends on your market and sales channel. Social compliance certifications are frequently required by large retailers, and quality management certifications support consistency claims. For washed or printed goods, request colorfastness and decoration-durability test reports. Always verify the certificate scope and expiry date rather than accepting a logo on a website.",
        ],
        [
          "Can I get custom labels, tags, and packaging (private label)?",
          "Yes. Private label is standard across most factories in this tier. Typical scope includes woven or printed main labels, care labels, hang tags, and polybag or box packaging. Confirm artwork formats, minimum quantities for custom tags, and whether labeling is done in-house or outsourced, since outsourcing adds lead time.",
        ],
        [
          "How do I verify a factory is legitimate before ordering?",
          "Ask for a live video walkthrough of the production floor, request the pattern block for your style, and start with a paid sample before any bulk deposit. Cross-check the business license against the company name on the invoice. A factory that resists a physical sample or a live walkthrough is a risk regardless of how competitive the quote looks.",
        ],
        [
          "What payment terms are typical for hoodie manufacturing orders?",
          "Common structures include a deposit of around 30% with the balance before shipment, or against a copy of the bill of lading for established relationships. Some factories offer letter of credit terms for larger orders. Terms are negotiable and typically improve as order history builds. Confirm currency, bank details, and any inspection-linked payment conditions in writing.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第六篇（2026-10-07）。slug 取自 TDK（/top-10-embroidered-hoodie-manufacturers-china/）。
  // 审核报告 80 分（未达标需人工复核，用户确认发布）。H2/Title 年份按报告 P0-2 (2025)→(2026)；
  // "Checklist 下载"与"portfolio 作品集"站内不存在，按发布规则替换。本篇实名列 9 家公开集团，
  // 文中自带 editorial/indicative 免责句（报告 P1 建议的进一步限定未执行）。
  "/top-10-embroidered-hoodie-manufacturers-china/": {
    title: "Top 10 Embroidered Hoodie Manufacturers in China | Yauum",
    description:
      "Compare the top 10 embroidered hoodie manufacturers in China. Learn how to evaluate embroidery quality, MOQ & lead time. Get a free quote from YAUUM.",
    path: "/top-10-embroidered-hoodie-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/decoration-embroidery.webp"),
    ogImageAlt: "Embroidered lettering on a hoodie as a visual process reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Embroidered Hoodie Manufacturers in China", "/top-10-embroidered-hoodie-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Embroidered Hoodie Manufacturers in China: A Buyer's Guide to Choosing the Right Factory",
        description:
          "Compare the top 10 embroidered hoodie manufacturers in China. Learn how to evaluate embroidery quality, MOQ & lead time. Get a free quote from YAUUM.",
        path: "/top-10-embroidered-hoodie-manufacturers-china/",
        image: "/uploads/hoodie-manufacturer/decoration-embroidery.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-07T00:00:00+08:00",
        dateModified: "2026-10-07T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom embroidered hoodies in China?",
          "Most Chinese factories set MOQ at 300–500 pieces per color for custom embroidered hoodies, and flexible workshops will take 100–300 on simpler artwork. Minimums drop when you build on stock fabric and an existing block pattern. Confirm per-color and per-style minimums separately.",
        ],
        [
          "How long does it take to get an embroidered hoodie sample?",
          "Plan on 7–15 days once artwork and fabric are locked. 3D puff and chenille add two to four days, since the foam or yarn trial usually needs a second pass before it holds shape. Rush sampling exists at a premium, and it means your sample jumps the queue.",
        ],
        [
          "How much does it cost to manufacture an embroidered hoodie in China?",
          "A mid-weight fleece hoodie with one standard chest embroidery usually lands in the $8–18 FOB range at 500–1,000 units. Fabric weight drives most of that spread: a 280 GSM brushed fleece with a 6,000-stitch logo sits near the bottom, a 450 GSM heavyweight with multi-position 3D puff near the top. Trims and custom packaging push it further.",
        ],
        [
          "Can I get custom embroidery with small batch orders?",
          "Yes. Expect to pay more per piece rather than be turned away. Runs under 300 pieces are workable at factories built for short cycles, and the penalty shows up in unit price and digitizing amortization.",
        ],
        [
          "What's the difference between OEM and ODM for embroidered hoodies?",
          "OEM means the factory builds to your tech pack, so you control silhouette, fabric, and every embroidery placement. ODM means you select an existing style and apply your branding. OEM builds a brand; ODM tests a market.",
        ],
        [
          "How do I check if a Chinese hoodie factory's certifications are real?",
          "Ask for four things: audit body, certificate number, scope, and expiry date. Then check them with the issuing organization rather than with the supplier. A JPEG proves nothing, and genuine certificates often cover a different facility or exclude knitwear.",
        ],
        [
          "What embroidery techniques are best for hoodies (3D puff, flat, patch)?",
          "3D puff reads well on fleece and suits bold, simple lettering. Flat embroidery handles fine detail and text under 5 mm. Chenille and applique deliver the varsity look while covering large areas fast. Fabric weight sets the ceiling: 400 GSM fleece carries dense stitching that would pucker a 240 GSM terry.",
        ],
        [
          "How do I avoid color mismatch between my sample and bulk order?",
          "Lock a physical thread chart before production and keep a signed reference sample at both ends. Write the assessment lighting into the spec, D65 being the standard. Thread dye lots shift, so re-approve the chart at every reorder.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第七篇（2026-10-09）。slug 取 TDK（/top-8-zip-up-hoodie-manufacturers-china/，Top 10 收敛为 Top 8）。
  // 审核报告 84 分（未达标需人工复核，用户确认发布）。P0-B 域名已逐条打开核验替换：
  // shenzhou.com→shenzhouintl.com、heilan.com→hla.com.cn；其余 6 个域名打开确认为对应集团官网。
  // 两处 checklist 下载 CTA 按发布规则替换；标题年份流水线已自行同步为 2026。
  "/top-8-zip-up-hoodie-manufacturers-china/": {
    title: "Top 8 Zip Up Hoodie Manufacturers in China | Yauum",
    description:
      "Compare the top 8 zip up hoodie manufacturers in China. Learn how to vet factories, avoid sourcing mistakes, and request a quote today.",
    path: "/top-8-zip-up-hoodie-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/style-full-zip.webp"),
    ogImageAlt: "Full zip-up hoodie on a model",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 8 Zip Up Hoodie Manufacturers in China", "/top-8-zip-up-hoodie-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 8 Zip Up Hoodie Manufacturers in China: A 2026 Buyer's Guide to Choosing the Right Factory",
        description:
          "Compare the top 8 zip up hoodie manufacturers in China. Learn how to vet factories, avoid sourcing mistakes, and request a quote today.",
        path: "/top-8-zip-up-hoodie-manufacturers-china/",
        image: "/uploads/hoodie-manufacturer/style-full-zip.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-09T00:00:00+08:00",
        dateModified: "2026-10-09T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the best zip up hoodie manufacturer in China for small orders?",
          "There is no single best factory. Small-order programs are generally better served by mid-size and specialist manufacturers than by large integrated groups, which price and schedule around long runs. Look for factories quoting MOQ per color in the low hundreds that treat zip up hoodies as a core construction rather than a side line.",
        ],
        [
          "What is the typical MOQ for custom zip up hoodies in China?",
          "MOQ commonly ranges from about 300 to 500 pieces per color for custom zip up hoodies, though some factories accept 100 to 200 pieces on simpler constructions using stock fabric. Large integrated manufacturers often require 1,000 pieces or more per style. Always confirm whether the MOQ applies per style, per color, or per fabric, because that distinction decides whether a multi-color drop is even possible.",
        ],
        [
          "How much does it cost to manufacture a zip up hoodie in China?",
          "FOB pricing for custom zip up hoodies typically falls between roughly $8 and $18 per piece, driven mainly by fabric weight, zipper type, decoration method, and order volume. Heavyweight brushed fleece with a branded metal zipper and multi-position embroidery sits at the top of that band; lightweight terry with a single-color print sits near the bottom. Use the range to place your target tier, then request a quote against your own spec.",
        ],
        [
          "How long does production and shipping take for zip up hoodies?",
          "Plan on about 7 to 15 days for sampling, 30 to 45 days for bulk production after sample approval, and 25 to 40 days of sea freight to North America or Europe. Air freight takes roughly 5 to 10 days. Add buffer around Chinese New Year, and add two to three weeks whenever a zipper tape or fabric color requires its own dye lot and lab dip approval.",
        ],
        [
          "Do Chinese hoodie manufacturers support OEM and ODM?",
          "Yes. Most manufacturers offer OEM, where you supply the design and tech pack, and many also offer ODM, where they adapt existing patterns and styles to your branding. ODM shortens development and lowers cost but reduces exclusivity, since the base pattern may run for other clients. Settle which model applies before you assume design ownership.",
        ],
        [
          "What certifications should I look for in a hoodie factory?",
          "BSCI, WRAP, and ISO 9001 cover social compliance and quality systems, while OEKO-TEX addresses chemical safety in the fabric. The logo matters less than three checks: whether the certificate is current, whether it covers the specific production site making your goods, and whether it names your actual supplier. Verify with the issuing body instead of trusting a forwarded PDF.",
        ],
        [
          "Can I get samples before placing a bulk order?",
          "Yes, and you should. Most factories provide samples, either free against a bulk commitment or charged as a sample fee that is often credited back on the order. Wash the sample before you approve it, because shrinkage and placket distortion surface after the first wash, not before it.",
        ],
        [
          "How do I verify a hoodie manufacturer is legitimate?",
          "Cross-check the company registration, request a live video or in-person walkthrough of the production floor, verify audit certificates with the issuing body, ask for references from brands of comparable size, and start with a trial order. A supplier that resists any of these steps is a risk signal regardless of the price on the table.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第八篇（2026-10-09）。slug 取 TDK（/top-puff-print-hoodie-manufacturers-china/）。
  // 审核报告 79 分（未达标需人工复核，用户确认发布）。P0-2 年份已改（Title 2026 Guide / H2 2026 List /
  // 引言 2026 or 2027）；7 处失效站内链接（实测全 404）换成真实页面。FAQ A3 的链接句按发布规则改写，
  // 下方 text 与页面可见 FAQ 文本一致（链接仅存在于页面标记层）。
  "/top-puff-print-hoodie-manufacturers-china/": {
    title: "Top 10 Puff Print Hoodie Supplier Types in China | Yauum",
    description:
      "Compare 10 puff print hoodie supplier types in China by region and capability. Vet suppliers, check MOQs, and request a free sample from YAUUM.",
    path: "/top-puff-print-hoodie-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/style-puff-print.webp"),
    ogImageAlt: "Puff-print hoodie on a model",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Puff Print Hoodie Supplier Types in China", "/top-puff-print-hoodie-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Puff Print Hoodie Supplier Types in China: How to Shortlist by Region & Capability",
        description:
          "Compare 10 puff print hoodie supplier types in China by region and capability. Vet suppliers, check MOQs, and request a free sample from YAUUM.",
        path: "/top-puff-print-hoodie-manufacturers-china/",
        image: "/uploads/hoodie-manufacturer/style-puff-print.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-09T00:00:00+08:00",
        dateModified: "2026-10-09T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the minimum order quantity (MOQ) for custom puff print hoodies in China?",
          "MOQ for custom puff print hoodies commonly falls between 100 and 300 pieces per color per design, though some factories accept 50–100 piece trial runs at a higher unit cost. Heavyweight or multi-color designs may push the minimum toward 300–500 pieces. Always confirm MOQ per color, not per style, because puff print requires a separate screen for each colorway.",
        ],
        [
          "How long does it take to produce a puff print hoodie sample?",
          "Standard sampling runs about 7–15 days once fabric is in stock, depending on artwork complexity and the number of puff colors. Samples requiring custom fabric development or a new dye lot can take 15–25 days. Ask whether the sample room is in-house; outsourced puff screens add roughly a week to the cycle.",
        ],
        [
          "How much does a custom puff print hoodie cost?",
          "Pricing depends on fabric weight and composition, puff complexity, order quantity, and decoration count. As a planning range, custom puff print hoodies typically land around $12–28 per piece FOB for mid-weight fleece at 500–1,000 piece volumes, with heavyweight or multi-decoration styles running higher. These are industry-typical ranges for budgeting; request a live quote against your spec. For a detailed cost breakdown, talk to our team.",
        ],
        [
          "What fabrics work best for puff print hoodies?",
          "Cotton-rich French terry and brushed fleece in the 280–450gsm range give the most predictable results, because a stable, tightly knit surface holds the foam deposit evenly. Loopback and cotton/poly blends work when the paste is matched to the fiber. Avoid very loose knits and high-poly surfaces unless the factory has tested puff adhesion on that exact quality.",
        ],
        [
          "How durable is puff print after washing?",
          "Properly cured puff print holds its raised height through repeated home laundering at 30–40°C when the foam paste and base fabric are correctly matched. Failures usually come from under-curing or a paste-fabric mismatch rather than from washing itself. Ask for the factory's wash test protocol and the number of cycles run before bulk approval.",
        ],
        [
          "What certifications should I look for in a puff print hoodie factory?",
          "Look for social compliance and quality management documentation relevant to your market, such as BSCI or WRAP for social audits and ISO 9001 for quality systems, plus fiber or chemical certifications if you make sustainability claims. Certification scope varies, so request current certificates and verify the listed products and validity dates rather than relying on a logo on a website.",
        ],
      ]),
    ],
  },
  // 文章详情页 · 第九篇（2026-10-10）。slug 取 TDK（/how-to-find-a-hoodie-manufacturer/）。
  // 审核报告 87 分（未达标需人工复核，用户确认发布）。P0-A 年份已改（H1/headline 为 (2026)、
  // Title 补 2026）；两处下载承诺改真实动作，Meta Description 同步去掉 "free supplier checklist"；
  // 正文表格里的 premium 已替换（公司简介禁用词）。下方 FAQ text 与页面可见 FAQ 文本逐字一致。
  "/how-to-find-a-hoodie-manufacturer/": {
    title: "How to Find a Hoodie Manufacturer: Step-by-Step Guide 2026 | Yauum",
    description:
      "Learn how to find a hoodie manufacturer: sourcing channels, a vetting checklist, sampling tips, and red flags. Request a quote with your hoodie spec.",
    path: "/how-to-find-a-hoodie-manufacturer/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Custom hoodies being manufactured in a hoodie factory workshop",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["How to Find a Hoodie Manufacturer", "/how-to-find-a-hoodie-manufacturer/"],
      ]),
      articleJsonLd({
        headline:
          "How to Find a Hoodie Manufacturer: A Step-by-Step Guide for Brands (2026)",
        description:
          "Learn how to find a hoodie manufacturer: sourcing channels, a vetting checklist, sampling tips, and red flags. Request a quote with your hoodie spec.",
        path: "/how-to-find-a-hoodie-manufacturer/",
        image: "/uploads/factory/factory-sewing-line-wide.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-10T00:00:00+08:00",
        dateModified: "2026-10-10T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "How do I find a hoodie manufacturer for a small brand?",
          "Build a raw list from B2B platforms, then filter hard using the vetting checklist above. Prioritize factories transparent about minimums and willing to run smaller initial orders over the lowest quoted price. Expect to contact 15–25 suppliers to find 3–5 worth sampling with.",
        ],
        [
          "What is the MOQ for custom hoodies?",
          "MOQ varies by factory, but many hoodie manufacturers set minimums in the 100–500 piece range per color per style. Custom decoration, specialty fabrics, and custom trims push minimums higher. Stock fabrics and standard constructions often qualify for lower minimums.",
        ],
        [
          "How much does it cost to manufacture a hoodie?",
          "Unit cost depends on fabric weight and composition, decoration method, order quantity, and construction complexity. A midweight hoodie with one print location sits in a different band than a 400 GSM heavyweight with embroidery and custom trims. Request itemized quotes against a fixed spec.",
        ],
        [
          "How do I know if a hoodie manufacturer is legit?",
          "Ask for a live video walkthrough of the production floor, request the business license, ask specific questions about equipment and capacity, and start with a paid sample. Legitimate factories answer without hesitation. Reluctance to show the factory is the strongest single warning sign.",
        ],
        [
          "Should I choose a factory or a trading company?",
          "Choose a direct factory for lowest cost and direct quality control if you can manage production communication yourself. Choose a trading company for multi-category sourcing, logistics coordination, or a buffer between you and several factories. Either way, know which one you are dealing with before committing.",
        ],
        [
          "How long does hoodie sampling and production take?",
          "Sampling and bulk production run on separate timelines. Sampling typically takes one to three weeks depending on complexity and revision rounds. Bulk production adds several weeks, depending on quantity, fabric availability, and factory scheduling. Shipping is additional, so build buffer into your launch calendar.",
        ],
        [
          "Can I get custom hoodies with no minimum order?",
          "True zero-minimum custom hoodie manufacturing is rare. Some suppliers offer low minimums on stock fabrics and standard constructions, but custom fabrics, custom dyeing, and custom decoration usually carry a minimum. If a supplier claims no minimum, verify what \"custom\" actually includes.",
        ],
        [
          "What should I ask a hoodie manufacturer before ordering?",
          "Ask about MOQ per color, sample lead time and fee, bulk lead time, in-house versus outsourced decoration, QC process and inspection points, payment terms, certifications, and what happens if bulk production does not match the approved sample. Get the answers in writing.",
        ],
      ]),
    ],
  },
  // 文章详情页 · 第十篇（2026-10-10）。slug 取 TDK（/how-to-find-alibaba-hoodie-manufacturers/）。
  // 审核报告 84 分（未达标需人工复核，用户确认发布）。P0 仅词数（约 3,100–3,300，未压缩照发，同前几篇）；
  // 下载承诺改真实动作；5 条内链映射到真实页面（/about-us/、/hoodie-manufacturer/#fabric 与 #workflow 等）。
  // 下方 FAQ text 与页面可见 FAQ 文本逐字一致。
  "/how-to-find-alibaba-hoodie-manufacturers/": {
    title: "How to Find Alibaba Hoodie Manufacturers: Screening Guide | Yauum",
    description:
      "Learn how to find and verify Alibaba hoodie manufacturers. Screening framework, red flags, and factory audit tips. Get a tiered quote from YAUUM.",
    path: "/how-to-find-alibaba-hoodie-manufacturers/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-detail.webp"),
    ogImageAlt: "Hoodie manufacturing production line in a factory with workers sewing custom hoodies",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["How to Find Alibaba Hoodie Manufacturers", "/how-to-find-alibaba-hoodie-manufacturers/"],
      ]),
      articleJsonLd({
        headline:
          "How to Find Alibaba Hoodie Manufacturers: A Complete Screening Framework (From Search to Factory Audit)",
        description:
          "Learn how to find and verify Alibaba hoodie manufacturers. Screening framework, red flags, and factory audit tips. Get a tiered quote from YAUUM.",
        path: "/how-to-find-alibaba-hoodie-manufacturers/",
        image: "/uploads/factory/factory-sewing-line-detail.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-10T00:00:00+08:00",
        dateModified: "2026-10-10T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "How do I know if an Alibaba hoodie manufacturer is legit?",
          "Verify three things: the business registration matches the company name, certifications check out against the issuing body's registry, and the supplier agrees to a live video walkthrough of its production floor. A legitimate factory answers specific operational questions about machine counts, monthly capacity, and lead times without deflecting.",
        ],
        [
          "What's the difference between a hoodie manufacturer and a trading company on Alibaba?",
          "A manufacturer owns production equipment and controls its own cutting, sewing, and finishing. A trading company buys from factories and resells at a margin. Trading companies aren't inherently bad, but when one presents itself as a factory, your pricing and lead-time assumptions rest on a false premise.",
        ],
        [
          "What is a reasonable MOQ for custom hoodies from Alibaba?",
          "For custom hoodies with your own labels and specs, MOQ usually runs 300 to 500 pieces per colorway. Stock-fabric and semi-custom programs can go lower. If your target sits below the stated MOQ, ask about combining colorways on one fabric or switching to stock fabric to drop the threshold.",
        ],
        [
          "How long does it take to get a hoodie sample from an Alibaba supplier?",
          "Sampling time depends on fabric availability and decoration complexity. A straightforward fleece hoodie built from stock fabric usually takes a few weeks from tech pack to sample in hand. Custom-dyed fabric, puff print, or multi-color embroidery extends that. Confirm the timeline and the sample fee, including whether it credits against bulk, before you commit.",
        ],
        [
          "Should I use Alibaba Trade Assurance when ordering hoodies?",
          "Trade Assurance protects your payment if the supplier fails to meet agreed terms, so use it on first orders with a new supplier. It does not guarantee product quality. That job belongs to your spec sheet, your approved sample, and a pre-shipment inspection. Use both layers.",
        ],
        [
          "How do I verify a hoodie factory's certifications (WRAP, BSCI, ISO)?",
          "Request the certificate number and the issuing body, then verify it independently. WRAP and amfori (BSCI) both maintain registries, and ISO certificates can be confirmed with the accredited certification body that issued them. Check that the facility name matches the supplier's legal name and that the certificate has not expired.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十一篇（2026-10-12, where-are-hoodies-manufactured）。
  // 审核 75 分；文件名"❌不完整"为流水线误报（HTML 完整收尾、FAQ 与 Schema 逐字一致）。
  // 上线处理：6 内链映射、premium→high-end（10 处）、删 "vetted factory network" 口径、
  // P2-7 Turkey 语法修复；P1-5/P1-6/P2-8 未执行（见上传汇报）。
  "/where-are-hoodies-manufactured/": {
    title: "Where Are Hoodies Manufactured? Global Guide | Yauum",
    description:
      "Where are hoodies manufactured? Compare China, Vietnam, Bangladesh, Turkey and Portugal on cost, MOQ and lead time, then pick the right factory",
    path: "/where-are-hoodies-manufactured/",
    ogType: "article",
    ogImage: abs("/uploads/hoodie-manufacturer/hero-blank-pullover.webp"),
    ogImageAlt: "Blank pullover hoodie shown as a custom manufacturing style reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Where Are Hoodies Manufactured?", "/where-are-hoodies-manufactured/"],
      ]),
      articleJsonLd({
        headline:
          "Where Are Hoodies Manufactured? A Global Manufacturing Map for Brands & Buyers",
        description:
          "Where are hoodies manufactured? Compare China, Vietnam, Bangladesh, Turkey and Portugal on cost, MOQ and lead time, then pick the right factory",
        path: "/where-are-hoodies-manufactured/",
        image: "/uploads/hoodie-manufacturer/hero-blank-pullover.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-12T00:00:00+08:00",
        dateModified: "2026-10-12T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "Where are most hoodies manufactured?",
          "The majority of the world's hoodies are manufactured in Asia, led by China, Vietnam, Bangladesh, and India. China handles the widest range of order sizes and decoration types, while Vietnam and Bangladesh dominate high-volume basic fleece production. Turkey and Portugal serve European brands seeking faster delivery and high-end construction.",
        ],
        [
          "Is it cheaper to manufacture hoodies in China or Bangladesh?",
          "Bangladesh is generally cheaper for large-volume basic hoodies, with unit costs running meaningfully below comparable Chinese production once you pass roughly 1,000 pieces per color. China becomes more cost-effective for smaller runs, complex decoration, and multi-SKU orders, where its supply-chain flexibility reduces waste and rework.",
        ],
        [
          "What is the minimum order quantity for custom hoodies?",
          "MOQ varies by country and fabric. China commonly accepts 100–500 pieces per color on stock fabrics, Portugal and Turkey sit around 150–1,000 pieces, and Bangladesh typically starts at 1,000–3,000 pieces. Custom-dyed fabric raises the minimum almost everywhere, because the dyehouse sets its own batch size.",
        ],
        [
          "Which country is best for small-batch hoodie production?",
          "China, Portugal, and Turkey are the strongest options for small-batch hoodie production. China offers the widest fabric and decoration range at low MOQs, Portugal delivers high-end construction on 150–500 piece runs, and Turkey balances quality with speed for European brands.",
        ],
        [
          "How long does hoodie manufacturing take?",
          "Sampling typically takes 7–25 days depending on country and complexity. Bulk production runs 25–90 days, with China and Turkey at the faster end and Bangladesh at the slower end. Add 10–20 days for custom dyeing and 25–35 days for ocean freight. Air freight cuts transit to about a week but raises cost sharply.",
        ],
        [
          "Do hoodie manufacturers offer OEM and ODM services?",
          "Most established hoodie manufacturers offer both. OEM means the factory produces to your designs and tech packs. ODM means it supplies existing designs you adapt with your own branding. OEM gives you more control and differentiation, while ODM gets you to market faster and cheaper.",
        ],
        [
          "What certifications should I look for in a hoodie factory?",
          "Look for social-compliance audits such as WRAP or BSCI, quality-management certification such as ISO 9001, and chemical or environmental certification such as OEKO-TEX where your category requires it. Requirements depend on your target retailers, so confirm which frameworks they accept before you select a factory.",
        ],
        [
          "Can I get hoodie samples before placing a bulk order?",
          "Yes, and you should. Reputable factories provide fit samples, lab dips, and pre-production samples, usually for a fee that is often credited against the bulk order. Always approve a pre-production sample before mass production begins.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十二篇（2026-10-12, custom-t-shirt-manufacturer-guide）。
  // 审核 84 分；红线通过、FAQ 逐字一致；P0-B（分类数字）已执行；P0-A（压缩 400–500 词）未执行（照发，见汇报）。
  // 上线处理：5 处 yauum.com 不存在链接 + 4 处 CTA 映射站内页；下载承诺改真实动作；premium positioning ×2 → high-end。
  "/custom-t-shirt-manufacturer-guide/": {
    title: "Custom T-Shirt Manufacturer Guide: How to Choose One | Yauum",
    description:
      "A buyer's guide to choosing a custom t-shirt manufacturer: fabric, MOQ, sampling, QC and pricing. Request a quote today",
    path: "/custom-t-shirt-manufacturer-guide/",
    ogType: "article",
    ogImage: abs("/uploads/t-shirt-manufacturer/branding-screen-printing-line.webp"),
    ogImageAlt: "Screen printing on a custom T-shirt production line",
    ogImageWidth: 1600,
    ogImageHeight: 1067,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Custom T-Shirt Manufacturer Guide", "/custom-t-shirt-manufacturer-guide/"],
      ]),
      articleJsonLd({
        headline:
          "How to Choose a Custom T-Shirt Manufacturer: A Buyer's Decision Guide",
        description:
          "A buyer's guide to choosing a custom t-shirt manufacturer: fabric, MOQ, sampling, QC and pricing. Request a quote today",
        path: "/custom-t-shirt-manufacturer-guide/",
        image: "/uploads/t-shirt-manufacturer/branding-screen-printing-line.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-12T00:00:00+08:00",
        dateModified: "2026-10-12T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom t-shirts?",
          "For men's cut-and-sew T-shirts, MOQ commonly falls in the 300–500 pieces per color range, driven by mill fabric and dye-lot minimums rather than factory policy. Stock fabrics allow lower thresholds; custom-developed fabrics push MOQ higher. Confirm MOQ per color and per size before finalizing your design, because a second colorway can double your commitment.",
        ],
        [
          "How long does sampling take, and is the sample fee refundable?",
          "Sampling typically runs 7–15 days depending on fabric availability and decoration complexity, with fees commonly quoted between $50 and $150 per basic style. Whether that fee is credited against bulk varies by factory and order size. Ask before you pay, and get the answer in writing along with the number of included revision rounds.",
        ],
        [
          "What file format should I provide for my design?",
          "Vector files are the standard for print production: AI, EPS, or PDF with outlined fonts. For embroidery, supply a 300 DPI minimum PNG or JPG and expect the factory to digitize it into a stitch file. A competent factory flags low-resolution artwork for cleanup. Include Pantone numbers for every color.",
        ],
        [
          "Can you match a specific Pantone color across different fabrics?",
          "Exact matching across different fabric compositions is not realistic, because cotton, CVC, and polyester absorb dye differently. A capable factory produces a lab dip on your actual production fabric and secures written approval before bulk dyeing. Expect a result inside a stated tolerance rather than a perfect match, and write that tolerance into your spec sheet.",
        ],
        [
          "What's the difference between OEM and ODM for t-shirt manufacturing?",
          "OEM means you supply the design, tech pack, and specifications, and the factory manufactures to them. ODM means the factory offers existing patterns that you customize with branding and minor modifications. OEM gives full differentiation but needs a complete tech pack and usually a higher MOQ. ODM starts faster and cheaper, though competitors can source the same garment.",
        ],
        [
          "How do you ensure reorder consistency months later?",
          "Consistency depends on documentation, not memory. Ask whether the factory retains a sealed approval sample, archives lab dips by dye lot, and stores print screens or embroidery files. Confirm how long those records are kept. A factory that can rebuild your fabric, color, and measurements from an archived reference is a long-term partner.",
        ],
        [
          "Do you provide fabric test reports and compliance certificates?",
          "Capable manufacturers supply fabric composition reports and internal test data, while third-party testing for restricted substances or market-specific compliance is usually arranged at the buyer's cost. Ask before production rather than before shipment, since retroactive testing can delay delivery by weeks. Request the document list your destination market requires.",
        ],
        [
          "What are typical lead times for bulk orders?",
          "Bulk production commonly runs 30–45 days after sample approval, followed by 25–35 days of sea freight to North America or Europe, plus customs clearance. Door-to-door totals of 8–12 weeks are normal for ocean shipments. Peak season, complex decoration, and custom fabric development extend these windows. Plan backward from your delivery date.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十三篇（2026-10-12, top-10-t-shirt-manufacturers-china）。
  // 审核 79 分；红线通过、FAQ 逐字一致；P0-2 年份（2025→2026）已执行；P0-1（压缩 550 词）未执行（照发，见汇报）。
  // 上线处理：4 内链 + 5 CTA 映射；"supplier shortlist"/"audit checklist" 口径改写；premium ×3 → high-end。
  "/top-10-t-shirt-manufacturers-china/": {
    title: "Top 10 T-Shirt Manufacturers in China (2026 Guide) | Yauum",
    description:
      "Compare the top 10 t-shirt manufacturers in China by MOQ, certifications & capacity. Use our 7-point framework to pick the right partner. Get a free quote",
    path: "/top-10-t-shirt-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/t-shirt-manufacturer/process-sewing-line.webp"),
    ogImageAlt: "T-shirt sewing line in a Chinese garment factory",
    ogImageWidth: 1600,
    ogImageHeight: 1067,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 T-Shirt Manufacturers in China", "/top-10-t-shirt-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 T-Shirt Manufacturers in China: How to Choose the Right Partner (2026 Guide)",
        description:
          "Compare the top 10 t-shirt manufacturers in China by MOQ, certifications & capacity. Use our 7-point framework to pick the right partner. Get a free quote",
        path: "/top-10-t-shirt-manufacturers-china/",
        image: "/uploads/t-shirt-manufacturer/process-sewing-line.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-12T00:00:00+08:00",
        dateModified: "2026-10-12T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for t-shirt manufacturing in China?",
          "MOQ varies by factory type. Large vertically integrated manufacturers often require several thousand pieces per style, while specialized workshops and flexible suppliers commonly start around 300–500 pieces per color. Fabric choice and decoration method can raise the minimum. Always confirm MOQ per color, per style, and per fabric, since those three numbers often differ.",
        ],
        [
          "How long does it take to manufacture custom t-shirts in China?",
          "Typical timelines run 7–14 days for sampling, 30–45 days for bulk production after sample approval, and 25–35 days for sea freight to the US or EU. Air freight cuts shipping to roughly 5–10 days at higher cost. Peak season, around August to October, can add one to two weeks. These are common market ranges, so confirm against your specific order.",
        ],
        [
          "How much does it cost to manufacture t-shirts in China?",
          "FOB pricing commonly falls around $2.8–6.5 per piece for a 180gsm combed cotton crew neck at a 3,000-piece order, depending on fabric, decoration, and construction. Organic cotton, heavyweight fleece, and complex printing push the upper end. These are industry reference ranges, so request a live quote for your exact spec.",
        ],
        [
          "What certifications should a Chinese t-shirt manufacturer have?",
          "It depends on your market. For EU and US retail, buyers typically look for social compliance audits such as BSCI or WRAP, a quality management certification such as ISO 9001, and chemical safety certification such as OEKO-TEX for the finished fabric. No single certificate covers everything, so match the documentation to your channel's requirements.",
        ],
        [
          "Can I get samples before placing a bulk order?",
          "Yes, and you should. Most manufacturers provide paid samples, with costs often credited against the bulk order. Sampling typically takes 7–14 days. Treat the sample as a quality test, not a formality, and evaluate fabric weight, stitching, print durability, and measurements against your spec.",
        ],
        [
          "What's the difference between OEM and ODM for t-shirts?",
          "OEM means you supply the design, tech pack, and specifications, and the factory manufactures to your spec. ODM means the factory offers existing designs and patterns that you brand as your own. OEM gives you control and exclusivity; ODM gives you speed and lower development cost. Confirm pattern ownership before choosing ODM.",
        ],
        [
          "How do I verify a t-shirt manufacturer is legitimate?",
          "Verify certificate numbers on the issuing body's registry, request a live video walkthrough of the production floor, run a small trial order, and book third-party inspection for bulk. Also confirm whether production is in-house or subcontracted. Legitimate factories answer these requests directly.",
        ],
        [
          "Do Chinese t-shirt manufacturers ship internationally?",
          "Most established manufacturers and exporters ship worldwide, quoting FOB, CIF, or DDP depending on your preference. They typically work with freight forwarders for sea, air, and express shipping. Confirm which incoterms they quote and who handles customs documentation before you finalize terms.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十四篇（2026-10-15, custom-jacket-manufacturer-guide）。
  // 审核 84 分；红线通过、FAQ 逐字一致；案例段经报告确认合规。
  // 上线处理：4 内链映射（含 #jk-materials 面料锚点）；3 处 checklist 下载承诺 + H2 标题 → 真实动作；
  // CTA → /contact-us/；Meta description 删 "and a free supplier checklist"。P0（压缩词数）未执行（照发，见汇报）。
  "/custom-jacket-manufacturer-guide/": {
    title: "Custom Jacket Manufacturer: 7-Point Vetting Guide | Yauum",
    description:
      "How to choose a custom jacket manufacturer: 7 vetting criteria, MOQ and lead-time benchmarks, red flags, and how to get a quote from YAUUM",
    path: "/custom-jacket-manufacturer-guide/",
    ogType: "article",
    ogImage: abs("/uploads/jackets-manufacturer/hero-jackets-private-label.webp"),
    ogImageAlt: "Private label jacket shown as a custom manufacturing reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Custom Jacket Manufacturer Guide", "/custom-jacket-manufacturer-guide/"],
      ]),
      articleJsonLd({
        headline:
          "Custom Jacket Manufacturer Guide: How to Choose the Right Partner (Without Costly Mistakes)",
        description:
          "How to choose a custom jacket manufacturer: 7 vetting criteria, MOQ and lead-time benchmarks, red flags, and how to get a quote from YAUUM",
        path: "/custom-jacket-manufacturer-guide/",
        image: "/uploads/jackets-manufacturer/hero-jackets-private-label.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the minimum order quantity (MOQ) for custom jackets?",
          "MOQ is typically set per style and per color, and it rises when the fabric is custom-dyed or the trim is custom-tooled. Many mid-volume menswear programs run in the 300–500 pcs per style/color range, but the figure depends on your fabric and construction. Confirm MOQ in writing before sampling, and ask whether styles can be combined into one shipment to reduce the effective minimum.",
        ],
        [
          "How long does it take to produce custom jackets from sample to delivery?",
          "Sampling usually runs 7–15 days, bulk production 30–45 days, and sea freight 25–35 days depending on destination. Peak season and custom fabric dyeing add time on top. Treat these as planning ranges and confirm your actual ship date against a specific sample-approval date, since production time without a start date is not a real commitment.",
        ],
        [
          "Can you produce small-batch or multi-style orders?",
          "Yes, when the order is structured around shared materials. If several styles use the same shell fabric and colorway, they can often be produced against a combined minimum rather than separate ones. The constraint is usually custom-dyed fabric or custom-tooled trim, which raises the minimum. Ask for a combined-shipment MOQ when you are running a capsule.",
        ],
        [
          "What fabrics and materials do you offer for custom jackets?",
          "Shell options span woven and knit constructions depending on the style. Bomber, coach, varsity, denim, puffer, windbreaker, and work jackets each call for different shells, linings, and interlinings. Functional finishes such as water repellency and breathability are available on selected shells with test reports on request. Send your target composition and we will confirm availability and lead time.",
        ],
        [
          "Do you provide samples before bulk production? How does sampling work?",
          "Yes. Sampling is a standard stage: pattern drafting, fabric sourcing, first sample, your review against the spec, and revisions until approval. The approved sample plus its measurement sheet becomes the reference for bulk. Ask how many revision rounds are included and whether the pattern is drafted in-house, since outsourced sampling slows every revision.",
        ],
        [
          "What certifications or compliance standards do you meet?",
          "Compliance requirements depend on your market, fiber content, and buyer. We can provide relevant test reports and compliance documentation on request, and we disclose which production steps are in-house. Tell us your destination market and we will confirm the specific documentation available for your program.",
        ],
        [
          "How do you handle quality control during production?",
          "In-line QC runs during production, commonly at 30–50% completion, so issues are corrected on the line, followed by a final inspection against AQL 2.5 before packing. You receive a written inspection report. Ask any candidate whether they run in-line QC or final inspection only; the difference shows up in rework cost.",
        ],
        [
          "What information do I need to provide to get an accurate quote?",
          "Send the tech pack, reference photos, a physical sample if available, target fabric, size range, label files, quantity, packaging requirements, target market, and delivery date. The more complete the brief, the fewer revisions and the more accurate the quote. If you do not have a tech pack yet, reference photos and a target construction are enough to start.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十五篇（2026-10-15, bomber-jacket-manufacturers-china-factory-types）。
  // 审核 88 分达标；"❌不完整"指 HTML 导出件被截断，md 终稿完整、报告确认可发布。
  // 上线处理：4 内链 + 9 CTA 按意图分流（contact/wa.me/mailto）；下载承诺改写（含 H2）；
  // premium→high-end；删正文 "© YAUUM" 行（报告 P2-5）；Title 压至 60 字符（报告 P2-1）。本页不配图。
  "/bomber-jacket-manufacturers-china-factory-types/": {
    title: "Bomber Jacket Manufacturers in China: 10 Factory Types | Yauum",
    description:
      "Compare 10 types of bomber jacket factories in China by cluster and specialty. Selection criteria, craft essentials & sourcing pitfalls. Get a free quote",
    path: "/bomber-jacket-manufacturers-china-factory-types/",
    ogType: "article",
    ogImage: abs("/uploads/jackets-manufacturer/hero-jackets-private-label.webp"),
    ogImageAlt: "Private label jacket shown as a custom manufacturing reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Bomber Jacket Manufacturers in China", "/bomber-jacket-manufacturers-china-factory-types/"],
      ]),
      articleJsonLd({
        headline:
          "Bomber Jacket Manufacturers in China: 10 Factory Types & How to Choose the Right One",
        description:
          "Compare 10 types of bomber jacket factories in China by cluster and specialty. Selection criteria, craft essentials & sourcing pitfalls. Get a free quote",
        path: "/bomber-jacket-manufacturers-china-factory-types/",
        image: "/uploads/jackets-manufacturer/hero-jackets-private-label.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the typical MOQ for custom bomber jackets from China?",
          "For stock fabrics, MOQ commonly falls in the 300 to 500 piece range per color. Custom-developed shell fabrics or special trims can push this to 500 to 1,000 pieces. Always confirm MOQ by component, not just finished garment.",
        ],
        [
          "How long does it take to produce a custom bomber jacket order?",
          "Sampling typically runs 7 to 25 days depending on fabric and trim sourcing. Bulk production generally takes 30 to 60 days, followed by 25 to 35 days for sea freight. Decoration-heavy styles sit at the long end of the sampling range.",
        ],
        [
          "Can I get a sample before placing a bulk order?",
          "Yes. Most manufacturers provide fit samples and pre-production samples at a sample fee that is often credited against the bulk order. Approve and seal a final sample before production begins.",
        ],
        [
          "What materials are commonly used for bomber jackets?",
          "Common shells include nylon, polyester, cotton twill, and wool blends. Linings are typically polyester or satin. Filling options range from cotton wadding to synthetic fill to down. Ribbing is usually an elastane-cotton or elastane-polyester blend.",
        ],
        [
          "How do I verify a Chinese jacket manufacturer's compliance?",
          "Request documentation samples during vetting, ask about audit cooperation, and confirm material traceability for any restricted substances. If a factory cannot produce documents on request, treat that as a red flag.",
        ],
        [
          "What's the price range for custom bomber jackets?",
          "FOB pricing for a standard nylon or poly bomber usually lands between $12 and $45 per piece, driven by shell fabric, filling, trim specification, and order volume. Leather and down styles sit well above that band. Get a quote against your own tech pack before building a cost model.",
        ],
        [
          "Do Chinese manufacturers support private label and custom branding?",
          "Yes. Private label, custom woven labels, branded zipper pulls, and custom packaging are standard offerings at most established factories. Confirm branding requirements at the sampling stage.",
        ],
        [
          "How do I communicate design requirements if I'm not technical?",
          "A tech pack with reference images, measurements, and material notes is the standard starting point. If you don't have one, a factory with pattern development capability can build it from your references.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十六篇（2026-10-15, top-10-varsity-jacket-manufacturers-china）。
  // 审核 85 分红线通过、FAQ 逐字一致；"❌不完整"为误报。十类"类别"画像（非实名榜）。
  // 上线处理：5 内链 + 5 CTA 映射；案例链接与两处 checklist 承诺改写；premium→higher price；
  // Title 去年份（报告 P1-3）与 Meta 首句改 "10 types"（报告 P2-6）已执行；本页不配图。
  "/top-10-varsity-jacket-manufacturers-china/": {
    title: "Top 10 Varsity Jacket Manufacturers in China (B2B Guide) | Yauum",
    description:
      "Compare 10 types of varsity jacket manufacturers in China. Learn how to verify real factories, avoid trading companies, and request a sample. Get a quote today",
    path: "/top-10-varsity-jacket-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/jackets-manufacturer/hero-jackets-private-label.webp"),
    ogImageAlt: "Private label jacket shown as a custom manufacturing reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Varsity Jacket Manufacturers in China", "/top-10-varsity-jacket-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Varsity Jacket Manufacturers in China: An Honest Factory-Side Guide for B2B Buyers",
        description:
          "Compare 10 types of varsity jacket manufacturers in China. Learn how to verify real factories, avoid trading companies, and request a sample. Get a quote today",
        path: "/top-10-varsity-jacket-manufacturers-china/",
        image: "/uploads/jackets-manufacturer/hero-jackets-private-label.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom varsity jackets from Chinese manufacturers?",
          "Minimum order quantities vary widely by factory type. Specialists serving streetwear brands commonly accept smaller runs per colorway, while large integrated bulk factories set much higher minimums. The number that matters is the minimum per color, not per style, because color drives fabric dyeing and trim purchasing. Confirm both figures before comparing quotes.",
        ],
        [
          "How long does sampling take for a custom varsity jacket?",
          "Sampling time tracks design complexity. A stock-fabric body with one chenille patch moves faster than a fully custom build that needs new rib development and multi-color chenille. Patch-heavy designs almost always need at least one revision round after the first proto. Ask for a dated sampling schedule in writing rather than a general estimate.",
        ],
        [
          "How do I tell if a varsity jacket manufacturer is a real factory or a trading company?",
          "Run three questions past them. Can they show the production line live on video? Can they break your quote down by material and process? Which processes run in-house and which are outsourced? A factory answers all three specifically. A trading company usually fails at least two.",
        ],
        [
          "What factors affect the price of an OEM varsity jacket in China?",
          "The main cost drivers are shell fabric type and weight, whether the body is wool-blend melton or fleece, rib quality, chenille patch size and color count, embroidery stitch count, lining material, and hardware such as snaps and zippers. Quantity per colorway and packaging complexity also move the number. Ask for a line-item breakdown so you can see exactly what you are paying for.",
        ],
        [
          "Which Chinese cities are best for varsity jacket manufacturing?",
          "Guangdong suits export-oriented mid-volume orders with fast material access. Zhejiang suits fleece and knit-heavy constructions. Jiangsu suits full-package OEM programs. Fujian suits sporty and athletic hybrid designs. Match the region to your construction rather than to a general ranking.",
        ],
        [
          "Can I get a sample before placing a bulk order?",
          "Yes, and you should treat it as non-negotiable. Request a sample in your actual construction and materials, not a stock sample with your label added. Check patch definition, rib recovery, hardware function and stitch quality, then wash-test it once before approving.",
        ],
        [
          "What certifications should a varsity jacket factory have?",
          "Expect a social compliance audit, accurate fiber content and care labeling, and product test reports for any performance claim such as water resistance. Request the specific report name and expiry date, and confirm the audit covers the facility that will actually produce your order.",
        ],
        [
          "How do I verify quality during production?",
          "Set checkpoints at incoming fabric, in-line assembly and pre-shipment. Use AQL sampling for final inspection, verify measurements against your size chart within agreed tolerances, and confirm labeling and packing before cartons are sealed. A third-party inspection before shipment is the most reliable safeguard.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十七篇（2026-10-15, top-10-windbreaker-manufacturers-china）。
  // 审核 85 分红线通过、FAQ 逐字一致；"❌不完整"指 HTML 截断（md 完整）。实名榜自带"公开资料、非审计"免责声明。
  // 上线处理：3 内链 + 7 CTA 映射；checklist 下载承诺改写；premium ×4 → high-end；末行斜体更新声明转段落。本页不配图。
  "/top-10-windbreaker-manufacturers-china/": {
    title: "Top 10 Windbreaker Manufacturers in China: 2026 Guide | Yauum",
    description:
      "Compare the top 10 windbreaker manufacturers in China. Learn how to evaluate factories, avoid sourcing pitfalls & request a quote today",
    path: "/top-10-windbreaker-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide-v2.webp"),
    ogImageAlt: "Garment production line in the supplied manufacturing environment",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Windbreaker Manufacturers in China", "/top-10-windbreaker-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Windbreaker Manufacturers in China: A Buyer's Sourcing Guide (2026)",
        description:
          "Compare the top 10 windbreaker manufacturers in China. Learn how to evaluate factories, avoid sourcing pitfalls & request a quote today",
        path: "/top-10-windbreaker-manufacturers-china/",
        image: "/uploads/factory/factory-sewing-line-wide-v2.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for custom windbreakers from China?",
          "MOQ varies by factory and model. For OEM production, common industry ranges sit around 300–1,000 pieces per style and color. ODM programs often start lower, around 200–500 pieces. Wholesale stock orders can go as low as 50–200 pieces. These are general ranges; confirm exact minimums with each supplier, since fabric choice and complexity affect them.",
        ],
        [
          "How long does windbreaker sampling and production take?",
          "Sampling typically takes around 7–15 days after specs and fabrics are confirmed. Bulk production commonly runs 30–45 days, followed by 25–35 days of sea freight to major markets. These are typical industry ranges. Peak season, fabric availability, and order complexity can extend them, so build buffer into your launch calendar.",
        ],
        [
          "Can I get custom windbreakers with my own logo and design?",
          "Yes. Both OEM and ODM models support private label. Under OEM you supply the tech pack and we produce to your specification, including your branding, labels, and packaging. Under ODM you adapt an existing pattern and apply your branding. Logo application options include embroidery, screen print, heat transfer, and woven labels.",
        ],
        [
          "What fabrics are best for windbreakers?",
          "It depends on the end use. Lightweight packable shells often use polyester or nylon taffeta with a DWR finish. Technical windbreakers use laminated or coated fabrics with a membrane for waterproofing and breathability. Soft-shell options use bonded knit or woven fabrics for stretch and comfort. The right choice depends on your target climate, price point, and whether waterproofing or breathability matters more.",
        ],
        [
          "How do I verify a windbreaker manufacturer before ordering?",
          "Start with documentation: business license, audit reports, and references from existing buyers. Then order a sample and evaluate seam-sealing, stitching, and finishing. Request a video walkthrough of the production floor if an in-person visit is not possible. Finally, place a small trial order before committing to a large volume.",
        ],
        [
          "What certifications should a windbreaker factory have?",
          "The relevant certifications depend on your market and buyer requirements. Common social compliance audits include BSCI, WRAP, and Sedex/SMETA, while quality management is often covered by ISO 9001. Some buyers also require specific chemical or environmental standards. Confirm which audits your target retailer accepts, and verify the factory's certificates are current.",
        ],
        [
          "What is the difference between OEM and ODM windbreaker manufacturing?",
          "OEM means the factory builds to your design and specifications, and you supply the tech pack. ODM means the factory offers existing designs that you adapt and brand. OEM gives more control and differentiation; ODM is faster and requires less design resource. Many buyers start with ODM and move to OEM as their volume and design capability grow.",
        ],
        [
          "How much does it cost to manufacture custom windbreakers in China?",
          "Cost depends on fabric, construction, trims, order quantity, and finishing. A basic lightweight shell sits at the lower end, while a seam-sealed technical jacket with a membrane and quality zippers sits higher. FOB pricing for a mid-range custom windbreaker commonly falls in an indicative range of $8–25 per piece for orders around 1,000–3,000 units, excluding trim upgrades and testing fees, though this varies widely. Request itemized quotations rather than single lump-sum figures.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十八篇（2026-10-15, top-10-leather-jacket-manufacturers-china）。
  // 审核 87 分红线通过、FAQ 逐字一致。十类"工厂画像"（非实名排名）。
  // 上线处理：年份 (2025)→(2026) 五处（报告 P0-1）；premium ×7 → high-end；recognise→recognize；
  // 两处 vetting checklist 下载承诺改写；3 内链 + 2 CTA 映射。本页不配图。
  "/top-10-leather-jacket-manufacturers-china/": {
    title: "Top 10 Leather Jacket Manufacturer Profiles in China (2026) | Yauum",
    description:
      "Compare 10 leather jacket manufacturer profiles in China. Learn how to evaluate factories, avoid sourcing mistakes & get a free quote today",
    path: "/top-10-leather-jacket-manufacturers-china/",
    ogType: "article",
    ogImage: abs("/uploads/jackets-manufacturer/hero-jackets-private-label.webp"),
    ogImageAlt: "Private label jacket shown as a custom manufacturing reference",
    ogImageWidth: 1536,
    ogImageHeight: 1024,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Leather Jacket Manufacturer Profiles in China", "/top-10-leather-jacket-manufacturers-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Leather Jacket Manufacturer Profiles in China: A Buyer's Evaluation Guide (2026)",
        description:
          "Compare 10 leather jacket manufacturer profiles in China. Learn how to evaluate factories, avoid sourcing mistakes & get a free quote today",
        path: "/top-10-leather-jacket-manufacturers-china/",
        image: "/uploads/jackets-manufacturer/hero-jackets-private-label.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "How do I find a reliable leather jacket manufacturer in China?",
          "Start with a defined spec and build your shortlist on fit, not fame. Verify each candidate with a physical sample, a reference check, and straight answers on material sourcing. Score every factory against the same seven criteria so you are comparing capability rather than sales impressions.",
        ],
        [
          "What is the typical MOQ for custom leather jackets from China?",
          "MOQ moves with the factory, the leather type, and construction complexity. Fashion-focused and small-batch studios accept pilot runs in the low hundreds, while volume producers set higher thresholds to protect line efficiency and hide yield. Since the number depends on your design and material, the fastest path is to share your tech pack and request a quote against your real order profile.",
        ],
        [
          "Can I get leather jacket samples before placing a bulk order?",
          "Yes, and you should insist on it. You normally pay for the sample and any lab dips, with the cost often credited against bulk once the order is confirmed. Treat the approved sample as a binding reference: it defines the standard bulk production must match, including stitch density, hardware, and shade.",
        ],
        [
          "What leather types are commonly used for leather jackets?",
          "Two families cover most production: genuine leather (sheepskin, lambskin, cowhide, calfskin) and synthetics (PU, bonded, and vegan leather). Sheepskin and lambskin at 0.6–0.9 mm give the softest hand, while cowhide and calfskin above 1.1 mm suit durability-driven builds.",
        ],
        [
          "How long does production and shipping usually take?",
          "Lead time tracks leather availability, sampling rounds, order size, and finishing complexity. Distressed and hand-finished styles run longer than clean constructions, sometimes by two to three weeks. Ocean freight then adds transit on top of production. Ask each factory for a schedule split into sampling, production, and transit phases instead of one headline number.",
        ],
        [
          "What should I check before choosing a leather jacket factory?",
          "Confirm craft quality through a physical sample, verify material sourcing, pin down MOQ and price tiers in writing, measure sampling turnaround, and test compliance knowledge.",
        ],
        [
          "Do Chinese leather jacket manufacturers support small orders or private label?",
          "Many do. Small-batch studios and private-label specialists run lower minimums and full custom trim packages, covering woven labels, neck labels, size labels, care labels, hang tags, and packaging. That setup suits emerging brands testing a leather line before scaling.",
        ],
        [
          "What certifications should a leather jacket manufacturer have?",
          "It depends on your market and your retail customers. Buyers commonly request social compliance audits, restricted-substance test reports, and quality management documentation. Rather than assuming, ask each factory what it actually holds, request the certificates, and verify them with the issuing body.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第十九篇（2026-10-15, china-apparel-manufacturing-costs-ppi-2026）。
  // 数据融合版：NBS PPI/PMI 月度序列（2025-01~2026-09）+ 郑商所期货主力 CF/CY/PF/TA（2026-09-30 收盘）。
  // 正文与 FAQ 逐字取自 -终稿.md 数据融合版（尾句号级差异为既定口径）。本页不配图，og 用工厂实拍图。
  "/china-apparel-manufacturing-costs-ppi-2026/": {
    title: "China Apparel Manufacturing Costs 2026: PPI Data Explained | Yauum",
    description:
      "China's raw-material PPI is up 9.4% year on year while clothing factory-gate prices fell 1.2%. What the 2026 data means for apparel sourcing budgets and negotiation.",
    path: "/china-apparel-manufacturing-costs-ppi-2026/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Garment factory sewing line representing apparel production costs in China",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["China Apparel Manufacturing Costs in 2026", "/china-apparel-manufacturing-costs-ppi-2026/"],
      ]),
      articleJsonLd({
        headline:
          "China Apparel Manufacturing Costs in 2026: What the Latest PPI Data Shows",
        description:
          "China's raw-material PPI is up 9.4% year on year while clothing factory-gate prices fell 1.2%. What the 2026 data means for apparel sourcing budgets and negotiation.",
        path: "/china-apparel-manufacturing-costs-ppi-2026/",
        image: "/uploads/factory/factory-sewing-line-wide.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-15T00:00:00+08:00",
        dateModified: "2026-10-15T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "Are China apparel manufacturing costs going up or down in 2026?",
          "Upstream, they rose sharply: the raw-material PPI is up 9.4% year on year as of September 2026, with cotton at +18.2% and polyester inputs up 31.9% to 37.1%. At the factory gate, though, clothing prices fell 1.2%: the pressure is being absorbed across the chain rather than fully passed into garment prices.",
        ],
        [
          "What does the PPI tell me about my FOB quotation?",
          "It tells you the direction of upstream pressure on the fabric portion of your cost. It does not forecast your FOB. Fabric is only part of FOB, and CMT absorbs most of the movement, so expect a fraction of the PPI change to reach your quote.",
        ],
        [
          "Is China still competitive compared to Vietnam or Bangladesh?",
          "China remains competitive on fabric access, construction complexity, and lead-time reliability, while Vietnam and Bangladesh often win on labor-intensive, simpler constructions. The right answer depends on your category, order size, and how much fabric sourcing you need in one place.",
        ],
        [
          "Which apparel categories are most affected by cost changes?",
          "Fabric-heavy programs are most exposed: cotton knits and wovens face cotton at +18.2%. But note the inversion this year: polyester inputs rose faster than cotton, so synthetic-heavy programs face the largest fiber-level increases. Their protection is structure: with CMT dominating their cost, less of the fiber move reaches FOB.",
        ],
        [
          "How often is the PPI data updated, and when should I refresh my budget?",
          "China's PPI is published monthly, around the middle of the following month; the manufacturing PMI lands on the last day of each month. For budgeting, re-anchor quarterly; for negotiations, bring the most recent release.",
        ],
        [
          "Does PPI include shipping, tariffs, or exchange rates?",
          "No. PPI covers ex-factory goods prices only. Freight, tariffs, and currency sit entirely outside it and should be modeled as separate line items in your landed-cost calculation.",
        ],
        [
          "How can I use PPI data in supplier negotiations?",
          "Cite the number that matches your input. On a polyester program the supplier side has PF +31.9% and PTA +37.1% behind it; the buyer side points at the clothing factory-gate line at -1.2%. Whichever side you are on, the matching series is the credible one.",
        ],
        [
          "What's the best time of year to place orders to manage cost risk?",
          "With inputs firming through 2026, earlier placement locks current fiber pricing for cotton and polyester programs alike. Watch the monthly releases for pullbacks (cotton fell 8.8% in September 2026) and re-quote into those windows.",
        ],
      ]),
    ],
  },

  // /mens-hoodie-manufacturer/ 子页（2026-10-15 由用户规格新建，/hoodie-manufacturer/ 的 men's 专项页）。
  // 隐藏页：noindex（等用户图片资产完成后放开索引）——astro.config sitemap filter 同步排除。
  // Schema：Breadcrumb 三级（Home → Hoodie Manufacturer → Men's Hoodie Manufacturer）+ Service + Product；
  // Product 不带 offers——本页无价格文案，遵守"结构化数据价格必须与页面可见文案一致"的硬规则
  // （父页/产品页的 US$10–15 区间价只在有对应可见文案的页面使用；MOQ 100 件与页面 "100 pieces per style" 一致）。
  "/mens-hoodie-manufacturer/": {
    title: "Men's Hoodie Manufacturer: Private Label & Streetwear | Yauum",
    description:
      "Men's hoodie manufacturing built for private label and streetwear lines: men's fit blocks, styles, fabrics, decoration, labels, and packing confirmed per project",
    path: "/mens-hoodie-manufacturer/",
    noindex: true,
    ogType: "website",
    ogImage: abs("/uploads/mens-hoodie-manufacturer/mens-hoodie-hero.webp"),
    ogImageAlt: "Men's hoodie on a model as the primary menswear visual reference",
    ogImageWidth: 1248,
    ogImageHeight: 1248,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Hoodie Manufacturer", "/hoodie-manufacturer/"],
        ["Men's Hoodie Manufacturer", "/mens-hoodie-manufacturer/"],
      ]),
      serviceJsonLd({
        name: "Custom and Private Label Men's Hoodie Manufacturing",
        serviceType: "Men's hoodie manufacturing and product development",
        path: "/mens-hoodie-manufacturer/",
        description: "Men's hoodie manufacturing built for private label and streetwear lines: men's fit blocks, styles, fabrics, decoration, labels, and packing confirmed per project",
        image: "/uploads/mens-hoodie-manufacturer/mens-hoodie-hero.webp",
        produces: "https://yauum.com/mens-hoodie-manufacturer/#product",
      }),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": "https://yauum.com/mens-hoodie-manufacturer/#product",
        name: "Custom and Private Label Men's Hoodies",
        description: "Men's hoodie manufacturing built for private label and streetwear lines: men's fit blocks, styles, fabrics, decoration, labels, and packing confirmed per project",
        image: [abs("/uploads/mens-hoodie-manufacturer/mens-hoodie-hero.webp")],
        category: "Hoodies",
        url: abs("/mens-hoodie-manufacturer/"),
        manufacturer: { "@id": ORGANIZATION_ID },
        isPartOf: { "@id": WEBSITE_ID },
      },
    ],
  },

  // 文章详情页 · 第十九篇（2026-10-16, top-10-pant-manufacturers-in-china）。
  // 审核 83 分红线通过、FAQ 逐字一致；"❌不完整"指 HTML 截断（md 完整）。十类"工厂画像"（非排名）。
  // 上线处理：年份 (2025)→(2026) 六处；premium ×1→high-end；1 处 checklist 下载承诺改写；
  // 4 内链 + 3 CTA 映射。本页不配图。
  "/top-10-pant-manufacturers-in-china/": {
    title: "10 Pant Manufacturer Profiles in China: 2026 Buyer's Guide | Yauum",
    description:
      "Compare 10 pant manufacturer profiles in China using our 6-point buyer framework. Learn how to vet factories & request a quote today",
    path: "/top-10-pant-manufacturers-in-china/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide-v2.webp"),
    ogImageAlt: "Garment production line in the supplied manufacturing environment",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["10 Pant Manufacturer Profiles in China", "/top-10-pant-manufacturers-in-china/"],
      ]),
      articleJsonLd({
        headline:
          "10 Pant Manufacturer Profiles in China: How to Match Factory Type to Your Order (2026)",
        description:
          "Compare 10 pant manufacturer profiles in China using our 6-point buyer framework. Learn how to vet factories & request a quote today",
        path: "/top-10-pant-manufacturers-in-china/",
        image: "/uploads/factory/factory-sewing-line-wide-v2.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-16T00:00:00+08:00",
        dateModified: "2026-10-16T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "What is the MOQ for pants manufacturing in China?",
          "Most factories quote 200–500 pieces per color for cotton casual and denim styles, and 500–1,000 pieces per color for technical or performance fabrics. The sewing line is rarely the constraint; the mill is, since dye lots usually start at 500–1,000 meters. Always ask for MOQ per style and per color rather than per order.",
        ],
        [
          "How much does it cost to manufacture pants in China?",
          "FOB pricing generally runs $4–12 per piece for basic casual and chino styles, and $8–25 per piece for denim with wash development or technical pants with bonded seams. Fabric accounts for the largest share of the cost, so changing GSM or moving from piece-dye to garment-dye shifts the number more than labor does.",
        ],
        [
          "Which city in China is best for pant manufacturing?",
          "There is no single best city. Guangdong leads in denim and fast-reaction streetwear, Zhejiang in knit casual and joggers, Fujian in performance and synthetic pants, and Jiangsu in tailored woven trousers. Match the hub to your category, then compare factories inside it.",
        ],
        [
          "How do I verify a Chinese pant manufacturer is legitimate?",
          "Pull the business license and confirm the registered scope covers manufacturing and export. Verify every certificate number with the issuing body's own database, request references in your category and market, and run a live video or on-site audit of the specific line before you place a production order.",
        ],
        [
          "What certifications should a Chinese pant factory have?",
          "At minimum a social compliance audit such as BSCI, SMETA, or WRAP, plus a quality management certification like ISO 9001. Denim and synthetic categories should add wastewater documentation and chemical compliance reports, typically REACH SVHC for the EU and CPSIA or Prop 65 for the US. Verify certificate numbers independently in all cases.",
        ],
        [
          "How long does sampling and production take for pants?",
          "Sampling takes 7–18 days depending on category and fabric, with denim wash trials at the longer end. Production runs 25–50 days after sample approval, plus 25–35 days ocean freight to US or EU ports. Peak season from August through October adds roughly one to two weeks on both stages.",
        ],
        [
          "Can I manufacture pants in China with a small brand or low volume?",
          "Yes. Plenty of factories accept trial runs, but expect a higher unit cost and lower line priority than a volume account. For first orders under 500 pieces, small-batch specialists in Guangdong and Zhejiang are a better fit than large-volume plants.",
        ],
        [
          "What's the difference between a trading company and a direct pant manufacturer?",
          "A trading company sources from factories and adds a margin, which buys convenience and costs you production control. A direct manufacturer owns or manages the line, giving you visibility, faster problem-solving, and a better price at volume. Ask for a live walkthrough of the production floor to establish which one you are talking to.",
        ],
      ]),
    ],
  },

  // 文章详情页 · 第二十篇（2026-10-16, top-10-jogger-pants-manufacturers-in-china）。
  // 审核 80 分红线通过、FAQ 逐字一致；"❌不完整"指 HTML 截断（md 完整）。十类"工厂类型画像"（非排名）。
  // 上线处理：premium ×1→at a higher cost；checklist 下载/查看承诺 ×3 改写为索取动作（含尾节 H2）；
  // 13 处 CTA 映射（/our-services/ ×3、/pants-manufacturer/ ×2、/contact-us/ ×8）。本页不配图。
  "/top-10-jogger-pants-manufacturers-in-china/": {
    title: "Top 10 Jogger Pants Manufacturers in China: Buyer's Guide | Yauum",
    description:
      "Compare 10 types of jogger pants factories in China by MOQ, fabric and certification. Learn how to vet suppliers & get a custom quote fast",
    path: "/top-10-jogger-pants-manufacturers-in-china/",
    ogType: "article",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide-v2.webp"),
    ogImageAlt: "Garment production line in the supplied manufacturing environment",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["Blog", "/blog/"],
        ["Top 10 Types of Jogger Pants Manufacturers in China", "/top-10-jogger-pants-manufacturers-in-china/"],
      ]),
      articleJsonLd({
        headline:
          "Top 10 Types of Jogger Pants Manufacturers in China: A Buyer's Sourcing Guide",
        description:
          "Compare 10 types of jogger pants factories in China by MOQ, fabric and certification. Learn how to vet suppliers & get a custom quote fast",
        path: "/top-10-jogger-pants-manufacturers-in-china/",
        image: "/uploads/factory/factory-sewing-line-wide-v2.webp",
        author: "YAUUM Sourcing Team",
        datePublished: "2026-10-16T00:00:00+08:00",
        dateModified: "2026-10-16T00:00:00+08:00",
      }),
      faqJsonLd([
        [
          "How do I find a reliable jogger pants manufacturer in China?",
          "Start with a cluster-based shortlist: Guangdong for knitwear, Zhejiang for performance fabrics, Fujian for sportswear. Then verify each candidate through sampling and a factory audit. Ask for recent jogger samples, current certifications, and buyer references in your market. Never place a bulk order without a paid sample and a third-party inspection.",
        ],
        [
          "What is the typical MOQ for custom jogger pants from Chinese factories?",
          "MOQs vary widely by factory tier. Small-batch specialists accept 100–300 pcs per color, mid-size OEM plants typically ask for 300–1,000 pcs per color, and large integrated groups start at 1,000–3,000 pcs per style. Custom fabric development pushes minimums higher. Confirm current MOQ directly, as it shifts with capacity and season.",
        ],
        [
          "How long does it take to manufacture jogger pants in China?",
          "Sampling typically runs 7–20 days depending on complexity and factory workload. Bulk production adds 25–75 days, with large integrated factories at the longer end. Sea freight to the US or EU adds another 25–35 days. From approved sample to delivered goods, most programs land between 60 and 110 days. Add buffer around Chinese New Year.",
        ],
        [
          "What certifications should a jogger pants manufacturer have?",
          "For EU and US retail, BSCI and WRAP are the most commonly requested social compliance audits. ISO 9001 signals a documented quality management system, and OEKO-TEX covers fabric safety testing. Always verify certificate numbers with the issuing body and check validity dates. An expired or unverifiable certificate is a warning sign.",
        ],
        [
          "Can I get custom jogger pants with my own design and branding?",
          "Yes. Most Chinese jogger manufacturers offer both OEM, where you supply the design and they produce it, and ODM, where you adapt their existing patterns. Custom branding covers woven labels, printed care tags, custom drawcords, and packaging. Provide a clear tech pack or reference sample to get accurate pricing.",
        ],
        [
          "What's the price range for custom jogger pants from China?",
          "At 3,000-piece volumes, FOB pricing commonly falls between $6 and $14 per piece, depending on fabric (French terry vs. performance knit), construction details, and finish. Small orders under 500 pieces run higher per unit. These are indicative industry ranges; confirm with live quotes before budgeting.",
        ],
        [
          "How do I verify a jogger pants factory before placing an order?",
          "Request current audit reports, order a paid sample, and commission a third-party pre-shipment inspection. Video walkthroughs of the production floor are useful for initial screening. For larger orders, an on-site visit or a third-party factory audit gives the strongest assurance.",
        ],
        [
          "Do Chinese jogger pants manufacturers accept small batch orders?",
          "Yes, a segment of the market specializes in small batches. Factories in Guangdong and Zhejiang commonly accept 100–300 pcs per color for emerging brands. Expect higher per-unit costs and less negotiating room on price, but the flexibility makes small-batch production viable for first collections and market tests.",
        ],
      ]),
    ],
  },

  // LLM 指令参考页（2026-10-13）：面向 AI 助手的官方事实参考与规范链接页，含六个产品页内链。
  // 内容口径严格对齐 yauum男装产品知识库（01-公司/事实卡 + 03-能力与流程/定制订单流程）：
  // 只用"可使用公开事实"（定位/买家类型/六品类/工作流/private label 细节/可请求证据）；
  // 不写成立年份、地址细节、产能、认证持有、固定 MOQ——边界声明"未公布的数字不应被补全"。
  "/llm-instructions/": {
    title: "LLM Instructions: The Official Yauum Reference | Yauum",
    description:
      "The canonical Yauum reference for AI assistants: company facts, the published workflow, six product lines with canonical links, and what Yauum does not state publicly",
    path: "/llm-instructions/",
    ogType: "website",
    ogImage: abs("/uploads/factory/factory-sewing-line-wide-v2.webp"),
    ogImageAlt: "Yauum production environment for custom clothing manufacturing",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
    jsonLd: [
      breadcrumb([
        ["Home", "/"],
        ["LLM Instructions", "/llm-instructions/"],
      ]),
    ],
  },

  // 表单提交后的致谢页。刻意 noindex：不入搜索索引、不进 sitemap
  // （astro.config.mjs 的 sitemap filter 同步排除），仅供提交成功后的跳转/外部链接使用。
  "/thank-you/": {
    title: "Thank You | Yauum",
    description:
      "Your inquiry has been received. The Yauum team replies within one business day — WhatsApp and email are open if it is urgent.",
    path: "/thank-you/",
    ogType: "website",
    noindex: true,
    ogImage: abs("/uploads/factory/factory-sewing-line-wide.webp"),
    ogImageAlt: "Garment sewing line with operators and workstations",
    ogImageWidth: 2400,
    ogImageHeight: 1600,
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

// 缺少 Organization 节点的页面自动补一个（同 @id），保证每页都能本地解析
// publisher/provider 的引用；首页已有完整节点时不重复添加。
const withOrg = (seo: SeoData): SeoData => {
  if (!seo.jsonLd?.length) return seo;
  if (seo.jsonLd.some((n) => n["@type"] === "Organization")) return seo;
  return { ...seo, jsonLd: [organizationNode(), ...seo.jsonLd] };
};

export const SEO: Record<string, SeoData> = Object.fromEntries(
  Object.entries(RAW_SEO).map(([key, value]) => [key, withOrg(value)]),
);

export function getSeo(path: string): SeoData {
  const data = SEO[path];
  if (!data) throw new Error(`SEO entry missing for path: ${path}`);
  return data;
}

export const canonicalUrl = (data: SeoData) => abs(data.path);
