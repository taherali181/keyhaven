import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server only trusts `localhost` by default. Opening the app (or running the
  // Playwright suite) at 127.0.0.1 would otherwise block dev scripts and HMR, leaving
  // the page un-hydrated: no reading settings, no sidebar dock.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
