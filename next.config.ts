/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  turbopack: {}  // 🆕 Config Turbopack vide (silence le warning)
};

export default nextConfig;