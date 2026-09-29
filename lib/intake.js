// The intake checklist `npm run new` prints, generated from the schema's
// field descriptions so it can never drift from what `check` requires.
import { jsonSchema } from './schema.js';

// Printed as one line instead of one line per key.
const COLLAPSE = new Set(['business.hours', 'socials', 'copy']);
const SKIP = new Set(['$schema', 'template']);
// Requirements the schema expresses as rules rather than required fields.
const RULES = {
  'gallery.beforeAfter[]': 'required: at least 1 photo or before/after pair in total',
  'gallery.photos[]': 'required: at least 1 photo or before/after pair in total',
  'cta.bookingUrl': 'required if cta.primary is "book"',
  'business.textsOk': 'must be answered before going live',
};

function lines(node, prefix, required, parentReq = true) {
  const out = [];
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    if (SKIP.has(key)) continue;
    const p = prefix ? `${prefix}.${key}` : key;
    const req = parentReq && required.includes(key);
    const isObj = child.type === 'object' && child.properties;
    const isList = child.type === 'array' && child.items?.type === 'object';
    const fieldList = (props, reqd = []) => Object.keys(props).map((f) => (reqd.includes(f) ? `${f}*` : f)).join(', ');
    if (isObj && !req && !COLLAPSE.has(p) && prefix) {
      // Optional group (e.g. address): one line, its own required fields starred.
      out.push({ path: p, req, desc: `${child.description ?? ''}. If given: ${fieldList(child.properties, child.required)}` });
    } else if (isObj && !COLLAPSE.has(p)) {
      out.push(...lines(child, p, child.required ?? [], req));
    } else if (isList) {
      out.push({ path: `${p}[]`, req, desc: `${child.description ?? ''}. Each: ${fieldList(child.items.properties, child.items.required)}` });
    } else if (COLLAPSE.has(p)) {
      out.push({ path: p, req, desc: `${child.description ?? ''} (${Object.keys(child.properties).join(', ')})` });
    } else {
      out.push({ path: p, req, desc: child.description ?? '' });
    }
  }
  return out;
}

export function intakeChecklist(variant) {
  const schema = jsonSchema();
  const out = ['INTAKE CHECKLIST: collect these on the call (* = required)', ''];
  for (const [group, node] of Object.entries(schema.properties)) {
    if (SKIP.has(group)) continue;
    const req = (schema.required ?? []).includes(group);
    const items =
      node.type === 'object' && node.properties && !COLLAPSE.has(group)
        ? lines(node, group, node.required ?? [], req)
        : lines({ properties: { [group]: node } }, '', req ? [group] : []);
    out.push(group.toUpperCase());
    for (const i of items) {
      const note = RULES[i.path];
      out.push(`  [ ] ${i.req || note ? '*' : ' '} ${i.path.padEnd(34, ' ')} ${i.desc}${note ? ` (${note})` : ''}`);
    }
    out.push('');
  }
  out.push(
    'ALSO ON THE CALL',
    '  [ ]   Ask them to text/email 5-10 photos: their best work, before/afters, a photo of',
    '        themselves, and the logo file. Phone photos are fine; the build shrinks them.',
    '        iPhone photos must be JPG, not HEIC (iPhone: Settings > Camera > Formats > Most Compatible).',
    `  [ ]   Read them the ${variant.label} default services and FAQ answers; note changes.`,
    '  [ ]   Only mark licensed/insured true if they confirm it. Reviews must be real, word for word.',
    '  [ ]   Google reviews link: their listing in Google Maps > Reviews tab > Share > copy link.',
    '',
  );
  return out.join('\n');
}
