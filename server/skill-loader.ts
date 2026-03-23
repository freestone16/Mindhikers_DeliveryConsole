/**
 * skill-loader.ts
 * 从 Antigravity 全局技能库读取 SKILL.md 文件，
 * 提取核心方法论内容，注入 LLM system prompt。
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

// 技能搜索路径优先级：全局 Antigravity → 项目级 .agent/skills → 本地 skills/
const SKILL_SEARCH_PATHS = [
    path.join(os.homedir(), '.gemini/antigravity/skills'),
    process.env.SKILLS_BASE || '',
    path.resolve(__dirname, '../skills'),
];

// 缓存已加载的 SKILL.md 内容，避免重复读取磁盘
const skillCache = new Map<string, { content: string; loadedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

const EXPERT_SKILL_MAP: Record<string, { skillName: string; displayName: string }> = {
    Director: { skillName: 'Director', displayName: '影视导演大师' },
    MusicDirector: { skillName: 'MusicDirector', displayName: '音乐总监' },
    ThumbnailMaster: { skillName: 'ThumbnailMaster', displayName: '缩略图大师' },
    MarketingMaster: { skillName: 'MarketingMaster', displayName: '营销大师' },
    ShortsMaster: { skillName: 'ShortsMaster', displayName: '短视频大师' },
    Writer: { skillName: 'Writer', displayName: '写作大师' },
};

/**
 * 从 Antigravity 技能库加载指定技能的 SKILL.md 内容
 * @param skillName 技能名称（目录名），如 'RemotionStudio', 'Director' 等
 * @returns SKILL.md 的文本内容，找不到则返回空字符串
 */
export function loadSkillKnowledge(skillName: string): string {
    // 检查缓存
    const cached = skillCache.get(skillName);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
        return cached.content;
    }

    for (const basePath of SKILL_SEARCH_PATHS) {
        if (!basePath) continue;
        const skillPath = path.join(basePath, skillName, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
            try {
                const raw = fs.readFileSync(skillPath, 'utf-8');
                // 提取核心内容：跳过 YAML frontmatter，截取合理长度（避免 token 爆炸）
                const content = extractCoreContent(raw, 4000);
                skillCache.set(skillName, { content, loadedAt: Date.now() });
                console.log(`[SkillLoader] ✅ Loaded ${skillName} from ${basePath}`);
                return content;
            } catch (err: any) {
                console.warn(`[SkillLoader] ⚠️ Failed to read ${skillPath}:`, err.message);
            }
        }
    }

    console.warn(`[SkillLoader] ❌ Skill "${skillName}" not found in any search path`);
    return '';
}

/**
 * 加载多个技能并合并为一个系统上下文
 */
export function loadMultipleSkills(skillNames: string[]): string {
    return skillNames
        .map(name => {
            const content = loadSkillKnowledge(name);
            if (!content) return '';
            return `\n### [${name} 技能知识]\n${content}\n`;
        })
        .filter(Boolean)
        .join('\n---\n');
}

/**
 * 从 Director Skill 目录加载指定的 prompt 模板文件
 * @param promptName 模板名称（不含扩展名），如 'concept', 'broll', 'revise', 'chat_edit'
 * @returns 模板内容，找不到则返回空字符串
 */
function loadSkillPrompt(skillName: string, promptName: string): string {
    for (const basePath of SKILL_SEARCH_PATHS) {
        if (!basePath) continue;
        const promptPath = path.join(basePath, skillName, 'prompts', `${promptName}.md`);
        if (fs.existsSync(promptPath)) {
            try {
                const content = fs.readFileSync(promptPath, 'utf-8');
                console.log(`[SkillLoader] ✅ Loaded ${skillName} prompt "${promptName}" from ${basePath}`);
                return content;
            } catch (err: any) {
                console.warn(`[SkillLoader] ⚠️ Failed to read ${promptPath}:`, err.message);
            }
        }
    }
    console.warn(`[SkillLoader] ❌ ${skillName} prompt "${promptName}" not found`);
    return '';
}

/**
 * 从指定 Skill 目录加载 resource 文件
 * @param skillName 技能名称，如 'Director', 'RemotionStudio'
 * @param resourceName 资源文件名（不含扩展名），如 'artlist_dictionary'
 * @returns 资源内容，找不到则返回空字符串
 */
