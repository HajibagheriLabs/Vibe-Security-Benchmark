/** @type {import('next').NextConfig} */
const nextConfig = {
  // §3: CSP - No 'unsafe-inline' for styles/scripts if possible.
  // Example CSP header configuration
  async headers() {
    return [
      {
        source: '/api/avatar/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none';",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;