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
npm run schema                              # regenerate lib/site.schema.json after editing lib/schema.js
```

Not built yet: `deploy` (Phase 2), `build:all` + the pressure-washer / lawn-care / general variants (Phase 3).

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

- The client is selected by the `CLIENT_SLUG` env var, set by the scripts. Output goes to `dist/<slug>/`.
- Copy precedence: `site.json` `copy`/`business.tagline` > variant copy > base defaults. Copy may use tokens
  `{business} {industry} {city} {state} {cities} {citiesShort} {owner} {ownerFirst} {phone}`.
- Placeholders: text containing `TODO`, a 555-01xx phone, example.com emails/links, `placeholder-*` images.
  `check` fails on them; dev/build only warn (so previews work), and deploy --prod must refuse them.
- Never invent claims for a real client: reviews must be real and word for word; licensed/insured only if
  confirmed. Sample reviews always carry TODO.
- Brand colors are made readable automatically (`lib/colors.js`); don't hard-code colors in components,
  use the theme classes (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `text-link`,
  `bg-accent text-on-accent`, `bg-primary text-on-primary`).
- CLI output stays plain ASCII (Windows terminals). Paths for `fs` use `path.join`; Vite glob keys use `/`.
- Secrets live in `.env` (see `.env.example`), never in site.json or git.
- Verify changes by running `npm run check` and `npm run build` for twintuned and looking at `dist/twintuned/`.
