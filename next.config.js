/** @type {import('next').NextConfig} */

const { version } = require('./package.json');
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.NODE_ENV !== 'production';

// Sometimes useful to disable this during development
const ENABLE_CSP_HEADER = true;
const FRAME_SRC_HOSTS = [
  'https://*.walletconnect.com',
  'https://*.walletconnect.org',
  'https://cdn.solflare.com',
  'https://js.refiner.io',
];
const STYLE_SRC_HOSTS = ['https://js.refiner.io', 'https://storage.refiner.io'];
const IMG_SRC_HOSTS = [
  'https://*.walletconnect.com',
  'https://*.githubusercontent.com',
  'https://cdn.jsdelivr.net/gh/hyperlane-xyz/hyperlane-registry@main/',
  'https://js.refiner.io',
  'https://storage.refiner.io',
];
const SCRIPT_SRC_HOSTS = ['https://snaps.consensys.io', 'https://js.refiner.io'];
const MEDIA_SRC_HOSTS = ['https://js.refiner.io', 'https://storage.refiner.io'];
const cspHeader = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-eval'" : ''} ${SCRIPT_SRC_HOSTS.join(' ')};
  style-src 'self' 'unsafe-inline' ${STYLE_SRC_HOSTS.join(' ')};
  connect-src *;
  img-src 'self' blob: data: ${IMG_SRC_HOSTS.join(' ')};
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-src 'self' ${FRAME_SRC_HOSTS.join(' ')};
  frame-ancestors 'none';
  media-src 'self' ${MEDIA_SRC_HOSTS.join(' ')};
  ${!isDev ? 'block-all-mixed-content;' : ''}
  ${!isDev ? 'upgrade-insecure-requests;' : ''}
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Note, causes a problem for firefox: https://github.com/MetaMask/metamask-extension/issues/3133
  ...(ENABLE_CSP_HEADER
    ? [
        {
          key: 'Content-Security-Policy',
          value: cspHeader,
        },
      ]
    : []),
];

const nextConfig = {
  // Otimizações de memória para builds em ambientes com recursos limitados
  output: 'standalone',
  
  // Reduz o uso de memória durante o build
  experimental: {
    webpackBuildWorker: false,
    // Otimizações adicionais
    optimizePackageImports: [
      '@chakra-ui/react',
      '@hyperlane-xyz/widgets',
      '@solana/wallet-adapter-react',
      '@tanstack/react-query',
    ],
  },

  // Compressão (swcMinify removido - obsoleto no Next.js 15, minificação é automática)
  compress: true,

  webpack(config, { isServer, dev, isServerCompilation }) {
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: 'yaml-loader',
    });

    // Desabilita source maps completamente durante build (economiza MUITA memória)
    if (!dev) {
      config.devtool = false;
    }

    // Desabilita cache durante build para economizar memória
    if (!dev && process.env.NODE_ENV === 'production') {
      config.cache = false;
    } else if (config.cache) {
      config.cache = {
        ...config.cache,
        maxMemoryGenerations: 1,
      };
    }

    // Otimizações agressivas de memória para webpack
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        // Reduz paralelismo drasticamente
        splitChunks: {
          ...config.optimization.splitChunks,
          maxAsyncRequests: 10,
          maxInitialRequests: 10,
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000, // Reduzido para ~200KB por chunk
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              minSize: 50000,
              maxSize: 200000, // Chunks menores = menos memória
            },
            // Separar pacotes grandes em chunks individuais menores
            chakra: {
              test: /[\\/]node_modules[\\/]@chakra-ui[\\/]/,
              name: 'chakra',
              priority: 10,
              chunks: 'all',
              enforce: true,
            },
            solana: {
              test: /[\\/]node_modules[\\/]@solana[\\/]/,
              name: 'solana',
              priority: 10,
              chunks: 'all',
              enforce: true,
            },
          },
        },
        moduleIds: 'deterministic',
        // Reduz uso de memória na minificação
        minimize: true,
      };

      // Limita paralelismo do webpack drasticamente
      config.parallelism = 1;
    }

    // Para server-side também reduzir paralelismo
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: false, // Não precisa minificar server-side
      };
      config.parallelism = 1;
    }

    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  env: {
    NEXT_PUBLIC_VERSION: version,
  },

  reactStrictMode: true,
};

const sentryOptions = {
  org: 'hyperlane',
  project: 'warp-ui',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  tunnelRoute: '/monitoring-tunnel',
  // Desabilita geração de source maps durante build (economiza memória)
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  // Desabilita source maps completamente se não houver token
  ...(!process.env.SENTRY_AUTH_TOKEN && {
    sourcemaps: {
      disable: true,
    },
  }),
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
};

module.exports = withBundleAnalyzer(withSentryConfig(nextConfig, sentryOptions));
