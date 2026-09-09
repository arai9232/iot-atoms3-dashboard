import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // LANからdevサーバーへアクセスする場合、自分のPCのLAN IPを .env.local の
  // DEV_LAN_IP に設定する（例: DEV_LAN_IP=192.168.0.167）
  allowedDevOrigins: process.env.DEV_LAN_IP ? [process.env.DEV_LAN_IP] : [],
};

export default nextConfig;
