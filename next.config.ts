import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// `src/lib/fit-connect/schema.ts` imports `ajv/dist/2020` (the Ajv2020 draft
// entry), which only ships in ajv@8. The top-level node_modules hoists ajv@6
// (no `dist/2020`), so local dev/build fail to resolve it — Vercel's pnpm
// install hoists v8, so it is green there. Alias the one v8 entry the schema
// needs to the copy nested under ajv-formats (which depends on ajv@8).
let ajv2020Path: string | undefined;
try {
  const ajvFormatsDir = dirname(require.resolve('ajv-formats/package.json'));
  ajv2020Path = require.resolve('ajv/dist/2020', { paths: [ajvFormatsDir] });
} catch {
  // Leave default resolution in place (e.g. on Vercel where ajv@8 is hoisted).
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
  webpack: (config) => {
    if (ajv2020Path) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        'ajv/dist/2020$': ajv2020Path,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
