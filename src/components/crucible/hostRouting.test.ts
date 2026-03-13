import { describe, expect, it } from 'vitest';
import { classifyAssistantMessage } from './hostRouting';

describe('classifyAssistantMessage', () => {
  it('keeps long Socratic follow-up dialogue in the chat lane', () => {
    const content = '先停一下。你预设了“会用工具就能轻松生产70分内容”，这个前提本身需要压力测试。你观察到的大量敷衍作品，究竟是因为工具降低了门槛，还是因为创作者本身没有追求更高分的动力？如果工具真能稳定产出70分，那“敷衍”的定义是不是已经变了？';

    expect(classifyAssistantMessage(content)).toBe('dialogue');
  });

  it('still routes short standalone quotes to the middle screen', () => {
    const content = '金句：“真正稀缺的不是生产力，而是判断力。”';

    expect(classifyAssistantMessage(content)).toBe('quote');
  });

  it('routes structured breakdowns as assets instead of dialogue', () => {
    const content = [
      '结构：',
      '- 先定义70分内容',
      '- 再拆敷衍感来自哪里',
      '- 最后判断未来真正稀缺的能力',
    ].join('\n');

    expect(classifyAssistantMessage(content)).toBe('asset');
  });
});
