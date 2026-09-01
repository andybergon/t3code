import { useEffect, useState } from "react";

import { mermaidClipboardMarkdown } from "~/lib/mermaidLanguage";
import { getCachedMermaidSvg, renderMermaidSvg } from "~/lib/mermaidRenderer";

function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message.trim()
    ? cause.message
    : "Couldn't render diagram.";
}

export function MermaidDiagram(props: {
  readonly code: string;
  readonly language: string;
  readonly theme: "light" | "dark";
  readonly onError?: (message: string) => void;
}) {
  const [svg, setSvg] = useState(() => getCachedMermaidSvg(props.code, props.theme));
  const [error, setError] = useState<string | null>(null);
  const clipboardMarkdown = mermaidClipboardMarkdown(props.code, props.language);

  useEffect(() => {
    const cached = getCachedMermaidSvg(props.code, props.theme);
    if (cached !== null) {
      setSvg(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setSvg(null);
    setError(null);
    void renderMermaidSvg(props.code, props.theme).then(
      (nextSvg) => {
        if (!cancelled) setSvg(nextSvg);
      },
      (cause: unknown) => {
        if (cancelled) return;
        const message = errorMessage(cause);
        setError(message);
        props.onError?.(message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [props.code, props.onError, props.theme]);

  if (error !== null) {
    return (
      <div
        className="px-3 pb-2 text-xs text-destructive"
        data-markdown-copy={clipboardMarkdown}
        role="alert"
      >
        {error}
      </div>
    );
  }
  if (svg === null) {
    return (
      <div
        className="px-3 pb-2 text-xs text-muted-foreground"
        aria-busy="true"
        role="status"
        data-markdown-copy={clipboardMarkdown}
      >
        Rendering diagram...
      </div>
    );
  }
  return (
    <div
      className="chat-markdown-mermaid overflow-x-auto px-3 pt-1 pb-3"
      data-markdown-copy={clipboardMarkdown}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