function loadSkillResource(skillName: string, resourceName: string): string {
    for (const basePath of SKILL_SEARCH_PATHS) {
        if (!basePath) continue;
        const resourcePath = path.join(basePath, skillName, 'resources', `${resourceName}.md`);
        if (fs.existsSync(resourcePath)) {
            try {
                const content = fs.readFileSync(resourcePath, 'utf-8');
                console.log(`[SkillLoader] ✅ Loaded ${skillName} resource "${resourceName}" from ${basePath}`);
                return content;
            } catch (err: any) {
                console.warn(`[SkillLoader] ⚠️ Failed to read ${resourcePath}:`, err.message);
            }
        }
    }
    console.warn(`[SkillLoader] ❌ ${skillName} resource "${resourceName}" not found`);
    return '';
}

/**
 * 从 RemotionStudio 加载模板速查表（catalog.md）
 *
 * 沙漏架构：模板知识由 RemotionStudio 自身维护，是唯一事实来源。
 * 搜索路径：SKILL_SEARCH_PATHS + RemotionStudio 专属候选路径
 */
function loadRemotionCatalog(): string {
    // 候选路径：通用 Skill 搜索路径 + RemotionStudio 专属路径
    const candidatePaths = [
        ...SKILL_SEARCH_PATHS.filter(Boolean).map(p => path.join(p!, 'RemotionStudio', 'catalog.md')),
        // RemotionStudio 专属候选（与 skill-sync.ts 同源）
        process.env.REMOTION_STUDIO_DIR && path.join(process.env.REMOTION_STUDIO_DIR, 'catalog.md'),
        path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio/catalog.md'),
    ].filter(Boolean) as string[];

    for (const catalogPath of candidatePaths) {
        if (fs.existsSync(catalogPath)) {
            try {
                const content = fs.readFileSync(catalogPath, 'utf-8');
                console.log(`[SkillLoader] ✅ Loaded RemotionStudio catalog from ${catalogPath}`);
                return content;
            } catch (err: any) {
                console.warn(`[SkillLoader] ⚠️ Failed to read ${catalogPath}:`, err.message);
            }
        }
    }
    console.warn(`[SkillLoader] ❌ RemotionStudio catalog.md not found — Director LLM will not know available templates`);
    return '';
}

/**
 * 为 Director 专家构建完整的 system prompt
 * 
 * 从全局 Antigravity Skill 目录动态加载并组装 Director system prompt：
 * - Director/SKILL.md → 导演大师的核心身份与方法论
 * - Director/prompts/{taskType}.md → 对应任务的 prompt 模板
 * - RemotionStudio/catalog.md → Remotion 模板速查表（沙漏架构：由 RS 自身维护）
 * - Director/resources/ → 美学哲学、Artlist 词库等
 *
 * Prompt 模板中的占位符会被自动替换：
 * - {{DIRECTOR_SKILL}} → Director/SKILL.md 内容
 * - {{REMOTION_CATALOG}} → RemotionStudio/catalog.md 内容（唯一事实来源）
 * - {{AESTHETICS_GUIDELINE}} / {{CANVAS_DESIGN_ESSENCE}} → 美学哲学
 * - {{ARTLIST_DICTIONARY}} → Artlist 词库协议
 */
