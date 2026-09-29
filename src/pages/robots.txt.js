import { getSite } from '../../templates/base/site.js';

export async function GET() {
  const site = await getSite();
  const body = site.preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
