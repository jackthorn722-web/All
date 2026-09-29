import { getSite } from '../../templates/base/site.js';
import { faviconIco } from '../../templates/base/icons.js';

export async function GET() {
  return new Response(await faviconIco(await getSite()), { headers: { 'Content-Type': 'image/x-icon' } });
}