export function buildDirectorSystemPrompt(taskType: 'concept' | 'broll' | 'revise' | 'chat_edit'): string {
    // 1. 加载 Director 核心知识（SKILL.md）
    const directorSkill = loadSkillKnowledge('Director');

    // 2. 加载对应任务的 prompt 模板
    const promptTemplate = loadSkillPrompt('Director', taskType);

    if (promptTemplate) {
        // 3. 加载 resources 用于占位符替换
        // 沙漏架构：模板 catalog 从 RemotionStudio 读取（唯一事实来源），其余从 Director 读取
        const remotionCatalog = loadRemotionCatalog();
        const aestheticsGuideline = loadSkillResource('Director', 'aesthetics_guideline');
        const artlistDictionary = loadSkillResource('Director', 'artlist_dictionary');

        // 4. 替换占位符
        const resolved = promptTemplate
            .replace(/\{\{DIRECTOR_SKILL\}\}/g, directorSkill)
            .replace(/\{\{REMOTION_CATALOG\}\}/g, remotionCatalog)
            .replace(/\{\{ARTLIST_DICTIONARY\}\}/g, artlistDictionary)
            .replace(/\{\{AESTHETICS_GUIDELINE\}\}/g, aestheticsGuideline)
            .replace(/\{\{CANVAS_DESIGN_ESSENCE\}\}/g, aestheticsGuideline);

        console.log(`[SkillLoader] 🎬 Director prompt "${taskType}" assembled (${resolved.length} chars)`);
        return resolved;
    }

    // Fallback: 如果 Director Skill prompt 文件不存在，尝试旧版路径
    console.warn(`[SkillLoader] ⚠️ Director prompt "${taskType}" not found in Skill, falling back to legacy...`);
    const legacyPath = path.join(process.cwd(), 'Prompts/director/director-20250226.md');
    let legacyContent = '';
    try {
        if (fs.existsSync(legacyPath)) {
            legacyContent = fs.readFileSync(legacyPath, 'utf-8');
            console.log(`[SkillLoader] 📜 Loaded legacy director prompt from ${legacyPath}`);
        }
    } catch (err) {
        console.warn('[SkillLoader] Failed to load legacy director prompt', err);
    }
    const baseContext = legacyContent || directorSkill || loadSkillKnowledge('RemotionStudio');
    return baseContext;
}

export function buildExpertChatSystemPrompt(expertId: string): string {
    if (expertId === 'Director') {
        return buildDirectorSystemPrompt('chat_edit');
    }

    const expert = EXPERT_SKILL_MAP[expertId];
    if (!expert) {
        return '';
    }

    const promptTemplate = loadSkillPrompt(expert.skillName, 'chat_edit') || loadSkillPrompt(expert.skillName, 'chat');
    const skillKnowledge = loadSkillKnowledge(expert.skillName);

    if (promptTemplate) {
        return promptTemplate
            .replace(/\{\{SKILL\}\}/g, skillKnowledge)
            .replace(/\{\{EXPERT_SKILL\}\}/g, skillKnowledge)
            .replace(/\{\{EXPERT_NAME\}\}/g, expert.displayName);
    }

    if (skillKnowledge) {
        return `${skillKnowledge}

================================

你当前处于 DeliveryConsole 的 ${expert.displayName} Chatbox 协作态。

你的任务是：
1. 先以该专家身份理解用户原话
2. 如果是明确可执行的修改，就优先调用系统提供的工具
3. 如果信息不足，再用简短中文追问

注意：
- 不要冒充系统确认、执行结果或内部日志
- 不要暴露底层 patch 结构
- 你的回复应该保持专家本人风格，而不是通用客服口吻`;
    }

    return '';
}

/**
 * 提取 SKILL.md 核心内容，去除 YAML frontmatter，截取到指定字符数
 */
function extractCoreContent(raw: string, maxChars: number): string {
    let content = raw;

    // 去除 YAML frontmatter (--- ... ---)
    const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    if (frontmatterMatch) {
        content = content.slice(frontmatterMatch[0].length);
    }

    // 截取到合理长度
    if (content.length > maxChars) {
        // 尝试在段落边界截断
        const truncated = content.slice(0, maxChars);
        const lastParagraph = truncated.lastIndexOf('\n\n');
        if (lastParagraph > maxChars * 0.7) {
            content = truncated.slice(0, lastParagraph) + '\n\n[...更多内容已省略]';
        } else {
            content = truncated + '\n\n[...更多内容已省略]';
        }
    }

    return content.trim();
}

/**
 * 列出所有已安装的技能
 */
export function listAvailableSkills(): string[] {
    const skills: string[] = [];
    for (const basePath of SKILL_SEARCH_PATHS) {
        if (!basePath || !fs.existsSync(basePath)) continue;
        try {
            const entries = fs.readdirSync(basePath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillMd = path.join(basePath, entry.name, 'SKILL.md');
                    if (fs.existsSync(skillMd) && !skills.includes(entry.name)) {
                        skills.push(entry.name);
                    }
                }
            }
        } catch {
            // Skip unreadable directories
        }
    }
    return skills;
}
