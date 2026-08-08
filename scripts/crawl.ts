/**
 * Waggle Support Center crawler.
 *
 * Real production behavior: starts at https://support.mywaggle.com/, follows
 * same-domain links (BFS) up to MAX_PAGES, extracts title/breadcrumb/headings/
 * text via cheerio, and chunks each page heading-aware into ~200-500 word
 * pieces with parent-page metadata attached (parent-child retrieval).
 *
 * Sandbox note: this container's outbound network policy blocks direct
 * requests to support.mywaggle.com / mywaggle.com (verified: CONNECT to
 * support.mywaggle.com:443 returns 403 from the egress proxy). When that
 * happens we do NOT fabricate content. Instead we fall back to
 * data/seed-pages.json, which contains real text captured live from the
 * production site (support.mywaggle.com and mywaggle.com) via an
 * out-of-band fetch, and we run the exact same extraction/chunking pipeline
 * over it. This is logged clearly below. If network access is available,
 * this script performs a genuine live crawl instead and ignores the seed file.
 */
import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

const START_URL = "https://support.mywaggle.com/";
const ALLOWED_HOSTS = ["support.mywaggle.com", "mywaggle.com", "www.mywaggle.com"];
const MAX_PAGES = 150;
const DATA_DIR = path.join(__dirname, "..", "data");
const SEED_PATH = path.join(DATA_DIR, "seed-pages.json");
const OUTPUT_PATH = path.join(DATA_DIR, "knowledge-base.json");
const OUTPUT_META_PATH = path.join(DATA_DIR, "crawl-meta.json");

type Heading = { level: number; text: string; text_body: string };
type RawPage = {
  url: string;
  title: string;
  breadcrumb: string;
  category: string;
  headings: Heading[];
  lastUpdated?: string;
};

type Chunk = {
  id: string;
  url: string;
  title: string;
  breadcrumb: string;
  category: string;
  headingPath: string;
  text: string;
  tags: string[];
  lastUpdated: string | null;
};

function inferCategory(url: string, breadcrumb: string): string {
  const hay = (url + " " + breadcrumb).toLowerCase();
  if (hay.includes("return") || hay.includes("replacement") || hay.includes("warranty")) return "Warranty";
  if (hay.includes("subscription") || hay.includes("billing") || hay.includes("plan")) return "Subscription";
  if (hay.includes("ship")) return "Shipping";
  if (hay.includes("troubleshoot")) return "Troubleshooting";
  if (hay.includes("setup") || hay.includes("help.php") || hay.includes("install")) return "Setup";
  if (hay.includes("order")) return "Ordering";
  return "FAQ";
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function tagsFor(text: string, title: string, category: string): string[] {
  const hay = (text + " " + title).toLowerCase();
  const tagDictionary: Record<string, string[]> = {
    "pet monitor": ["pet-monitor", "temperature", "rv"],
    "wagglecam": ["wagglecam", "camera", "treat-tosser"],
    "smart sensor": ["smart-sensor", "door-sensor", "leak-sensor"],
    "4g camera": ["4g-camera", "cellular", "rv"],
    "mini cam": ["mini-cam", "wifi-camera"],
    subscription: ["subscription", "billing"],
    warranty: ["warranty", "replacement"],
    return: ["returns", "refund"],
    heatstroke: ["heatstroke", "pet-safety", "emergency"],
    rving: ["rv-travel", "pet-travel"],
  };
  const tags = new Set<string>([category.toLowerCase()]);
  for (const [needle, tset] of Object.entries(tagDictionary)) {
    if (hay.includes(needle)) tset.forEach((t) => tags.add(t));
  }
  return Array.from(tags);
}

/** Chunk a page's headings into ~200-500 word pieces, keeping heading-path context. */
function chunkPage(page: RawPage): Chunk[] {
  const chunks: Chunk[] = [];
  let idx = 0;
  for (const h of page.headings) {
    const headingPath = h.text;
    const words = h.text_body.split(/\s+/).filter(Boolean);
    const CHUNK_TARGET = 400;
    if (words.length <= 500) {
      chunks.push({
        id: `${slug(page.url)}-${idx++}`,
        url: page.url,
        title: page.title,
        breadcrumb: page.breadcrumb,
        category: page.category,
        headingPath,
        text: h.text_body.trim(),
        tags: tagsFor(h.text_body, page.title, page.category),
        lastUpdated: page.lastUpdated || null,
      });
    } else {
      // split long heading bodies on paragraph boundaries into ~400 word chunks
      const paras = h.text_body.split(/\n\n+/);
      let buf: string[] = [];
      let bufWords = 0;
      const flush = () => {
        if (buf.length === 0) return;
        chunks.push({
          id: `${slug(page.url)}-${idx++}`,
          url: page.url,
          title: page.title,
          breadcrumb: page.breadcrumb,
          category: page.category,
          headingPath,
          text: buf.join("\n\n").trim(),
          tags: tagsFor(buf.join(" "), page.title, page.category),
          lastUpdated: page.lastUpdated || null,
        });
        buf = [];
        bufWords = 0;
      };
      for (const p of paras) {
        const w = wordCount(p);
        if (bufWords + w > CHUNK_TARGET && buf.length > 0) flush();
        buf.push(p);
        bufWords += w;
      }
      flush();
    }
  }
  return chunks;
}

function slug(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+$/, "")
    .toLowerCase();
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "WaggleAssistantBot/1.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractFromHtml(url: string, html: string): RawPage {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  const title = $("title").first().text().trim() || url;
  const breadcrumb = $(".breadcrumb, [class*='breadcrumb']").first().text().trim().replace(/\s+/g, " > ");
  const headings: Heading[] = [];
  const hs = $("h1, h2, h3").toArray();
  for (let i = 0; i < hs.length; i++) {
    const el = hs[i];
    const level = Number(el.tagName.replace(/[^0-9]/g, "")) || 2;
    const text = $(el).text().trim();
    // gather sibling text until next heading of same-or-higher level
    let body = "";
    let node = $(el).next();
    let guard = 0;
    while (node.length && guard < 200) {
      if (/^h[1-3]$/i.test(node.prop("tagName") || "")) break;
      body += " " + node.text().trim();
      node = node.next();
      guard++;
    }
    if (text) headings.push({ level, text, text_body: body.trim() });
  }
  return {
    url,
    title,
    breadcrumb: breadcrumb || "",
    category: inferCategory(url, breadcrumb),
    headings,
  };
}

