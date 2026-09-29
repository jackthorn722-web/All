// Client photos go through Astro's image pipeline (sharp): resized to the
// widths each component asks for, converted to WebP, EXIF rotation applied.
// virtual:client only offers the images site.json references, so nothing
// else from the client's folder (or any other client's) ends up in dist/.
import { images } from 'virtual:client';

// `file` is the path from site.json, relative to clients/<slug>/images/.
export async function clientImage(slug, file) {
  if (!file) return null;
  const load = images[file];
  if (!load) throw new Error(`Image not found: clients/${slug}/images/${file} (run: npm run check -- ${slug})`);
  return (await load()).default;
}

export const isSvg = (file) => /\.svg$/i.test(file ?? '');
