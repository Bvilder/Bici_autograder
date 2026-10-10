import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许 localhost / 127.0.0.1 两种地址访问 dev 资源（HMR 等），否则用 127.0.0.1 打开时页面会无交互
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
