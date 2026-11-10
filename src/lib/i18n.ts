// 多语言（de / fr / es）路由与 hreflang 的唯一来源。
//
// URL 约定：英文保持在根路径（/hoodie-manufacturer/），小语种加前缀
// （/de/hoodie-manufacturer/），默认语言不前缀——与眼镜站一致，也和
// Google 推荐的「每种语言一个唯一 URL」相符。
//
// 只有 src/i18n/config.json 里 localizedPaths 列出的页面才会生成小语种版本；
// 文章等纯英文内容不参与，避免机翻长文稀释收录质量。新增可翻译页面时
// 只需在 config.json 里加一行，路由、hreflang、内链前缀会自动跟上。
import config from "../i18n/config.json";
import { SITE } from "./seo";

export const LOCALES = config.locales as readonly ("de" | "fr" | "es")[];
export type Locale = (typeof LOCALES)[number];
export type AnyLocale = "en" | Locale;
export const DEFAULT_LOCALE: AnyLocale = "en";

export const LOCALE_META: Record<
  AnyLocale,
  { label: string; short: string; ogLocale: string }
> = {
  en: { label: "English", short: "EN", ogLocale: "en_US" },
  de: { label: "Deutsch", short: "DE", ogLocale: "de_DE" },
  fr: { label: "Français", short: "FR", ogLocale: "fr_FR" },
  es: { label: "Español", short: "ES", ogLocale: "es_ES" },
};

const LOCALIZED = new Set(config.localizedPaths as string[]);
const LOCALE_RE = /^\/(de|fr|es)(?=\/|$)/;

/** 去掉语言前缀，返回英文规范路径（始终以 / 开头、以 / 结尾） */
export function stripLocale(pathname: string): string {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  const rest = clean.replace(LOCALE_RE, "");
  const withSlash = rest.startsWith("/") ? rest : `/${rest}`;
  return withSlash === "" ? "/" : withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

/** 当前 URL 属于哪种语言 */
export function localeFromPathname(pathname: string): AnyLocale {
  const match = (pathname || "").match(LOCALE_RE);
  return (match?.[1] as Locale) ?? "en";
}

/** 把英文规范路径翻译成目标语言的 URL */
export function localizePath(path: string, locale: AnyLocale): string {
  const base = stripLocale(path);
  if (locale === "en") return base;
  return base === "/" ? `/${locale}/` : `/${locale}${base}`;
}

/** 该路径是否存在小语种版本 */
export function isLocalizedPath(pathname: string): boolean {
  return LOCALIZED.has(stripLocale(pathname));
}

/** 当前 URL 的 canonical（保留语言前缀，只补齐结尾斜杠） */
export function canonicalFor(pathname: string): string {
  return `${SITE.origin}${normalize(pathname)}`;
}

function normalize(pathname: string): string {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  if (clean === "") return "/";
  return clean.endsWith("/") ? clean : `${clean}/`;
}

/** hreflang 集合：只有可翻译页面才输出，避免指向不存在的 /de/ 等地址 */
export function alternatesFor(
  pathname: string,
): { hreflang: string; href: string }[] | null {
  const base = stripLocale(pathname);
  if (!LOCALIZED.has(base)) return null;
  const english = `${SITE.origin}${base}`;
  return [
    { hreflang: "en", href: english },
    ...LOCALES.map((locale) => ({
      hreflang: locale,
      href: `${SITE.origin}${localizePath(base, locale)}`,
    })),
    { hreflang: "x-default", href: english },
  ];
}
