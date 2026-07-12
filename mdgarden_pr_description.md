# mdgarden PR: Fix CSS/JS not loading on GitHub Pages subpath deployments

## Problem

When a site built by mdgarden is hosted at a **subpath** on GitHub Pages
(e.g. `https://owner.github.io/my-repo/`), **all CSS and JavaScript fails to load**.
The page renders as unstyled raw HTML.

### Root cause

mdgarden generates asset links using **absolute paths starting from `/`**:

```html
<head>
  <link rel="stylesheet" href="/_assets/style.css">
  <script src="/_assets/main.js"></script>
</head>
```

When the site lives at `/my-repo/`, the browser resolves `/` from the **domain
root**, not the subpath:

| | URL |
|---|---|
| Browser requests | `https://owner.github.io/_assets/style.css` ❌ 404 |
| Should request | `https://owner.github.io/my-repo/_assets/style.css` ✅ |

### Who is affected

Every user deploying to a **GitHub Pages project repository**
(i.e. any repo that is NOT named `owner.github.io`). This is the default
case — the repo is always a project page with a subpath.

Cloudflare Pages and custom root domains are **not** affected because they
serve from `/` directly.

---

## Reproduction

1. Run `npx mdgarden build` in any content directory
2. Deploy the `public/` output to a GitHub Pages project repo
   (repo name ≠ `<owner>.github.io`)
3. Visit `https://owner.github.io/<repo-name>/`
4. Open DevTools → Network → see every `/_assets/*` request returning **404**

---

## Proposed Fix

### Option A — Use relative asset paths (recommended, zero config)

Change every absolute asset path to a **root-relative** or **document-relative** path.
Relative paths work on any domain, any subpath, and localhost — no configuration needed.

**Wherever mdgarden writes asset URLs in its HTML template:**

```diff
- href="/_assets/style.css"
+ href="_assets/style.css"

- src="/_assets/main.js"
+ src="_assets/main.js"
```

For **internal page links** (links between notes):

```diff
- href="/my-note/"
+ href="my-note/"
```

---

### Option B — Respect the path component of `baseUrl` (config-driven)

If absolute paths are intentional, mdgarden should extract the **path segment**
from the `baseUrl` config value and prepend it to all asset hrefs.

**Example config:**
```json
{
  "site": {
    "baseUrl": "https://owner.github.io/my-repo"
  }
}
```

**Code change (wherever asset URLs are generated):**

```typescript
// BEFORE
function assetUrl(filename: string): string {
  return `/_assets/${filename}`;
}

// AFTER
function assetUrl(filename: string, config: Config): string {
  let prefix = '';
  if (config.site?.baseUrl) {
    try {
      // Extract path from baseUrl, e.g. "https://owner.github.io/my-repo" → "/my-repo"
      prefix = new URL(config.site.baseUrl).pathname.replace(/\/$/, '');
    } catch {
      // Malformed baseUrl — fall back to root
    }
  }
  return `${prefix}/_assets/${filename}`;
}
```

Apply the same logic to all internal `href` values in the generated HTML.

---

### Option C — Support a dedicated `pathPrefix` config field

Add a top-level `pathPrefix` string to the config schema:

```json
{
  "site": {
    "baseUrl": "https://owner.github.io/my-repo",
    "pathPrefix": "/my-repo"
  }
}
```

mdgarden prepends `pathPrefix` to every asset link and internal `href`.
This is the approach used by Gatsby (`pathPrefix`) and Gridsome (`baseUrl` path component).

---

## Which option to pick

| Option | Pros | Cons |
|---|---|---|
| **A — relative paths** | Zero config, works everywhere by default | Requires auditing all link generation code |
| **B — auto from `baseUrl`** | Single source of truth, no new config field | `baseUrl` must be set correctly by the user |
| **C — `pathPrefix` field** | Explicit and easy to understand | New config field, must be kept in sync with `baseUrl` |

**Option A is the cleanest** because it eliminates the problem for all users without any configuration. Option B is a good alternative if absolute paths are architecturally important.

---

## Additional context

- This was discovered while deploying mdgarden sites via the
  [NoteFlare](https://github.com/YOUR_ORG/obsidian-noteflare) Obsidian plugin,
  which uses mdgarden as its build engine.
- As a workaround, NoteFlare currently injects `<base href="/repo-name/">` into
  every generated HTML file via a GitHub Actions post-build step. This workaround
  can be removed once mdgarden generates correct paths natively.
- The same bug exists in Hugo (solved with `baseURL` path), Gatsby (solved with
  `pathPrefix`), and VitePress (solved with `base`). All use either relative
  paths or a path prefix config.
