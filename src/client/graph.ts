/** Prefix a root-relative URL with the base path stored on the <html> element. */
function withBase(url: string): string {
  const base = document.documentElement.dataset.base ?? '';
  if (!base) return url;
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  return base + url;
}

interface GNode {
  id: string;
  title: string;
  url: string;
}
interface GLink {
  source: string;
  target: string;
}
interface GraphData {
  nodes: GNode[];
  links: GLink[];
}
interface SimNode extends GNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}
interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const CLICK_DRAG_THRESHOLD = 4; // px of pointer travel before a press counts as a drag, not a click
const GLOBAL_MAX_NODES = 250; // cap for the "all notes" view (the force sim is O(n²) per tick)

type GraphMode = 'local' | 'global';

/** Interactive link graph with a local/global toggle. */
export function initGraph(): void {
  const container = document.querySelector<HTMLElement>('[data-graph]');
  const canvas = container?.querySelector('canvas') ?? null;
  if (!container || !canvas) return;

  void fetch(withBase('/graph.json'))
    .then((r) => r.json())
    .then((data: GraphData) => setup(container, canvas, data))
    .catch(() => {
      container.style.display = 'none';
    });
}

function currentSlug(): string {
  return decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
}

/** Whole graph, capped for performance. */
function globalView(data: GraphData): GraphData {
  const nodes = data.nodes.slice(0, GLOBAL_MAX_NODES);
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, links: data.links.filter((l) => ids.has(l.source) && ids.has(l.target)) };
}

function neighborhood(data: GraphData, slug: string): GraphData {
  if (!data.nodes.some((n) => n.id === slug)) return globalView(data);
  const ids = new Set<string>([slug]);
  for (const l of data.links) {
    if (l.source === slug) ids.add(l.target);
    if (l.target === slug) ids.add(l.source);
  }
  return {
    nodes: data.nodes.filter((n) => ids.has(n.id)),
    links: data.links.filter((l) => ids.has(l.source) && ids.has(l.target)),
  };
}

function subsetFor(data: GraphData, slug: string, mode: GraphMode): GraphData {
  return mode === 'global' ? globalView(data) : neighborhood(data, slug);
}