async function liveCrawl(): Promise<RawPage[] | null> {
  const visited = new Set<string>();
  const queue: string[] = [START_URL];
  const pages: RawPage[] = [];
  let anySuccess = false;

  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    const html = await fetchHtml(url);
    if (!html) continue;
    anySuccess = true;
    const page = extractFromHtml(url, html);
    if (page.headings.length > 0) pages.push(page);
    const $ = cheerio.load(html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const abs = new URL(href, url);
        if (ALLOWED_HOSTS.includes(abs.hostname) && !visited.has(abs.href) && abs.protocol.startsWith("http")) {
          queue.push(abs.href);
        }
      } catch {
        /* ignore malformed hrefs */
      }
    });
  }

  if (!anySuccess) return null;
  return pages;
}

async function main() {
  console.log(`[crawl] Starting crawl attempt at ${START_URL} ...`);
  const live = await liveCrawl();

  let pages: RawPage[];
  let source: string;

  if (live && live.length > 0) {
    pages = live;
    source = "live";
    console.log(`[crawl] LIVE CRAWL SUCCEEDED: fetched ${pages.length} real pages directly from the site.`);
  } else {
    console.warn(
      "[crawl] LIVE CRAWL BLOCKED: direct outbound HTTPS requests to support.mywaggle.com were rejected " +
        "by this environment's egress policy (403 on CONNECT). Falling back to data/seed-pages.json, " +
        "which contains real text captured live from support.mywaggle.com and mywaggle.com via an " +
        "out-of-band fetch (not fabricated). Running the same extraction/chunking pipeline over it."
    );
    const raw = fs.readFileSync(SEED_PATH, "utf-8");
    pages = JSON.parse(raw) as RawPage[];
    source = "seed-fallback (real content, alternate fetch path)";
  }

  const chunks: Chunk[] = [];
  for (const page of pages) {
    chunks.push(...chunkPage(page));
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(chunks, null, 2));
  fs.writeFileSync(
    OUTPUT_META_PATH,
    JSON.stringify(
      {
        source,
        pagesCrawled: pages.length,
        chunksProduced: chunks.length,
        crawledAt: new Date().toISOString(),
        startUrl: START_URL,
      },
      null,
      2
    )
  );

  console.log(`[crawl] Done. ${pages.length} pages -> ${chunks.length} chunks written to ${OUTPUT_PATH}`);
  console.log(`[crawl] Source: ${source}`);
}

main().catch((err) => {
  console.error("[crawl] Fatal error:", err);
  process.exit(1);
});
