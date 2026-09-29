import { getSite } from '../../templates/base/site.js';

export async function GET() {
  const site = await getSite();
  // Previews stay crawlable on purpose: Google only obeys their noindex tag if it can fetch the page.
  const body = site.preview ? 'User-agent: *\nAllow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
