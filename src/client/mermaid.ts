// Mermaid runtime — this is a SEPARATE esbuild bundle (not imported by the main
// client). It is injected on demand by client/index.ts only when the page contains
// mermaid fences. The heavy mermaid dependency is isolated here intentionally.

import mermaid from 'mermaid';

/** Map the OS color-scheme preference to a Mermaid theme name. */
function currentTheme(): 'dark' | 'default' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
}

/** Initialize Mermaid and render every `pre.mermaid` block on the page. */
async function renderAll(): Promise<void> {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('pre.mermaid'));
  if (nodes.length === 0) return;
  mermaid.initialize({ startOnLoad: false, theme: currentTheme() });
  for (const el of nodes) {
    // Store original markup for re-rendering.
    if (!el.dataset.src) el.dataset.src = el.textContent ?? '';
    else el.textContent = el.dataset.src;
    el.removeAttribute('data-processed');
  }
  try {
    await mermaid.run({ nodes });
  } catch (err) {
    console.warn('[mdgarden] mermaid render failed:', err);
  }
}

void renderAll();

// Re-render if the OS light/dark preference changes (theme is otherwise fixed at build time).
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => void renderAll());
