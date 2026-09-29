import { getSite } from '../../templates/base/site.js';

export async function GET() {
  const site = await getSite();
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
