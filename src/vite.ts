import type { Plugin } from 'vite';
import { compile } from './index.js';

/** JSX is lowered here; @vitejs/plugin-react is not required for Korean files. */
export default function koreanCode(): Plugin {
  let development = true;
  return {
    name: 'korean-code', enforce: 'pre',
    configResolved(config) { development = config.command === 'serve' && !config.isProduction; },
    transform(source, id) {
      const filename = id.split('?')[0];
      if (!/\.kjsx?$/u.test(filename) || /(?:^|[/\\])node_modules(?:[/\\]|$)/u.test(filename) || /[?&](raw|url)(?:&|$)/u.test(id)) return null;
      return compile(source, { filename, development });
    },
    handleHotUpdate(context) {
      if (/\.kjsx?$/u.test(context.file)) {
        context.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
