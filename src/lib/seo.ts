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
//   - 邮箱 mumu@yauum.com、电话/WhatsApp +8615733728976：全站联系方式
//   - 不写认证、产能、MOQ 数值、交期、客户案例、社媒账号（未确认/未搭建）。

export const SITE = {
  origin: "https://yauum.com",
  name: "Yauum",
  /** 搜索结果里显示的站点名称（Google「站点名称」取自首页 WebSite 结构化数据与 og:site_name） */
  siteName: "Yauum Garment",
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
