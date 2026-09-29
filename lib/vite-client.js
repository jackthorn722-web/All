// Vite plugin behind `virtual:client`: the ONE client being built/previewed.
// It inlines that client's site.json (read by readSpec, so BOM/UTF-16 files
// and JSON typos behave exactly as in `npm run check`) and lazily imports only
// the images site.json references. Nothing from other clients' folders enters
// the build, so their photos can't leak into this site and a broken client
// can't break anyone else's build. In dev, any change in the client's folder
// regenerates the module and reloads the page.
import path from 'node:path';
import { readSpec, imageRefs, clientDir } from './client.js';

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
        `export const spec = ${JSON.stringify(raw)};`,
        `export const slug = ${JSON.stringify(slug)};`,
        `export const images = {\n${images}\n};`,
      ].join('\n');
    },
    configureServer(server) {
      const dir = path.resolve(clientDir(slug));
      server.watcher.add(dir);
      server.watcher.on('all', (event, file) => {
        if (!['add', 'change', 'unlink', 'addDir', 'unlinkDir'].includes(event)) return;
        const rel = path.relative(dir, path.resolve(file));
        if (rel.startsWith('..') || path.isAbsolute(rel)) return;
        for (const env of Object.values(server.environments ?? {})) {
          const mod = env.moduleGraph?.getModuleById(RESOLVED);
          if (mod) env.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
