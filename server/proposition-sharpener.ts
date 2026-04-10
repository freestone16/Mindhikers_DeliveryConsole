import { z } from 'zod';
import { callRoundtableLlm } from './llm';

// ========== Zod Schema ==========

export const SharpenResultSchema = z.object({
  isSharp: z.boolean(),
  sharpened: z.string().optional(),
  clarifyingQuestions: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
});

export type SharpenResult = z.infer<typeof SharpenResultSchema>;

export interface SharpenOptions {
  mode?: 'detect' | 'sharpen';
}

// ========== Prompts ==========

const SHARPEN_SYSTEM_PROMPT = `你是一位命题锐化专家。你的任务是判断用户输入的议题是否足够"锋利"（可辩、具体、有价值冲突），并在需要时将其改写为锋利的命题。

锋利命题的四个标准：
1. 可辩性：有明确的正反双方，不是纯粹的事实陈述
2. 具体性：有具体场景/对象，不是宏大抽象概念  
3. 价值冲突：涉及两种以上价值观的权衡
4. 可检验性：有判断对错的潜在标准

判断和改写原则：
- 如果议题已经满足四个标准，isSharp = true，无需改写
- 如果议题太宽泛（如"AI 会改变教育"），改写为具体可辩的形式（如"生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴"）
- 如果议题缺少关键信息才能判断（如"这样做对吗"），返回 clarifyingQuestions 询问必要信息
- 改写时保留原议题的核心关切，只是让它更可辩

输出格式（严格 JSON，不要 markdown 代码块）：
{
  "isSharp": true/false,
  "sharpened": "如果原命题不够锋利，给出改写后的锋利命题（20-80字）；如果已经锋利或需要澄清，省略此字段",
  "clarifyingQuestions": ["如果需要用户澄清才能锐化，给出1-3个问题；如果可以直接锐化或已经锋利，返回空数组"],
  "reasoning": "简要说明判断理由（1-2句）"
}`;

function buildSharpenPrompt(proposition: string): string {
  return `请判断以下议题是否足够锋利，并在需要时进行锐化：

"${proposition}"

如果议题已经锋利（满足上述四个标准），返回 isSharp: true。
如果不够锋利，返回 isSharp: false 并给出 sharpened 改写版本。
如果需要澄清，返回 clarifyingQuestions。`;
}

// ========== Core Functions ==========

/**
 * 检测并锐化命题
 * 使用 tier:fast 调用 LLM 进行快速判断和改写
 */
export async function sharpenProposition(
  proposition: string,
  options: SharpenOptions = {}
): Promise<SharpenResult> {
  const { mode = 'sharpen' } = options;
  
  // 输入校验
  if (!proposition || proposition.trim().length === 0) {
    return {
      isSharp: false,
      clarifyingQuestions: ['请输入一个议题'],
      reasoning: '输入为空',
    };
  }
  
  // 截断超长输入
  const trimmedProposition = proposition.slice(0, 500);
  
  try {
    const response = await callRoundtableLlm({
      messages: [
        { role: 'system', content: SHARPEN_SYSTEM_PROMPT },
        { role: 'user', content: buildSharpenPrompt(trimmedProposition) },
      ],
      tier: 'fast',
      maxTokens: 1000,
    });
    
    // 解析 JSON
    const parsed = parseJsonResponse(response);
    
    // Zod 校验
    const validated = SharpenResultSchema.safeParse(parsed);
    
    if (!validated.success) {
      console.warn('[sharpenProposition] Zod validation failed:', validated.error);
      // Fallback：返回原命题作为已锐化
      return {
        isSharp: true,
        reasoning: 'Validation fallback',
      };
    }
    
    // detect 模式：只检测不锐化
    if (mode === 'detect') {
      return {
        isSharp: validated.data.isSharp,
        reasoning: validated.data.reasoning,
      };
    }
    
    return validated.data;
    
  } catch (error) {
    console.error('[sharpenProposition] Error:', error);
    // Fallback：返回原命题，标记为已锐化（降级策略，不阻塞用户）
    return {
      isSharp: true,
      reasoning: 'Error fallback',
    };
  }
}

/**
 * 应用锐化结果，返回最终进入圆桌的命题
 */
export function applySharpenedProposition(
  original: string,
  selected: string
): { finalProposition: string; success: boolean } {
  // 简单校验
  if (!original || !selected) {
    return { finalProposition: original || selected, success: false };
  }
  
  // 用户可能选择原始命题或锐化后的命题
  // 直接返回用户选择的即可
  const trimmed = selected.slice(0, 500);
  
  return {
    finalProposition: trimmed,
    success: true,
  };
}

// ========== Helpers ==========

/**
 * 从 LLM 响应中提取 JSON
 * 处理可能的 markdown 代码块包装
 */
function parseJsonResponse(response: string): unknown {
  let content = response.trim();
  
  // 移除 markdown 代码块包装
  if (content.startsWith('```json')) {
    content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    // 尝试从文本中提取 JSON（找第一个 { 和最后一个 }）
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonStr = content.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
    
    throw error;
  }
}
