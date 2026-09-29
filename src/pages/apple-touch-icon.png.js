import { getSite } from '../../templates/base/site.js';
import { iconPng } from '../../templates/base/icons.js';

export async function GET() {
  return new Response(await iconPng(await getSite(), 180, { solid: true }), { headers: { 'Content-Type': 'image/png' } });
}
