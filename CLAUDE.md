# DialedIn Sites: site pipeline

One repo turns `clients/<slug>/site.json` into a finished static site. Astro 7 (static) + Tailwind 4,
zod for the spec, sharp for images. The owner works on **Windows**: every script is Node (no bash),
Node >= 22.12. Keep dependencies minimal: no React, UI kits, CMS, database or test frameworks.

## Commands

```
npm run new -- <slug> --template detailer   # clients/<slug>/ + placeholder photos + intake checklist
npm run check -- <slug>                     # errors + placeholders by exact field path; exit 1 unless clean
npm run dev -- <slug>                       # live preview, hot reloads site.json and templates
npm run build -- <slug>                     # static site in dist/<slug>/
npm run preview -- <slug>                   # serve the built dist/<slug>/
npm run deploy -- <slug>                    # preview deploy: https://preview.<project>.pages.dev
npm run deploy -- <slug> --prod             # production + custom domain (refuses placeholders)
npm run schema                              # regenerate lib/site.schema.json after editing lib/schema.js
```

Not built yet: `build:all` + the pressure-washer / lawn-care / general variants (Phase 3).

## Layout

- `clients/<slug>/site.json` + `clients/<slug>/images/`: one folder per client. Image paths in site.json are
  relative to `images/` ("hero.jpg"). Originals are committed; the build resizes them.
- `lib/`: plain ESM `.js` shared by the scripts, `astro.config.mjs` and the Astro pages (no TypeScript loader,
  so it runs on any Node). `schema.js` is the single source of truth for validation, the intake checklist
  and `site.schema.json`.
- `templates/base/`: every section as a component, the layout, styles, generic default copy (`defaults.js`).
- `templates/<variant>/variant.js`: only what differs (industry, default copy, services, FAQ, section order,
  hero style, schema.org type, form extra field). Register it in `templates/index.js`. A variant can replace a
  whole section with `templates/<variant>/components/<BaseName>.astro`.
- `src/pages/`: thin Astro entry points (page, 404, sitemap, robots, favicons).
- `scripts/`: the npm commands. `kit/`: the old standalone HTML template kit (not part of the pipeline).
- `docs/`: the dialedinsites.com landing page (GitHub Pages). Don't mix pipeline output into it.

## Conventions

- The client is selected by the `CLIENT_SLUG` env var, set by the scripts. `lib/vite-client.js` serves
  `virtual:client`: that client's site.json (read by `readSpec`) plus lazy imports of ONLY the images
  site.json references; in dev it regenerates whenever anything in the client's folder changes. Never
  glob `clients/*`: other clients' files would leak into the build. Output goes to `dist/<slug>/` (built in
  `dist/.building-<slug>/` and swapped in only on success).
- Copy precedence: `site.json` `copy`/`business.tagline` > variant copy > base defaults. Copy, tagline, faq and
  seo text may use tokens `{business} {industry} {city} {state} {cities} {citiesShort} {owner} {ownerFirst}
  {phone} {callOrText}`. Use `{callOrText}` instead of writing "call or text" (some numbers take no texts).
- Placeholders: text containing `TODO`, a 555-01xx phone, example.com emails/links, `placeholder-*` images,
  and an unanswered `business.textsOk` (the site shows no Text buttons until it is set).
  `check` fails on them; dev/build only warn (so previews work), and deploy --prod must refuse them.
- Never invent claims for a real client: reviews must be real and word for word; licensed/insured only if
  confirmed. Sample reviews always carry TODO.
- Brand colors are made readable automatically (`lib/colors.js`); don't hard-code colors in components,
  use the theme classes (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `text-link`,
  `bg-accent text-on-accent`, `bg-primary text-on-primary`).
- CLI output stays plain ASCII (Windows terminals). Paths for `fs` use `path.join`; Vite import ids use `/`.
- Image paths in site.json must match the file name exactly, case included (Windows won't notice, the build
  will); `check` verifies every folder level. Photos must be raster; SVG is allowed only for the logo.
- Secrets live in `.env` (see `.env.example`), never in site.json or git.
- Deploy (`scripts/deploy.mjs`, `lib/cloudflare.js`, `lib/domains.js`): one Pages project per client, named
  after the slug. wrangler does project list/create/upload (API token or `wrangler login`); the REST API does
  domains + DNS (token only). Always create projects with `pages project create --force`: without it, wrangler
  run by an AI agent creates a Workers project instead of Pages. Deploy builds for the real URL through
  `DIALEDIN_SITE_URL` and marks previews with `DIALEDIN_PREVIEW=1` (noindex). DNS: create missing CNAMEs,
  never modify or delete existing records. `CLOUDFLARE_API_BASE_URL` points both at a test server.
- Verify changes by running `npm run check` and `npm run build` for twintuned and looking at `dist/twintuned/`.
