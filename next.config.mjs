/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }] },
  // Bundle the local content folder with serverless functions (used when no GitHub token is set).
  experimental: { outputFileTracingIncludes: { "/**": ["./content/**/*"] } },
};
export default nextConfig;
