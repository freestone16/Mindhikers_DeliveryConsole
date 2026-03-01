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
              "template": "如果 type 是 remotion，必须从以下模板中选择一个填入",
              "props": "如果 type 是 remotion，必须根据选定的 template 填入对应的 JSON 数据参数",
              "quote": "精确提取触发该视觉的一段原文，一字不差",
              "prompt": "具体的视觉描述（如果使用artlist，必须符合上面的官方词库协议）",
              "imagePrompt": "提炼给 AI 出图的极致核心英文 tag（仅限名词/形容词堆叠）",
              "rationale": "用一句话解释为什么选择这类镜头、符合怎样的人设意图"
           }
        ]
     }
  ]
}

【Remotion 模板菜单指南 - 优先级排序】

🌟 **优先推荐（新模板 - 数据驱动）**：

1. **TextReveal** - 文字揭示动画
   适用场景：金句、名言、观点、标题出场
   所需 props：{ “text”: “文字内容”, “textColor”: “#ffffff” }

2. **NumberCounter** - 数字跑动动画
   适用场景：统计数据、增长数字（如 14.5万、0.839）、重要指标
   所需 props：{ “title”: “标题”, “endNumber”: 数字, “suffix”: “单位” }

3. **ComparisonSplit** - 分屏对比
   适用场景：A vs B、传统 vs 觉醒、Otto vs Inga、归因 vs 涌现
   所需 props：{ “leftTitle”: “左标题”, “leftContent”: “左文案”, “rightTitle”: “右标题”, “rightContent”: “右文案” }

4. **TimelineFlow** - 时间线编年史
   适用场景：历史进程、演化路线图、从...到...的发展
   所需 props：{ “title”: “标题”, “nodes”: [{“year”: “年份”, “event”: “事件”}] }

📊 **标准模板（已有）**：

5. **ConceptChain**：展示”A→B→C”这种递进关系或因果链条的认知模型。
   所需 props：\`{ “title”: “大标题”, “subtitle”: “副标题”, “conclusion”: “一句金句总结”, “nodes”: [{“id”:”xxx”, “label”:”节点名”, “desc”:”短描述”, “icon”:”Emoji图标”, “color”:”#hex色值”}] }\` (至少2个，最多5个 node)。

6. **DataChartQuadrant**：适用于二元对比、象限图、分布图分析。
   所需 props：\`{ “title”: “大标题”, “xAxisLabel”: “右箭头X轴名”, “yAxisLabel”: “上箭头Y轴名”, “quadrants”: [{“id”:”xxx”, “label”:”象限名”, “subLabel”:”副名”, “x”:1或0, “y”:1或0, “emoji”:”Emoji”, “color”:”#hex色值”}] }\` (必须4个 quadrant)。

7. **CinematicZoom**：适用于单张大图的氛围感电影级缓慢拉伸镜头。
   所需 props：\`{ “imagePrompt”: “你想要的画面英文提示词”, “bgStyle”: “black”, “zoomStart”: 1, “zoomEnd”: 1.1 }\`

🎨 **兜底模板**：

8. **SceneComposer**：万能排版工具。仅当上述模板都不适用时使用。
   所需 props：空对象 \`{}\` 即可。

【⚠️ 必须遵守的规则】
- 所有 type 为 'remotion' 的选项**必须**指定 template 字段
- 不要遗漏 template 和 props 字段
- props 必须包含模板所需的参数

【各 B-roll 类型适用场景指南】
作为导演大师，你应该根据内容本身的最佳视觉方案来自由选择最合适的 type，而非机械地均分。以下是各类型的核心适用场景：
- **remotion**：适合信息图、认知模型、数据可视化、框架对比等需要图表/动画的内容。必须指定 template 和 props。
- **seedance**：适合情绪叙事、人物特写、意境画面、比喻场景等需要 AI 生成实景视频的内容。
- **artlist**：适合需要自然环境空镜、城市场景、通用氛围画面的内容，从实拍素材库检索。
- **internet-clip**：适合内容中提及了真实存在的互联网素材（如某个游戏预告片、某次新闻事件、某个知名视频/截图）。你应该在 prompt 字段明确写出建议用户去哪里找什么素材，例如"建议在B站搜索'游科 黑神话悟空 实机演示'获取该片段"。
- **user-capture**：适合需要展示真实软件界面、App 操作流程、网站截图、代码演示等内容。你应该在 prompt 字段明确告诉用户应该截哪个界面或录哪段操作。

注意：internet-clip 和 user-capture 类型是"建议"性质的，用户可以采纳也可以跳过。你的职责是给出最专业、最贴近实际的建议。

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
