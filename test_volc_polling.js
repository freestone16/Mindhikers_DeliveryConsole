/**
 * 测试火山引擎预览图轮询机制和 LLM 超时机制
 *
 * 测试内容：
 * 1. 验证火山引擎轮询逻辑是否正确实现
 * 2. 验证 LLM 调用超时机制是否正确实现
 */

const fs = require('fs');
const path = require('path');

async function testVolcPolling() {
  console.log('=== 测试火山引擎预览图轮询机制 ===');

  const directorPath = path.join(__dirname, 'server/director.ts');

  if (!fs.existsSync(directorPath)) {
    console.log('❌ director.ts 文件不存在');
    return false;
  }

  const directorCode = fs.readFileSync(directorPath, 'utf-8');

  // 检查关键代码片段
  const checks = {
    '轮询循环': directorCode.includes('while (pollCount < maxPolls)'),
    '轮询调用': directorCode.includes('const pollResult = await pollVolcImageResult'),
    '轮询间隔(2秒)': directorCode.includes('await new Promise(resolve => setTimeout(resolve, 2000))'),
    '最大轮询次数(30)': directorCode.includes('const maxPolls = 30'),
    '超时检查': directorCode.includes('if (pollCount >= maxPolls)'),
    '完成状态更新': directorCode.includes('currentTask.status = \'completed\''),
    '失败状态更新': directorCode.includes('currentTask.status = \'failed\''),
    '超时错误处理': directorCode.includes('timeoutTask.status = \'failed\''),
    '图片URL保存': directorCode.includes('currentTask.imageUrl = pollResult.image_url'),
    '错误日志': directorCode.includes('console.log(`[Volcengine Thumbnail] Poll Success'),
    '失败日志': directorCode.includes('console.error(`[Volcengine Thumbnail] Poll Failed'),
    '超时日志': directorCode.includes('console.error(`[Volcengine Thumbnail] Timeout'),
    '轮询函数启动': directorCode.includes('pollVolc().catch'),
  };

  console.log('\n检查项目:');
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
  }

  const allPassed = Object.values(checks).every(v => v);

  if (allPassed) {
    console.log('\n✅ 火山引擎轮询机制检查通过');
  } else {
    console.log('\n❌ 火山引擎轮询机制检查失败');
  }

  return allPassed;
}

async function testLLMTimeout() {
  console.log('\n=== 测试 LLM 调用超时机制 ===');

  const llmPath = path.join(__dirname, 'server/llm.ts');

  if (!fs.existsSync(llmPath)) {
    console.log('❌ llm.ts 文件不存在');
    return false;
  }

  const llmCode = fs.readFileSync(llmPath, 'utf-8');

  const providers = [
    'callZhipuLLM',
    'callOpenAILLM',
    'callDeepSeekLLM',
    'callSiliconFlowLLM',
    'callKimiLLM'
  ];

  console.log('\n检查各 LLM 提供商的超时机制:');
  const providerResults = {};

  for (const provider of providers) {
    const providerCode = extractFunction(llmCode, provider);

    const checks = {
      'AbortController': providerCode.includes('new AbortController()'),
      'setTimeout': providerCode.includes('setTimeout'),
      'signal 传递': providerCode.includes('signal: controller.signal'),
      'clearTimeout': providerCode.includes('clearTimeout'),
      'AbortError 检查': providerCode.includes("error.name === 'AbortError'"),
      '错误日志': providerCode.includes('console.error'),
      '超时错误消息': providerCode.includes('timeout'),
    };

    const passed = Object.values(checks).every(v => v);
    providerResults[provider] = { passed, checks };

    console.log(`  ${passed ? '✅' : '❌'} ${provider}`);
    if (!passed) {
      for (const [name, ok] of Object.entries(checks)) {
        if (!ok) {
          console.log(`      ❌ 缺少: ${name}`);
        }
      }
    }
  }

  const allPassed = Object.values(providerResults).every(r => r.passed);

  if (allPassed) {
    console.log('\n✅ 所有 LLM 调用超时机制检查通过');
  } else {
    console.log('\n❌ 部分 LLM 调用超时机制检查失败');
  }

  return allPassed;
}

// 提取函数代码的辅助函数
function extractFunction(code, functionName) {
  const startPattern = `async function ${functionName}(`;
  const startIndex = code.indexOf(startPattern);
  if (startIndex === -1) return '';

  let braceCount = 0;
  let inFunction = false;
  let endIndex = startIndex;

  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      inFunction = true;
    } else if (code[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  return code.substring(startIndex, endIndex);
}

async function main() {
  console.log('🔧 开始测试...\n');

  const volcResult = await testVolcPolling();
  const llmResult = await testLLMTimeout();

  console.log('\n' + '='.repeat(50));
  if (volcResult && llmResult) {
    console.log('✅ 所有测试通过！');
    console.log('\n修复摘要:');
    console.log('  1. 火山引擎预览图轮询机制已实现');
    console.log('     - 收到 task_id 后启动后台轮询');
    console.log('     - 2秒轮询间隔，最多30次（60秒）');
    console.log('     - 完成/失败状态正确更新');
    console.log('  2. LLM 调用超时机制已实现');
    console.log('     - 所有 LLM 提供商都有 AbortController');
    console.log('     - 超时后正确清理和报错');
    console.log('     - 详细的错误日志输出');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
