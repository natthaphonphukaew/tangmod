import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // knowledge base อ่านด้วย fs ตอน runtime ต้องบอกให้ติดไปกับ bundle ของ route
  outputFileTracingIncludes: {
    "/api/chat": ["./content/kb/**/*"],
  },
  partialPrefetching: true,
  // PGlite (Postgres ในเครื่องตอน dev) โหลดไฟล์ wasm เอง ห้าม bundle
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
