/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Content-Type', value: 'image/svg+xml' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;