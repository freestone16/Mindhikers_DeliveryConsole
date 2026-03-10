/**
 * 前端统一配置入口 (SSOT)
 * 遵循 governance.md 2.3 — 禁止在组件中硬编码端口字面量
 *
 * 开发时：VITE_API_BASE 留空 → 走 Vite proxy → 后端
 * 生产时：VITE_API_BASE=https://your-host → 直连
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
export const SOCKET_URL = import.meta.env.VITE_API_BASE ?? '';
