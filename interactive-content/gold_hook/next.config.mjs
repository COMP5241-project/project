/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export so the whole site (landing page + game + demos) can be
  // deployed as plain static files on Vercel. The game is served from the
  // /gold_hook/ subfolder of the site root (see the root build.mjs).
  output: "export",
  basePath: "/gold_hook",
  images: { unoptimized: true },
};

export default nextConfig;
