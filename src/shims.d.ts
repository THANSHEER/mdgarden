// Ambient declarations for dependencies that don't ship their own types.

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  interface TaskListsOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  const taskLists: (md: MarkdownIt, options?: TaskListsOptions) => void;
  export default taskLists;
}

// CSS files imported as strings (esbuild "text" loader bundles the contents).
declare module '*.css' {
  const content: string;
  export default content;
}

// View Transitions API — not yet in TS's bundled DOM lib. Optional because most
// browsers don't support it yet; callers must feature-detect before calling it.
interface Document {
  startViewTransition?(callback: () => void | Promise<void>): { finished: Promise<void> };
}
