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
 * 为 Director 专家构建完整的 system prompt
 * 注入 Director 方法论 + RemotionStudio 能力描述
 */
export function buildDirectorSystemPrompt(taskType: 'concept' | 'broll' | 'revise'): string {
    const directorKnowledge = loadSkillKnowledge('RemotionStudio');
    let directorSkill = '';
    const customPromptPath = path.join(process.cwd(), 'Prompts/director/director-20250226.md');
    try {
        if (fs.existsSync(customPromptPath)) {
            directorSkill = fs.readFileSync(customPromptPath, 'utf-8');
            console.log(`[SkillLoader] ✅ Loaded original director prompt from ${customPromptPath}`);
        } else {
            directorSkill = loadSkillKnowledge('Director');
        }
    } catch (err) {
        console.warn('Failed to load custom director prompt', err);
    }
    const baseContext = directorSkill || directorKnowledge;

    const taskPrompts: Record<string, string> = {
        concept: `你是 MindHikers 的首席影视导演大师。你掌握以下专业方法论：

${baseContext}

你的任务是：根据用户提供的视频脚本，生成一份详尽的「视觉概念提案」。

要求：
1. 仔细阅读脚本全文，理解核心论点和情感走向
2. 为整个视频定义统一的视觉基调（色彩体系、字体、动效风格）
3. 提炼核心隐喻（用什么具象的视觉概念来表达抽象的主题）
4. ⚠️ ⚠️ ⚠️ 严禁在此阶段生成具体的章节分镜！严禁在输出中包含具体的 scenes 数组或 B-roll 指令！
5. 你的输出只要回答这三点：本期基调 (Vibe)、核心视觉隐喻 (Key Metaphor)、以及简短的确认文案。
6. 输出格式为 Markdown，结构清晰。

直接输出提案内容，不要有多余说明。`,

        broll: `\${baseContext}

================================

【系统级数据绑定要求】
前面是你的导演大师本命人设和工作流。对于本次任务，你必须输出能够被底层框架拦截解析的 JSON 数组结构。
你无需像往常一样在聊天窗口中回答，而是**只吐出一个完全符合以下规范的 JSON 对象**：

{
  "chapters": [
     {
        "chapterId": "章节ID(如 ch1)",
        "chapterName": "章节名称",
        "options": [
           {
              "name": "方案名称（体现你的电影工业质感命名）",
              "type": "remotion 或是 seedance 或是 artlist",
              "quote": "精确提取触发该视觉的一段原文，一字不差",
              "prompt": "具体的视觉执行指令（如果使用artlist，必须符合上面的官方词库协议）",
              "imagePrompt": "提炼给 AI 出图的极致核心英文 tag（仅限名词/形容词堆叠）",
              "rationale": "用一句话解释为什么选择这类镜头、符合怎样的人设意图"
           }
        ]
     }
  ]
}

严禁：不允许任何 Markdown (\`\`\`) 包裹，不要有多余的客套话或开头结尾，只返回花括号闭合的 JSON 对象本身！！！！`,

        revise: `你是 MindHikers 的首席影视导演大师。你掌握以下专业方法论：

${baseContext}

用户已有一份视觉概念提案，现在需要根据反馈意见进行专业修订。
请运用你的导演方法论，深度理解用户的反馈意图，对提案进行实质性修改。
保持 Markdown 格式，直接输出修订后的完整提案。`
    };

    return taskPrompts[taskType] || taskPrompts.concept;
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
