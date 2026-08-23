/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle in .next/standalone, so web can be deployed
  // the same way as the agent/backend Go binaries: copy an artifact to the
  // server and run it, no full node_modules checkout required.
  // See scripts/deploy.sh and deploy/postggresively-web.service.
  output: "standalone",
};

export default nextConfig;
