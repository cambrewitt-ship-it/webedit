import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Client } from "@/config/clients";
import { sessionOptions, SessionData } from "@/lib/session";
import { readJsonFile } from "@/lib/github";

const CLIENTS_FILE = "data/clients.json";

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/x-icon", bmp: "image/bmp", avif: "image/avif",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return map[ext] ?? "application/octet-stream";
}

function isLocalUrl(src: string): boolean {
  const s = src.trim();
  return !!s &&
    !s.startsWith("data:") &&
    !s.startsWith("http://") &&
    !s.startsWith("https://") &&
    !s.startsWith("//") &&
    !s.startsWith("#") &&
    !s.startsWith("mailto:") &&
    !s.startsWith("tel:") &&
    !s.startsWith("javascript:");
}

function cleanPath(src: string): string {
  const withoutQuery = src.split("?")[0].split("#")[0];
  return withoutQuery.startsWith("/") ? withoutQuery.slice(1) : withoutQuery;
}

async function fetchRaw(repo: string, branch: string, token: string, path: string): Promise<ArrayBuffer | null> {
  const p = cleanPath(path);
  if (!p) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${p}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.raw",
        "Cache-Control": "no-cache",
      },
    });
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function toDataUrl(repo: string, branch: string, token: string, path: string): Promise<string | null> {
  const buf = await fetchRaw(repo, branch, token, path);
  if (!buf) return null;
  return `data:${getMimeType(cleanPath(path))};base64,${Buffer.from(buf).toString("base64")}`;
}

async function embedAssets(html: string, repo: string, branch: string, token: string): Promise<string> {
  const assetPaths = new Set<string>();
  const cssHrefs = new Set<string>();

  // Collect local asset src/poster attributes
  for (const m of html.matchAll(/(?:src|poster)=["']([^"']+)["']/gi)) {
    if (isLocalUrl(m[1])) assetPaths.add(m[1].trim());
  }
  // Collect CSS url() in inline styles / style blocks
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi)) {
    if (isLocalUrl(m[1])) assetPaths.add(m[1].trim());
  }
  // Collect linked stylesheet hrefs
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    if (href && isLocalUrl(href) && /rel=["']stylesheet["']/i.test(attrs)) {
      cssHrefs.add(href.trim());
    }
  }

  // Fetch images + CSS in parallel
  const [imgResults, cssResults] = await Promise.all([
    Promise.all([...assetPaths].map(async (p) => [p, await toDataUrl(repo, branch, token, p)] as const)),
    Promise.all([...cssHrefs].map(async (href) => {
      const buf = await fetchRaw(repo, branch, token, href);
      return [href, buf ? Buffer.from(buf).toString("utf-8") : null] as const;
    })),
  ]);

  const assetMap = new Map(imgResults.filter(([, v]) => v !== null) as [string, string][]);

  // Collect image references from CSS files, then fetch those too
  const cssImagePaths = new Set<string>();
  for (const [, css] of cssResults) {
    if (!css) continue;
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi)) {
      if (isLocalUrl(m[1])) cssImagePaths.add(m[1].trim());
    }
  }
  const cssImgResults = await Promise.all([...cssImagePaths].map(async (p) => [p, await toDataUrl(repo, branch, token, p)] as const));
  for (const [p, d] of cssImgResults) {
    if (d) assetMap.set(p, d);
  }

  // Inline CSS files (with their url() replaced by data URIs)
  const inlinedCss = new Map<string, string>();
  for (const [href, css] of cssResults) {
    if (!css) continue;
    inlinedCss.set(href, css.replace(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi, (match, val) => {
      const d = assetMap.get(val.trim());
      return d ? `url('${d}')` : match;
    }));
  }

  // Replace <link stylesheet> with <style>
  html = html.replace(/<link\b([^>]*)>/gi, (match, attrs) => {
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1]?.trim();
    if (href && inlinedCss.has(href)) {
      return `<style>${inlinedCss.get(href)}</style>`;
    }
    return match;
  });

  // Replace src/poster with data URIs
  html = html.replace(/((?:src|poster)=["'])([^"']+)(["'])/gi, (match, pre, val, post) => {
    const d = assetMap.get(val.trim());
    return d ? `${pre}${d}${post}` : match;
  });

  // Replace CSS url() in inline styles
  html = html.replace(/url\(\s*["']?([^"')]+?)["']?\s*\)/gi, (match, val) => {
    const d = assetMap.get(val.trim());
    return d ? `url('${d}')` : match;
  });

  return html;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await request.json();

    const clientId = session.clientId;
    const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
    const client = clientsFile?.data.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const githubRepo = client.githubRepo.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").trim();
    const { githubBranch } = client;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${filename}?ref=${githubBranch}`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3.raw",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      if (response.status === 401) detail = "GitHub token is invalid or expired.";
      else if (response.status === 403) detail = "GitHub token lacks access to this repo.";
      else if (response.status === 404) detail = `File not found in GitHub repo (${githubRepo}/${filename} on branch ${githubBranch}). Check repo name, branch, and filename.`;
      console.error("GitHub fetch failed:", detail, apiUrl);
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const rawHtml = await response.text();
    const html = await embedAssets(rawHtml, githubRepo, githubBranch, githubToken);

    return NextResponse.json({ html });
  } catch (error) {
    console.error("Fetch page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
