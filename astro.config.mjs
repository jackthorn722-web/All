// One Astro project builds every client. The client is chosen with the
// CLIENT_SLUG env var, which `npm run dev|build -- <slug>` sets for you.
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { loadEnv, readSpec, siteUrl, pagesHeaders, isPreviewBuild, SLUG_RE } from './lib/client.js';
import { clientPlugin } from './lib/vite-client.js';

loadEnv();
const slug = process.env.CLIENT_SLUG;
if (!slug || !SLUG_RE.test(slug)) {
  throw new Error('No client selected. Use: npm run dev -- <slug>   or   npm run build -- <slug>');
}
const { raw } = readSpec(slug);

export default defineConfig({
  site: siteUrl(raw, slug),
  outDir: `./dist/${slug}`,
  // Per-client cache so clients never share build state.
  cacheDir: `./node_modules/.astro/${slug}`,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    // One page per site: inlining the CSS removes a render-blocking request.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
  integrations: [
    {
      name: 'dialedin-headers',
      hooks: {
        'astro:build:done': ({ dir }) => {
          fs.writeFileSync(new URL('_headers', dir), pagesHeaders({ domain: raw?.domain, preview: isPreviewBuild() }));
        },
      },
    },
  ],
  vite: {
    // clientPlugin exposes only this client's site.json + images (virtual:client).
    plugins: [tailwindcss(), clientPlugin(slug)],
  },
});
