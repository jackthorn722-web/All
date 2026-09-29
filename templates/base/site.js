// Astro-side entry: validates the current client's site.json (served by
// virtual:client, see lib/vite-client.js, so edits hot-reload in dev) and
// builds the model every page renders from.
import { spec, slug } from 'virtual:client';
import { validateSpec, formKeyFor, siteUrl, isPreviewBuild } from '../../lib/client.js';
import { buildModel } from '../../lib/model.js';

export async function getSite() {
  const { errors, data } = validateSpec(structuredClone(spec), slug);
  if (errors.length) {
    const list = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`clients/${slug}/site.json has ${errors.length} error(s):\n${list}\nRun: npm run check -- ${slug}`);
  }
  return { ...buildModel(data, { slug, siteUrl: siteUrl(data, slug), formKey: formKeyFor(slug) }), preview: isPreviewBuild() };
}
