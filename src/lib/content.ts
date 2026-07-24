import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

export type PageEntry = {
  slug: string;
  label: string;
  route: string;
  url: string;
  title: string;
  copyFile: string;
};

export type WebsitePage = PageEntry & {
  headline: string;
  description: string;
  html: string;
  sections: PageSection[];
};

export type PageSection = {
  title: string;
  html: string;
};

const libraryRoot = path.resolve(process.cwd(), "../yauum-site-content");

export async function getPageManifest(): Promise<PageEntry[]> {
  const manifest = await readFile(path.join(libraryRoot, "manifest.json"), "utf8");
  return JSON.parse(manifest) as PageEntry[];
}

function extractBody(markdown: string) {
  return markdown.split(/\n## Current page copy\s*\n/i)[1]?.trim() ?? markdown.trim();
}

function extractHeadline(body: string, fallback: string) {
  return body.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function removeFirstHeading(body: string) {
  return body.replace(/^#{1,6}\s+.+\n*/m, "").trim();
}

function removeKnownLegacyCopy(body: string) {
  return body
    .replace(/^- Weekly Community Runs\s*$/gim, "")
    .replace(/^- Personalized Training Support\s*$/gim, "")
    .replace(/^- Open to All Ages & Skill Levels\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDescription(body: string) {
  const paragraph = body
    .split(/\n{2,}/)
    .map(part => part.trim())
    .find(part => part && !part.startsWith("#") && !part.startsWith("-") && !part.startsWith("**Button:"));
  return paragraph?.replace(/[*_`]/g, "") ?? "Private label menswear development and manufacturing information from Yauum.";
}

async function buildSections(body: string): Promise<PageSection[]> {
  const headingPattern = /^###\s+(.+)$/gm;
  const headings = Array.from(body.matchAll(headingPattern));
  const sections: Array<{ title: string; markdown: string }> = [];

  if (!headings.length) {
    return [{ title: "Page information", html: await marked.parse(body) }];
  }

  const introduction = body.slice(0, headings[0].index).trim();
  if (introduction) sections.push({ title: "Product overview", markdown: introduction });

  headings.forEach((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    sections.push({ title: heading[1].trim(), markdown: body.slice(start, end).trim() });
  });

  return Promise.all(sections.map(async section => ({
    title: section.title,
    html: await marked.parse(section.markdown),
  })));
}

export async function getWebsitePage(slug: string): Promise<WebsitePage> {
  const manifest = await getPageManifest();
  const entry = manifest.find(page => page.slug === slug);
  if (!entry) throw new Error(`Unknown page slug: ${slug}`);
  const markdown = await readFile(path.join(libraryRoot, entry.copyFile), "utf8");
  const body = extractBody(markdown);
  const bodyWithoutHeading = removeKnownLegacyCopy(removeFirstHeading(body));
  return {
    ...entry,
    headline: extractHeadline(body, entry.label),
    description: extractDescription(bodyWithoutHeading),
    html: await marked.parse(bodyWithoutHeading),
    sections: await buildSections(bodyWithoutHeading),
  };
}
