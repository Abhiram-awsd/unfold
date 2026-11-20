import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Resume uploads go through the proxy; allow a little over the 10 MB file limit.
    proxyClientMaxBodySize: "12mb",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The app's own screens must never be framed by another site. Portfolios and template previews can be.
      { source: "/(dashboard|editor|admin|sign-in|sign-up)/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/(dashboard|editor|admin)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
    ];
  },
};

export default nextConfig;
