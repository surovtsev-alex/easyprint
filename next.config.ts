import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = process.env.REPO_NAME || "easyprint";
const isDev = process.env.NEXT_PUBLIC_ENV === "development";

// Prod: /easyprint (GitHub Pages main site)
// Dev:  /easyprint/dev (gh-pages branch /dev subfolder)
const basePath = isProd
  ? isDev
    ? `/${repoName}/dev`
    : `/${repoName}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  turbopack: {},
};

export default nextConfig;
