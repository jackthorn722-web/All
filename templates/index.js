// Registry of industry variants. Add a variant: create templates/<id>/variant.js
// and list it here. A variant may also replace a whole section by adding
// templates/<id>/components/<SameNameAsBase>.astro (e.g. Hero.astro).
import { baseDefaults } from './base/defaults.js';
import detailer from './detailer/variant.js';

export const VARIANTS = { detailer };
export const VARIANT_IDS = Object.keys(VARIANTS);

// The variant merged over the base defaults (copy merges key by key).
export function getVariant(id) {
  const v = VARIANTS[id];
  if (!v) throw new Error(`Unknown template "${id}". Available: ${VARIANT_IDS.join(', ')}`);
  return {
    ...baseDefaults,
    ...v,
    copy: { ...baseDefaults.copy, ...v.copy },
    form: { ...baseDefaults.form, ...v.form },
  };
}
