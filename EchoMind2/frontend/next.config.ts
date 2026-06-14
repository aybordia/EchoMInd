import type { NextConfig } from "next";

// Backend origin the frontend proxies to. In production set BACKEND_ORIGIN to
// the deployed FastAPI URL. NEXT_PUBLIC_BACKEND_URL can also be used when you
// intentionally want the browser to call the backend directly.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  // Proxy API + static job assets through the frontend's own origin so the whole
  // app works behind a single port (localhost:3000) — needed for web previews
  // and simpler local runs.
  async rewrites() {
    return {
      fallback: [
        { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
        { source: "/static/:path*", destination: `${BACKEND_ORIGIN}/static/:path*` },
        { source: "/health", destination: `${BACKEND_ORIGIN}/health` },
      ],
    };
  },
};

export default nextConfig;
