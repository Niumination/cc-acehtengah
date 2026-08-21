// Resolver hook agar alias "@/..." (tsconfig paths) dan ekstensi .ts/.tsx —
// yang biasanya ditangani bundler Next.js — juga bekerja ketika modul di src/
// dijalankan langsung oleh Node.
//
// Dipakai bersama oleh:
//   • `npm test`             (node --test)
//   • `scripts/sync-all.sh`  (job sinkronisasi di luar runtime Next.js)
//
// Tanpa ini, `import '@/lib/prisma'` gagal dengan ERR_MODULE_NOT_FOUND.
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';

const SRC = pathToFileURL(resolvePath(process.cwd(), 'src') + '/').href;
const CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', ''];

function withExtension(url) {
  for (const suffix of CANDIDATES) {
    const candidate = url + suffix;
    try {
      if (existsSync(fileURLToPath(candidate))) return candidate;
    } catch {
      // URL tidak valid sebagai path — lewati
    }
  }
  return url;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(withExtension(SRC + specifier.slice(2)), context);
    }
    return nextResolve(specifier, context);
  },
});
