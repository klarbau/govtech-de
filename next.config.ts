import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
};

export default withNextIntl(nextConfig);
