import { getSite } from '../../templates/base/site.js';

export async function GET() {
  const site = await getSite();
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.siteUrl}/</loc><lastmod>${today}</lastmod></url>
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
