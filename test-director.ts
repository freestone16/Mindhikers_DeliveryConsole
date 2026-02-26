import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateGlobalBRollPlan, callLLM } from './server/llm';
import { parseMarkdownChapters } from './server/director';
import { buildDirectorSystemPrompt } from './server/skill-loader';

dotenv.config();

const PROJECT_ID = 'CSET-seedance2';
const PROJECT_ROOT = '/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2';
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'CSET-seedance2_深度文稿_v2.md');

console.log('Loading script from:', SCRIPT_PATH);
const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
const chapters = parseMarkdownChapters(scriptContent).map((pc, idx) => ({
  id: `ch${idx + 1}`,
  name: pc.title,
  text: pc.text
}));

console.log('Parsed chapters count:', chapters.length);
console.log('Chapter 1 Name:', chapters[0].name);

async function testGlobalPlan() {
  console.log('\\n====================================');
  console.log('🚀 Triggering Director Global B-Roll Plan');
  console.log('====================================\\n');

  try {
    // Modify callLLM output internally to debug if it fails JSON parse
    const systemPrompt = buildDirectorSystemPrompt('broll');
    const userMessage = `请作为导演，为以下完整视频剧本进行全局 B-roll 视觉规划。
你必须基于全局视角进行“排兵布阵”，决定哪些章节需要密集的视觉冲击（多几个方案），哪些章节适合保持克制。

可用的 B-roll 类型：remotion, generative, seedance, artlist

剧本章节列表：
${chapters.map((ch, i) => `--- [第${i + 1}章: ${ch.name}] (ID: ${ch.id}) ---\\n${ch.text}`).join('\\n\\n')}

输出要求：
1. 请输出一个 JSON 对象，结构如下：
{
  "chapters": [
    {
      "chapterId": "章节ID",
      "chapterName": "章节名称",
      "options": [
        {
          "name": "极度细化、具备专业电影工业质感的命名",
          "type": "类型",
          "quote": "精准锚定章节中的1句独立原文（请确保完全匹配）",
          "prompt": "千万不要写“抽象画面”、“动态图表”、“未来城市”这种废话！必须写具体的长短镜头调度、材质、色彩、人物微表情！",
          "imagePrompt": "专供AI画图的高阶英文 Prompt（例如: 8k, cinematic lighting, ultra-detailed, ...）",
          "rationale": "为何这段原文需要配合如此极致的画面（专业审美的阐述）"
        }
      ]
    }
  ]
}
2. 切忌机械均分！你可以针对高潮段落（信息熵爆炸的地方）密集铺设 3-5 个不同风格试错分镜，而在情感低谷转折点也许只需要 1 个强力意象隐喻就够了！
3. 每条方案的 \`quote\` 原文绝对不能出现多车重复，必须覆盖章节不同的情感或论点。
4. JSON 必须合法，不允许被多余文本包裹！
`;

    console.log('Sending request to Native Moonshot (model: kimi-k2.5)...');

    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'kimi',
      'kimi-k2.5'
    );

    console.log('\\n✅ Raw LLM Response content received:\\n');
    console.log(response.content.substring(0, 1000) + '\\n... (truncated for brevity)');

    let content = response.content.trim();
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      content = content.substring(startIndex, endIndex + 1);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err: any) {
      const fs = require('fs');
      fs.writeFileSync('/tmp/kimi_err.json', content, 'utf8');
      console.error('JSON parse failed. Saved raw content to /tmp/kimi_err.json');
      throw err;
    }

    // Save Markdown response to visuals folder
    const visualsDir = path.join(PROJECT_ROOT, '04_Visuals');
    if (!fs.existsSync(visualsDir)) {
      fs.mkdirSync(visualsDir, { recursive: true });
    }
    const mdOutputPath = path.join(visualsDir, `phase2_分段视觉执行方案_${PROJECT_ID}.md`);

    let mdContent = `# ${PROJECT_ID} - 导演大师分段视觉执行方案 (Phase 2)\\n\\n`;
    parsed.chapters?.forEach((ch: any) => {
      mdContent += `## 📑 章节: ${ch.chapterName} (ID: ${ch.chapterId})\\n\\n`;
      mdContent += `| 📌 匹配原文 (Quote) | 🎬 方案类型与名称 | 📝 视觉描述/微距调度 (Prompt) | 🖼️ 缩略图提词 (Image Prompt) | 💡 导演意图 |\\n`;
      mdContent += `| :--- | :--- | :--- | :--- | :--- |\\n`;

      ch.options?.forEach((opt: any) => {
        // Handle markdown table escaping for newlines/pipes
        const sanitize = (str: string) => (str || '').replace(/\\n/g, '<br>').replace(/\\|/g, '、');

        mdContent += `| **"${sanitize(opt.quote)}"** | **[${opt.type}]**<br>${sanitize(opt.name)} | ${sanitize(opt.prompt)} | *${sanitize(opt.imagePrompt)}* | ${sanitize(opt.rationale)} |\\n`;
      });
      mdContent += `\\n---\\n\\n`;
    });

    fs.writeFileSync(mdOutputPath, mdContent, 'utf-8');
    console.log(`\\n✅ Successfully saved director plan to ${mdOutputPath}`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message || error);
  }
}

testGlobalPlan();
