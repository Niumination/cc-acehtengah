// Resolver hook agar alias "@/..." (tsconfig paths) bekerja di `node --test`,
// termasuk melengkapi ekstensi .ts/.tsx yang biasanya ditangani bundler.
// Tanpa ini, file src yang memakai alias tidak bisa diuji sebagai unit murni.
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
