/** @type {import("next").NextConfig} */
const nextConfig = {
  // Sharp is a native external package. Keep its Linux binary and matching
  // libvips payload in every automation function that imports the shared queue.
  outputFileTracingIncludes: {
    "/api/cron/run-automations*": [
      "node_modules/sharp/**/*",
      "node_modules/@img/sharp-linux-x64/**/*",
      "node_modules/@img/sharp-libvips-linux-x64/**/*",
      "node_modules/@sparticuz/chromium/**/*",
      "node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*",
      "assets/fonts/**/*",
    ],
    // Kling finalization samples frames from the finished video. This route
    // therefore needs the same Chromium brotli/bin payload as the queue route.
    "/api/cron/finalize-kling-videos*": [
      "node_modules/sharp/**/*",
      "node_modules/@img/sharp-linux-x64/**/*",
      "node_modules/@img/sharp-libvips-linux-x64/**/*",
      "node_modules/@sparticuz/chromium/**/*",
      "node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*",
    ],
  },
  serverExternalPackages: [
    "sharp",
    "@sparticuz/chromium",
    "puppeteer-core",
  ],
};

export default nextConfig;
