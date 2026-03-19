import path from 'path';
import fs from 'fs';

/**
 * 统一路径真相来源
 *
 * 所有模块的 PROJECTS_BASE / projectRoot 读取必须经过此文件。
 * 禁止在业务模块中直接读取 process.env.PROJECTS_BASE 或自行拼接 fallback。
 */

/**
 * 获取项目数据根目录。
 * 优先使用 PROJECTS_BASE 环境变量，缺失时 fallback 到 process.cwd()/Projects 并打印警告。
 */
export function getProjectsBase(): string {
  const raw = process.env.PROJECTS_BASE;
  if (raw && raw.trim()) {
    return path.normalize(raw.trim());
  }
  const fallback = path.resolve(process.cwd(), 'Projects');
  console.warn(
    `⚠️  [project-paths] PROJECTS_BASE 未设置，fallback 到: ${fallback}\n` +
    `   建议在 .env.local 中设置 PROJECTS_BASE 以避免路径不一致。`
  );
  return fallback;
}

/**
 * 获取单个项目的根目录。
 */
export function getProjectRoot(projectId: string): string {
  return path.resolve(getProjectsBase(), projectId);
}

/**
 * 拼接项目内子路径。
 */
export function resolveProjectPath(projectId: string, ...segments: string[]): string {
  return path.join(getProjectRoot(projectId), ...segments);
}

/**
 * 启动时调用：确认 PROJECTS_BASE 目录存在，否则直接报错退出。
 * 阻止服务带着错误根路径继续运行。
 */
export function ensureProjectsBaseExists(): void {
  const base = getProjectsBase();
  if (!fs.existsSync(base)) {
    console.error(
      `❌ [project-paths] PROJECTS_BASE 目录不存在: ${base}\n` +
      `   请检查 .env.local 中的 PROJECTS_BASE 配置是否正确。`
    );
    process.exit(1);
  }
  console.log(`✅ [project-paths] PROJECTS_BASE 已确认: ${base}`);
}

/**
 * 路径安全断言：确保目标路径在 PROJECTS_BASE 白名单内。
 * 用于文件读写、上传、导出等关键路径，防止路径拼接逃逸。
 *
 * @throws Error 若 targetPath 超出 PROJECTS_BASE 范围
 */
export function assertProjectPathSafe(targetPath: string): string {
  const base = path.resolve(getProjectsBase());
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(
      `🚫 [project-paths] 路径安全检查失败: "${resolved}" 超出 PROJECTS_BASE 范围 "${base}"`
    );
  }
  return resolved;
}
