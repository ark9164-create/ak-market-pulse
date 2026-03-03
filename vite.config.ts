import { defineConfig } from 'vite';
import { resolve } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import http from 'http';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/ak-market-pulse/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/yahoo-api': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      },
      '/fred-api': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fred-api/, ''),
      },
      '/findata-api': {
        target: 'https://api.financialdatasets.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/findata-api/, ''),
      },
    },
  },
  plugins: [
    {
      name: 'rss-proxy',
      configureServer(server) {
        server.middlewares.use('/rss-proxy', (req: IncomingMessage, res: ServerResponse) => {
          try {
          const targetUrl = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
          if (!targetUrl) {
            res.writeHead(400);
            res.end('Missing ?url= parameter');
            return;
          }

          const mod = targetUrl.startsWith('https') ? https : http;
          const proxyReq = mod.get(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
          }, (proxyRes) => {
            // Follow redirects
            if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
              // Resolve relative redirects against the original URL
              const redirectUrl = new URL(proxyRes.headers.location, targetUrl).href;
              const redirectMod = redirectUrl.startsWith('https') ? https : http;
              redirectMod.get(redirectUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                },
              }, (redirectRes) => {
                res.writeHead(redirectRes.statusCode ?? 200, {
                  'Content-Type': redirectRes.headers['content-type'] ?? 'text/xml',
                  'Access-Control-Allow-Origin': '*',
                });
                redirectRes.pipe(res);
              }).on('error', () => {
                res.writeHead(502);
                res.end('Redirect proxy error');
              });
              return;
            }

            res.writeHead(proxyRes.statusCode ?? 200, {
              'Content-Type': proxyRes.headers['content-type'] ?? 'text/xml',
              'Access-Control-Allow-Origin': '*',
            });
            proxyRes.pipe(res);
          });

          proxyReq.on('error', () => {
            if (!res.headersSent) { res.writeHead(502); }
            res.end('Proxy error');
          });
          } catch (e) {
            if (!res.headersSent) { res.writeHead(500); }
            res.end('Internal proxy error');
          }
        });
      },
    },
  ],
});
