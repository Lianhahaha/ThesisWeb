/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow proxying PDFs through our API without being blocked by image optimization etc.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
