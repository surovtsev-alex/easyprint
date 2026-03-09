import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = process.env.REPO_NAME || "easyprint";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}` : "",
  images: { unoptimized: true },
  turbopack: {},
};

export default nextConfig;
