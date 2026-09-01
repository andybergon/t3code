import { describe, expect, it } from "vite-plus/test";

import { isMermaidFenceLanguage, mermaidClipboardMarkdown } from "./mermaidLanguage";

describe("isMermaidFenceLanguage", () => {
  it("recognizes mermaid and mmd fences", () => {
    expect(isMermaidFenceLanguage("mermaid")).toBe(true);
    expect(isMermaidFenceLanguage("MERMAID")).toBe(true);
    expect(isMermaidFenceLanguage(" mmd ")).toBe(true);
    expect(isMermaidFenceLanguage("typescript")).toBe(false);
  });
});

describe("mermaidClipboardMarkdown", () => {
  it("preserves the source as a safe markdown fence", () => {
    expect(mermaidClipboardMarkdown("flowchart TD\n  A --> B", "mermaid")).toBe(
      "```mermaid\nflowchart TD\n  A --> B\n```\n\n",
    );
    expect(mermaidClipboardMarkdown("note ``` inside", "mermaid")).toBe(
      "````mermaid\nnote ``` inside\n````\n\n",
    );
  });
});
