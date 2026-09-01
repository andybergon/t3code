import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock("mermaid", () => ({ default: mermaid }));

import {
  getCachedMermaidSvg,
  renderMermaidSvg,
  resetMermaidRendererForTests,
} from "./mermaidRenderer";

describe("renderMermaidSvg", () => {
  beforeEach(() => {
    resetMermaidRendererForTests();
    mermaid.initialize.mockReset();
    mermaid.render.mockReset();
  });

  it("renders with strict security and caches independent svg ids", async () => {
    mermaid.render.mockImplementation(async (id: string) => ({
      svg: `<svg id="${id}"><use href="#${id}-marker"/></svg>`,
    }));

    const first = await renderMermaidSvg("flowchart TD\n  A --> B", "dark");
    const second = await renderMermaidSvg("flowchart TD\n  A --> B", "dark");
    const cached = getCachedMermaidSvg("flowchart TD\n  A --> B", "dark");

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: "strict", suppressErrorRendering: true }),
    );
    expect(mermaid.render).toHaveBeenCalledTimes(1);
    expect(first).toContain("t3m_1_");
    expect(second).toContain("t3m_2_");
    expect(cached).toContain("t3m_3_");
  });

  it("reinitializes for a changed theme and surfaces parse failures", async () => {
    mermaid.render.mockResolvedValue({ svg: "<svg />" });
    await renderMermaidSvg("flowchart TD", "dark");
    await renderMermaidSvg("flowchart LR", "light");
    expect(mermaid.initialize).toHaveBeenCalledTimes(2);

    mermaid.render.mockRejectedValueOnce(new Error("Parse error"));
    await expect(renderMermaidSvg("invalid", "light")).rejects.toThrow("Parse error");
  });
});
