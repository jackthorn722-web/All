// Astro-side entry: loads the current client's site.json through Vite (so
// editing it hot-reloads `npm run dev`), validates it and builds the model.
// The client comes from CLIENT_SLUG, set by scripts/dev.mjs and build.mjs.
import { validateSpec, formKeyFor, siteUrl } from '../../lib/client.js';
import { buildModel } from '../../lib/model.js';

const specs = import.meta.glob('/clients/*/site.json', { import: 'default' });

export function currentSlug() {
  const slug = process.env.CLIENT_SLUG;
  if (!slug) throw new Error('No client selected. Run through npm: npm run dev -- <slug>');
  return slug;
}

export async function getSite() {
  const slug = currentSlug();
  const load = specs[`/clients/${slug}/site.json`];
  if (!load) throw new Error(`clients/${slug}/site.json not found`);
  const raw = structuredClone(await load());
  const { errors, data } = validateSpec(raw, slug);
  if (errors.length) {
    const list = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`clients/${slug}/site.json has ${errors.length} error(s):\n${list}\nRun: npm run check -- ${slug}`);
  }
  return buildModel(data, { slug, siteUrl: siteUrl(data, slug), formKey: formKeyFor(slug) });
}
