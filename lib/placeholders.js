// Finds values in a site.json that are still placeholders. The rules:
//   - any text containing TODO (uppercase, so the Spanish word "todo" is fine)
//   - a fictional 555-01xx phone number
//   - an example.com / example.org email or link
//   - an image whose file name starts with "placeholder"
import { IMAGE_EXTENSIONS } from './schema.js';

const RULES = [
  { test: (s) => s.includes('TODO'), why: 'contains TODO' },
  { test: (s) => /555[\s.)-]*01\d\d(?!\d)/.test(s), why: 'fictional 555-01xx number' },
  { test: (s) => /(@|\/\/|\.)example\.(com|org|net)\b/i.test(s), why: 'example.com placeholder' },
  {
    test: (s) => {
      const base = s.split('/').pop().toLowerCase();
      return base.startsWith('placeholder') && IMAGE_EXTENSIONS.includes(base.split('.').pop());
    },
    why: 'placeholder image',
  },
];

export function formatPath(path) {
  return path.reduce((out, key) => (typeof key === 'number' ? `${out}[${key}]` : out ? `${out}.${key}` : String(key)), '');
}

export function findPlaceholders(value, path = []) {
  if (typeof value === 'string') {
    const rule = RULES.find((r) => r.test(value));
    return rule ? [{ path: formatPath(path), value, why: rule.why }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => findPlaceholders(v, [...path, i]));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => (k === '$schema' ? [] : findPlaceholders(v, [...path, k])));
  return [];
}
