import { LRUCache } from "./lruCache";

type MermaidTheme = "light" | "dark";

interface CachedMermaidSvg {
  readonly svg: string;
  readonly rootId: string;
}

const mermaidSvgCache = new LRUCache<CachedMermaidSvg>(200, 20 * 1024 * 1024);
let mermaidModulePromise: Promise<typeof import("mermaid")> | null = null;
let initializedTheme: MermaidTheme | null = null;
let renderCount = 0;

function cacheKey(source: string, theme: MermaidTheme): string {
  return `${theme}:${source}`;
}

function nextId(): string {
  renderCount += 1;
  return `t3m_${renderCount}_`;
}

function cloneSvg(entry: CachedMermaidSvg): string {
  return entry.svg.replaceAll(entry.rootId, nextId());
}

function loadMermaid(): Promise<typeof import("mermaid")> {
  mermaidModulePromise ??= import("mermaid").catch((error: unknown) => {
    mermaidModulePromise = null;
    throw error;
  });
  return mermaidModulePromise;
}

export function getCachedMermaidSvg(source: string, theme: MermaidTheme): string | null {
  const cached = mermaidSvgCache.get(cacheKey(source, theme));
  return cached === null ? null : cloneSvg(cached);
}

export async function renderMermaidSvg(source: string, theme: MermaidTheme): Promise<string> {
  const cached = mermaidSvgCache.get(cacheKey(source, theme));
  if (cached !== null) return cloneSvg(cached);

  const mermaid = (await loadMermaid()).default;
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      htmlLabels: false,
      theme: theme === "dark" ? "dark" : "neutral",
      flowchart: { useMaxWidth: false },
      sequence: { useMaxWidth: false },
      class: { useMaxWidth: false },
      state: { useMaxWidth: false },
      er: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      pie: { useMaxWidth: false },
      gitGraph: { useMaxWidth: false },
      mindmap: { useMaxWidth: false },
    });
    initializedTheme = theme;
  }

  const rootId = nextId();
  const { svg } = await mermaid.render(rootId, source);
  mermaidSvgCache.set(cacheKey(source, theme), { svg, rootId }, svg.length * 2);
  return svg;
}

export function resetMermaidRendererForTests(): void {
  mermaidModulePromise = null;
  initializedTheme = null;
  renderCount = 0;
  mermaidSvgCache.clear();
}