function setup(container: HTMLElement, canvas: HTMLCanvasElement, data: GraphData): void {
  const slug = currentSlug();
  // The home/landing page (slug '') has no local neighborhood, so it opens on the full graph.
  let mode: GraphMode = slug === '' ? 'global' : 'local';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  let width = 0;
  let height = 0;

  const measure = (): boolean => {
    const nextWidth = Math.max(1, container.clientWidth || 240);
    const cssHeight = Number.parseFloat(getComputedStyle(canvas).height);
    const nextHeight = Math.max(180, Math.round(Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 272));
    if (Math.abs(nextWidth - width) < 1 && Math.abs(nextHeight - height) < 1) return false;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;
    return true;
  };
  measure();
  const graphLinks = container.querySelector<HTMLUListElement>('.graph-links ul');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tooltip = document.createElement('div');
  tooltip.className = 'graph-tooltip';
  tooltip.hidden = true;
  container.appendChild(tooltip);

  const view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  const graphToScreen = (x: number, y: number): { x: number; y: number } => ({
    x: x * view.scale + view.offsetX,
    y: y * view.scale + view.offsetY,
  });
  const screenToGraph = (x: number, y: number): { x: number; y: number } => ({
    x: (x - view.offsetX) / view.scale,
    y: (y - view.offsetY) / view.scale,
  });

  let cx = width / 2;
  let cy = height / 2;

  // Mutable simulation state, rebuilt by setData() whenever the mode changes.
  let nodes: SimNode[] = [];
  let links: { a: SimNode; b: SimNode }[] = [];
  let frame = 0;
  let settled = false;
  let rafId = 0;
  let hoveredNode: SimNode | null = null;
  let needsFit = false;

  function setData(sub: GraphData): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (graphLinks) {
      graphLinks.replaceChildren(
        ...[...sub.nodes]
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((node) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = node.url;
            link.textContent = node.title;
            if (node.id === slug) link.setAttribute('aria-current', 'page');
            item.appendChild(link);
            return item;
          }),
      );
    }
    if (sub.nodes.length <= 1) {
      nodes = [];
      links = [];
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    view.scale = 1;
    view.offsetX = 0;
    view.offsetY = 0;
    needsFit = true;
    nodes = sub.nodes.map((n, i) => ({
      ...n,
      x: cx + Math.cos((i / sub.nodes.length) * Math.PI * 2) * 40 + (Math.random() - 0.5),
      y: cy + Math.sin((i / sub.nodes.length) * Math.PI * 2) * 40 + (Math.random() - 0.5),
      vx: 0,
      vy: 0,
      pinned: false,
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    links = sub.links
      .map((l) => ({ a: byId.get(l.source), b: byId.get(l.target) }))
      .filter((l): l is { a: SimNode; b: SimNode } => !!l.a && !!l.b);
    frame = 0;
    settled = false;
    if (reduceMotion) {
      for (let i = 0; i < 180 && !settled; i++) settled = tick();
      settled = true;
      fitView();
      needsFit = false;
      draw();
    } else {
      rafId = requestAnimationFrame(loop);
    }
  }

  function tick(): boolean {
    // Repulsion — higher constant spreads nodes out more on the larger canvas.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = Math.random();
          dy = Math.random();
          d2 = 1;
        }
        const d = Math.sqrt(d2);
        const f = 1200 / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (!a.pinned) {
          a.vx += fx;
          a.vy += fy;
        }
        if (!b.pinned) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }
    // Spring attraction along links — rest length 80px matches larger canvas.
    for (const { a, b } of links) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 80) * 0.01;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (!a.pinned) {
        a.vx += fx;
        a.vy += fy;
      }
      if (!b.pinned) {
        b.vx -= fx;
        b.vy -= fy;
      }
    }
    // Centering + integrate.
    let energy = 0;
    for (const n of nodes) {
      if (n.pinned) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx += (cx - n.x) * 0.01;
      n.vy += (cy - n.y) * 0.01;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(12, Math.min(width - 12, n.x));
      n.y = Math.max(12, Math.min(height - 12, n.y));
      energy += Math.abs(n.vx) + Math.abs(n.vy);
    }
    return energy < 0.5;
  }

  function colorVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
  }

  // gx/gy are graph-space — every caller must run screenToGraph() first.
  function hitTest(gx: number, gy: number): SimNode | null {
    for (const n of nodes) {
      const r = (n.id === slug ? 8 : 6) + 10;
      if ((gx - n.x) ** 2 + (gy - n.y) ** 2 < r * r) return n;
    }
    return null;
  }

  // Precompute per-node connection count for tooltip badges.
  function connectionCount(n: SimNode): number {
    return links.filter((l) => l.a === n || l.b === n).length;
  }

  function draw(): void {
    if (!ctx) return;
    const text = colorVar('--color-text');
    const primary = colorVar('--color-primary');
    const accent = colorVar('--color-accent');
    const border = colorVar('--color-border');

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    // Edges
    for (const { a, b } of links) {
      const isConnected = hoveredNode && (a === hoveredNode || b === hoveredNode);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if (hoveredNode) {
        ctx.strokeStyle = isConnected ? accent : border;
        ctx.lineWidth = (isConnected ? 2.2 : 1.0) / view.scale;
        ctx.globalAlpha = isConnected ? 0.95 : 0.15;
      } else {
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.2 / view.scale;
        ctx.globalAlpha = 1.0;
      }
      ctx.stroke();
    }

    ctx.font = `${12 / view.scale}px system-ui, sans-serif`;
    ctx.textAlign = 'center';

    for (const n of nodes) {
      const isCurrent = n.id === slug;
      const isHovered = n === hoveredNode;
      const isConnected = hoveredNode && (n === hoveredNode || links.some((l) => (l.a === hoveredNode && l.b === n) || (l.b === hoveredNode && l.a === n)));
      
      if (hoveredNode) {
        ctx.globalAlpha = (isHovered || isConnected) ? 1.0 : 0.3;
      } else {
        ctx.globalAlpha = 1.0;
      }

      const r = isCurrent ? 10 : 7;

      // Glow effect on current-page node
      if (isCurrent) {
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10 / view.scale;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? accent : primary;
        ctx.fill();
      }

      ctx.fillStyle = text;
      if (!hoveredNode || isHovered || isConnected) {
        const label = n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title;
        ctx.fillText(label, n.x, n.y - (r + 3) / view.scale);
      }
    }
    ctx.restore();
  }

  function loop(): void {
    settled = tick();
    draw();
    frame++;
    if (!settled && frame < 600) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    rafId = 0;
    if (settled && needsFit) {
      fitView();
      needsFit = false;
      draw();
    }
  }

  function wake(): void {
    if (settled) {
      settled = false;
      frame = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function canvasPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showTooltip(n: SimNode, x: number, y: number): void {
    const count = connectionCount(n);
    const badge = count > 0
      ? `<span class="graph-tooltip-badge">${count} link${count !== 1 ? 's' : ''}</span>`
      : '';
    tooltip.innerHTML = `<span class="graph-tooltip-title">${escapeHtml(n.title)}</span>${badge}`;
    tooltip.style.left = `${x + 12}px`;
    tooltip.style.top = `${y - 14}px`;
    tooltip.hidden = false;
  }
  function hideTooltip(): void {
    tooltip.hidden = true;
  }

  let dragNode: SimNode | null = null;
  let panning = false;
  let pointerTravel = 0;
  let lastPointer: { x: number; y: number } | null = null;

  canvas.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const g = screenToGraph(pt.x, pt.y);
    const hit = hitTest(g.x, g.y);
    pointerTravel = 0;
    lastPointer = pt;
    canvas.setPointerCapture(e.pointerId);
    if (hit) {
      dragNode = hit;
      hit.pinned = true;
    } else {
      panning = true;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const pt = canvasPoint(e);
    if (lastPointer) pointerTravel += Math.hypot(pt.x - lastPointer.x, pt.y - lastPointer.y);
    lastPointer = pt;

    if (dragNode) {
      const g = screenToGraph(pt.x, pt.y);
      dragNode.x = g.x;
      dragNode.y = g.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      draw();
      hideTooltip();
      return;
    }
    if (panning) {
      view.offsetX += e.movementX;
      view.offsetY += e.movementY;
      draw();
      hideTooltip();
      return;
    }

    const g = screenToGraph(pt.x, pt.y);
    const hit = hitTest(g.x, g.y);
    if (hit) {
      if (hoveredNode !== hit) {
        hoveredNode = hit;
        draw();
      }
      showTooltip(hit, pt.x, pt.y);
      canvas.style.cursor = 'pointer';
    } else {
      if (hoveredNode !== null) {
        hoveredNode = null;
        draw();
      }
      hideTooltip();
      canvas.style.cursor = 'grab';
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    const wasDragNode = dragNode;
    const wasClick = pointerTravel < CLICK_DRAG_THRESHOLD;

    if (dragNode) {
      dragNode.pinned = false;
      dragNode = null;
      wake();
    }
    if (panning) {
      panning = false;
      canvas.style.cursor = 'grab';
    }

    if (wasClick) {
      const pt = canvasPoint(e);
      const g = screenToGraph(pt.x, pt.y);
      const hit = wasDragNode ?? hitTest(g.x, g.y);
      if (hit) location.href = hit.url;
    }

    pointerTravel = 0;
    lastPointer = null;
  });

  canvas.addEventListener('pointerleave', () => {
    if (hoveredNode !== null) {
      hoveredNode = null;
      draw();
    }
    hideTooltip();
    if (!dragNode && !panning) canvas.style.cursor = 'grab';
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const pt = canvasPoint(e);
      const before = screenToGraph(pt.x, pt.y);
      view.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const after = graphToScreen(before.x, before.y);
      view.offsetX += pt.x - after.x;
      view.offsetY += pt.y - after.y;
      draw();
    },
    { passive: false },
  );

  // Zoom control buttons
  const zoomInBtn = container.querySelector<HTMLButtonElement>('[data-graph-zoom="in"]');
  const zoomOutBtn = container.querySelector<HTMLButtonElement>('[data-graph-zoom="out"]');
  const zoomResetBtn = container.querySelector<HTMLButtonElement>('[data-graph-zoom="reset"]');

  const zoomCenter = (factor: number): void => {
    const before = screenToGraph(cx, cy);
    view.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * factor));
    const after = graphToScreen(before.x, before.y);
    view.offsetX += cx - after.x;
    view.offsetY += cy - after.y;
    draw();
  };

  zoomInBtn?.addEventListener('click', () => zoomCenter(1.2));
  zoomOutBtn?.addEventListener('click', () => zoomCenter(1 / 1.2));
  zoomResetBtn?.addEventListener('click', () => {
    fitView();
    draw();
  });

  canvas.style.cursor = 'grab';

  /** Center and scale the graph so all nodes fit inside the canvas with padding. */
  function fitView(): void {
    if (nodes.length === 0) {
      view.scale = 1;
      view.offsetX = 0;
      view.offsetY = 0;
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
    const pad = 36;
    const spanX = Math.max(40, maxX - minX);
    const spanY = Math.max(40, maxY - minY);
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)),
    );
    view.scale = scale;
    view.offsetX = width / 2 - ((minX + maxX) / 2) * scale;
    view.offsetY = height / 2 - ((minY + maxY) / 2) * scale;
  }

  const resizeCanvas = (): void => {
    if (!measure()) return;
    cx = width / 2;
    cy = height / 2;
    for (const node of nodes) {
      node.x = Math.max(12, Math.min(width - 12, node.x));
      node.y = Math.max(12, Math.min(height - 12, node.y));
    }
    draw();
  };
  new ResizeObserver(resizeCanvas).observe(container);

  // Local/global toggle (rendered next to the canvas on note pages).
  const panel = container.closest('.graph-panel');
  const toggleButtons = panel
    ? Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-graph-mode]'))
    : [];
  for (const btn of toggleButtons) {
    btn.addEventListener('click', () => {
      const next = (btn.dataset.graphMode as GraphMode) || 'local';
      if (next === mode) return;
      mode = next;
      for (const b of toggleButtons) {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      setData(subsetFor(data, slug, mode));
    });
  }

  setData(subsetFor(data, slug, mode));
}
