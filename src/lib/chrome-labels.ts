// 页头/页脚固定文案的多语言版本。
//
// 导航与页脚出现在每个页面、也是 Google 判断语言一致性最直接的位置，
// 因此不交给机器翻译，而是人工固定，保证三种语言的用词统一：
//   de: Kapuzenpullover / Jacken / Hosen …（而不是被逐页翻成不同变体）
//   fr: Sweats à capuche / Vestes / Pantalons …
//   es: Sudaderas / Chaquetas / Pantalones …
// 页面正文仍由 scripts/i18n/translate.mjs 处理。
import type { AnyLocale } from "./i18n";

export type ChromeLabels = {
  skipToContent: string;
  home: string;
  ourServices: string;
  solutions: string;
  production: string;
  about: string;
  blog: string;
  sendInquiry: string;
  productionOverview: string;
  product: string;
  hoodies: string;
  tshirts: string;
  jackets: string;
  pants: string;
  sportswear: string;
  streetwear: string;
  company: string;
  products1: string;
  products2: string;
  contactYauum: string;
  footerIntro: string;
  copyright: string;
  aiReference: string;
  primaryNav: string;
  mobileNav: string;
  productCategories: string;
  openMenu: string;
  closeMenu: string;
  siteMenu: string;
  backToTop: string;
  language: string;
  brandHome: string;
  directContactOptions: string;
  chatWhatsApp: string;
  emailYauum: string;
  directContactDetails: string;
  companyLinks: string;
  productLinks1: string;
  productLinks2: string;
  showProductCategories: string;
};

const EN: ChromeLabels = {
  skipToContent: "Skip to content",
  home: "Home",
  ourServices: "Our Services",
  solutions: "Solutions",
  production: "Production",
  about: "About",
  blog: "Blog",
  sendInquiry: "Send an inquiry",
  productionOverview: "Production overview",
  product: "PRODUCT",
  hoodies: "Hoodies",
  tshirts: "T-Shirts",
  jackets: "Jackets",
  pants: "Pants",
  sportswear: "Sportswear",
  streetwear: "Streetwear",
  company: "Company",
  products1: "Products / 01–03",
  products2: "Products / 04–06",
  contactYauum: "Contact Yauum ↗",
  footerIntro:
    "B2B menswear and streetwear development, sampling, private label execution, quality checks, packing, and shipment preparation for buyers in the United States, Europe, Australia, and the Middle East",
  copyright: "Copyright © 2026 Dongguan Yauum Apparel Co., Ltd. All rights reserved",
  aiReference: "AI & crawler reference",
  primaryNav: "Primary navigation",
  mobileNav: "Mobile primary navigation",
  productCategories: "Production product categories",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  siteMenu: "Site menu",
  backToTop: "Back to top",
  language: "Language",
  brandHome: "Yauum home",
  directContactOptions: "Direct contact options",
  chatWhatsApp: "Chat with Yauum on WhatsApp",
  emailYauum: "Email Yauum",
  directContactDetails: "Direct contact details",
  companyLinks: "Company links",
  productLinks1: "Product links 01–03",
  productLinks2: "Product links 04–06",
  showProductCategories: "Show production categories",
};

const DE: ChromeLabels = {
  ...EN,
  skipToContent: "Zum Inhalt springen",
  home: "Startseite",
  ourServices: "Unsere Leistungen",
  solutions: "Lösungen",
  production: "Produktion",
  about: "Über uns",
  blog: "Blog",
  sendInquiry: "Anfrage senden",
  productionOverview: "Produktionsübersicht",
  product: "PRODUKT",
  hoodies: "Kapuzenpullover",
  tshirts: "T-Shirts",
  jackets: "Jacken",
  pants: "Hosen",
  sportswear: "Sportbekleidung",
  streetwear: "Streetwear",
  company: "Unternehmen",
  products1: "Produkte / 01–03",
  products2: "Produkte / 04–06",
  contactYauum: "Yauum kontaktieren ↗",
  footerIntro:
    "B2B-Entwicklung von Herrenmode und Streetwear, Musterfertigung, Private-Label-Umsetzung, Qualitätskontrollen, Verpackung und Versandvorbereitung für Einkäufer in den USA, Europa, Australien und dem Nahen Osten",
  copyright: "Copyright © 2026 Dongguan Yauum Apparel Co., Ltd. Alle Rechte vorbehalten",
  aiReference: "KI- & Crawler-Referenz",
  primaryNav: "Hauptnavigation",
  mobileNav: "Mobile Hauptnavigation",
  productCategories: "Produktkategorien",
  openMenu: "Menü öffnen",
  closeMenu: "Menü schließen",
  siteMenu: "Seitenmenü",
  backToTop: "Nach oben",
  language: "Sprache",
  brandHome: "Yauum Startseite",
  directContactOptions: "Direkte Kontaktmöglichkeiten",
  chatWhatsApp: "Mit Yauum auf WhatsApp chatten",
  emailYauum: "E-Mail an Yauum",
  directContactDetails: "Direkte Kontaktdaten",
  companyLinks: "Unternehmenslinks",
  productLinks1: "Produktlinks 01–03",
  productLinks2: "Produktlinks 04–06",
  showProductCategories: "Produktkategorien anzeigen",
};

