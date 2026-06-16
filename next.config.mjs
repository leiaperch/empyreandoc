/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving uploaded files from /public/uploads
  // File uploads are handled server-side via /api/attachments
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@prisma/adapter-libsql"],
  },
};

export default nextConfig;
