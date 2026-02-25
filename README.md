# PinochlePro.com

Website for [pinochlepro.com](https://pinochlepro.com), built with [Astro 5](https://astro.build).

## Prerequisites

- Node.js 20+
- npm

## Getting started

```bash
npm ci
```

## Local development

```bash
npm run dev
```

Opens a dev server at `http://localhost:4321` with hot reload.

## Production build

```bash
npm run build
```

Output goes to `dist/`. Do **not** edit files in `dist/` — it is generated and gitignored.

## Preview the production build locally

```bash
npm run preview
```

## Project structure

```
src/
  pages/          # One .astro file per route (index, pricing, faq, learn, etc.)
    404.astro     # Custom 404 error page
  layouts/
    BaseLayout.astro  # Shared nav, GA4 analytics, meta tags
  styles/
    global.css    # All styles
public/           # Static assets (images, video) — copied to dist/ as-is
faq.json          # FAQ content — source of truth, imported at build time
.github/
  workflows/
    deploy.yml    # GitHub Actions: auto-deploy to GitHub Pages on push to main
```

## Adding a page

1. Create `src/pages/pagename.astro`
2. Wrap content in `<BaseLayout>`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Page Title" canonical="/pagename">
  <!-- content -->
</BaseLayout>
```

## Deploy

Push to `main` triggers an automatic deploy via GitHub Actions.

One-time repo setup: go to **Settings → Pages** and set the source to **GitHub Actions**.
