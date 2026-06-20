import { createRequire } from 'node:module';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// `src/lib/fit-connect/schema.ts` imports Ajv2020 from `ajv/dist/2020` (the
// JSON-Schema-2020-12 build, ajv@^8). In some local installs the hoisted
// top-level `node_modules/ajv` is an older transitive v6 (no `dist/2020`),
// which makes webpack fail with "Can't resolve 'ajv/dist/2020'". `ajv-formats@3`
// peer-depends on ajv@8, so we resolve the v8 copy through it and alias the
// bare specifier to it. On Vercel (clean pnpm store) ajv@8 hoists natively, so
// this resolves to the same file and is effectively a no-op; on failure we
// swallow and leave native resolution in place.
function resolveAjv2020(): string | null {
  try {
    const req = createRequire(import.meta.url);
    const ajvFormatsDir = dirname(req.resolve('ajv-formats/package.json'));
    const ajvDir = dirname(req.resolve('ajv/package.json', { paths: [ajvFormatsDir] }));
    return path.join(ajvDir, 'dist', '2020.js');
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. A parent-dir lockfile
  // (C:\Users\iaiaa\package-lock.json) otherwise makes Next infer the wrong
  // workspace root, which can duplicate bundled modules.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Lint is run as a dedicated pipeline gate (`pnpm lint`), not during the
  // production build. This also avoids the eslint-config-next + ESLint-9
  // patch incompatibility aborting the build worker before page collection.
  eslint: { ignoreDuringBuilds: true },
  // Types are likewise a dedicated gate (`tsc --noEmit`, the `typecheck`
  // script). The build-time pass otherwise trips on `ajv/dist/2020` in some
  // local installs (an older transitive ajv@6 hoists over the pinned ^8) — a
  // resolution artefact that does not reproduce on Vercel's clean pnpm store.
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    const ajv2020 = resolveAjv2020();
    if (ajv2020) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = { ...(config.resolve.alias ?? {}), 'ajv/dist/2020$': ajv2020 };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
