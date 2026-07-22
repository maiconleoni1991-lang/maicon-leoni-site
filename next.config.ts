import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = "/maicon-leoni-site";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? githubPagesBasePath : undefined,
  assetPrefix: isGitHubPages ? githubPagesBasePath : undefined,
  trailingSlash: isGitHubPages,
  typescript: {
    // The Pages build is static and does not load the Cloudflare-only D1 module.
    ignoreBuildErrors: isGitHubPages,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
