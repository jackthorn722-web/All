// Vite plugin behind `virtual:client`: the ONE client being built/previewed.
// It imports that client's site.json (so edits hot-reload) and lazily imports
// only the images site.json references. Nothing from other clients' folders
// enters the build, so their photos can't leak into this site and a broken
// client can't break anyone else's build.
import { readSpec, imageRefs } from './client.js';

const ID = 'virtual:client';
const RESOLVED = '\0' + ID;

export function clientPlugin(slug) {
  return {
    name: 'dialedin-client',
    resolveId(id) {
      if (id === ID) return RESOLVED;
    },
    load(id) {
      if (id !== RESOLVED) return;
      const { raw, error } = readSpec(slug);
      if (error) throw new Error(error);
      const images = imageRefs(raw, slug)
        .map((f) => `  ${JSON.stringify(f)}: () => import(${JSON.stringify(`/clients/${slug}/images/${f}`)}),`)
        .join('\n');
      return [
        `import spec from ${JSON.stringify(`/clients/${slug}/site.json`)};`,
        `export { spec };`,
        `export const slug = ${JSON.stringify(slug)};`,
        `export const images = {\n${images}\n};`,
      ].join('\n');
    },
  };
}
