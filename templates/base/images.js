// Client photos go through Astro's image pipeline (sharp): resized to the
// widths each component asks for, converted to WebP, EXIF rotation applied.
// Only the images a page actually uses are processed.
const files = import.meta.glob('/clients/*/images/**/*.{jpg,jpeg,png,webp,avif,gif,svg,JPG,JPEG,PNG,WEBP,AVIF,GIF,SVG}', {
  import: 'default',
});

// `file` is the path from site.json, relative to clients/<slug>/images/.
export async function clientImage(slug, file) {
  if (!file) return null;
  const load = files[`/clients/${slug}/images/${file}`];
  if (!load) throw new Error(`Image not found: clients/${slug}/images/${file}`);
  return load();
}

export const isSvg = (file) => /\.svg$/i.test(file ?? '');