const FR: ChromeLabels = {
  ...EN,
  skipToContent: "Passer au contenu",
  home: "Accueil",
  ourServices: "Nos prestations",
  solutions: "Solutions",
  production: "Fabrication",
  about: "À propos",
  blog: "Blog",
  sendInquiry: "Envoyer une demande",
  productionOverview: "Aperçu de la fabrication",
  product: "PRODUIT",
  hoodies: "Sweats à capuche",
  tshirts: "T-shirts",
  jackets: "Vestes",
  pants: "Pantalons",
  sportswear: "Vêtements de sport",
  streetwear: "Streetwear",
  company: "Entreprise",
  products1: "Produits / 01–03",
  products2: "Produits / 04–06",
  contactYauum: "Contacter Yauum ↗",
  footerIntro:
    "Développement de prêt-à-porter masculin et de streetwear en B2B, échantillonnage, exécution de marque privée, contrôles qualité, emballage et préparation d'expédition pour les acheteurs aux États-Unis, en Europe, en Australie et au Moyen-Orient",
  copyright: "Copyright © 2026 Dongguan Yauum Apparel Co., Ltd. Tous droits réservés",
  aiReference: "Référence IA & robots",
  primaryNav: "Navigation principale",
  mobileNav: "Navigation mobile",
  productCategories: "Catégories de produits",
  openMenu: "Ouvrir le menu",
  closeMenu: "Fermer le menu",
  siteMenu: "Menu du site",
  backToTop: "Haut de page",
  language: "Langue",
  brandHome: "Accueil Yauum",
  directContactOptions: "Options de contact direct",
  chatWhatsApp: "Discuter avec Yauum sur WhatsApp",
  emailYauum: "E-mail à Yauum",
  directContactDetails: "Coordonnées directes",
  companyLinks: "Liens entreprise",
  productLinks1: "Liens produits 01–03",
  productLinks2: "Liens produits 04–06",
  showProductCategories: "Afficher les catégories de produits",
};

const ES: ChromeLabels = {
  ...EN,
  skipToContent: "Ir al contenido",
  home: "Inicio",
  ourServices: "Nuestros servicios",
  solutions: "Soluciones",
  production: "Producción",
  about: "Nosotros",
  blog: "Blog",
  sendInquiry: "Enviar consulta",
  productionOverview: "Resumen de producción",
  product: "PRODUCTO",
  hoodies: "Sudaderas con capucha",
  tshirts: "Camisetas",
  jackets: "Chaquetas",
  pants: "Pantalones",
  sportswear: "Ropa deportiva",
  streetwear: "Streetwear",
  company: "Empresa",
  products1: "Productos / 01–03",
  products2: "Productos / 04–06",
  contactYauum: "Contactar con Yauum ↗",
  footerIntro:
    "Desarrollo B2B de ropa masculina y streetwear, muestreo, ejecución de marca blanca, controles de calidad, embalaje y preparación de envíos para compradores en Estados Unidos, Europa, Australia y Oriente Medio",
  copyright: "Copyright © 2026 Dongguan Yauum Apparel Co., Ltd. Todos los derechos reservados",
  aiReference: "Referencia para IA y rastreadores",
  primaryNav: "Navegación principal",
  mobileNav: "Navegación móvil",
  productCategories: "Categorías de productos",
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  siteMenu: "Menú del sitio",
  backToTop: "Volver arriba",
  language: "Idioma",
  brandHome: "Inicio de Yauum",
  directContactOptions: "Opciones de contacto directo",
  chatWhatsApp: "Chatea con Yauum en WhatsApp",
  emailYauum: "Enviar correo a Yauum",
  directContactDetails: "Datos de contacto directo",
  companyLinks: "Enlaces de la empresa",
  productLinks1: "Enlaces de productos 01–03",
  productLinks2: "Enlaces de productos 04–06",
  showProductCategories: "Mostrar categorías de productos",
};

const LABELS: Record<AnyLocale, ChromeLabels> = { en: EN, de: DE, fr: FR, es: ES };

export const chromeLabels = (locale: AnyLocale): ChromeLabels => LABELS[locale];
