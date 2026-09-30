/**
 * Bundle the server routes (api-src/*.ts) into plain JavaScript functions (api/*.js) for Vercel.
 * Vercel's own TypeScript step does not accept ".ts" import paths, so we hand it finished JS instead.
 *
 *   node scripts/build-api.mjs        (run before every `vercel deploy`)
 */
import { build } from 'esbuild'
import { readdir } from 'node:fs/promises'

const routes = (await readdir('api-src')).filter((f) => f.endsWith('.ts'))
await build({
  entryPoints: routes.map((f) => `api-src/${f}`),
  outdir: 'api',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: false,
  logLevel: 'info',
  // Some bundled packages still call require(); give the ESM output one.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
})
process.stdout.write(`Built ${routes.length} functions into api/: ${routes.map((f) => f.replace('.ts', '.js')).join(', ')}\n`)
