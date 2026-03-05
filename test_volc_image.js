// 独立测试火山引擎文生图功能
const { generateImageWithVolc, pollVolcImageResult } = require('./server/volcengine.ts');

const TEST_PROMPT = 'Ancient Chinese mythological figure fighting tiger, explosive action power, cinematic camera movement, dark fantasy style, particle effects';

async function testVolcImageGeneration() {
    console.log('='.repeat(60));
    console.log('🧪 独立测试：火山引擎文生图');
    console.log('='.repeat(60));
    console.log();

    // 步骤 1：发起生成请求
    console.log('📋 步骤 1：调用 generateImageWithVolc...');
    const result1 = await generateImageWithVolc(TEST_PROMPT);
    console.log('返回结果:', JSON.stringify(result1, null, 2));
    console.log();

    // 步骤 2：检查是否有 task_id
    if (result1.task_id) {
        console.log(`📋 步骤 2：收到 task_id = ${result1.task_id}`);
        console.log('📋 步骤 3：开始轮询状态...');

        // 步骤 3：轮询任务状态
        let pollCount = 0;
        const maxPolls = 30;
        let finalResult = null;

        while (pollCount < maxPolls) {
            pollCount++;
            console.log(`  轮询 #${pollCount}/30...`);

            const pollResult = await pollVolcImageResult(result1.task_id);
            console.log(`  返回状态:`, JSON.stringify(pollResult, null, 2));

            if (pollResult.status === 'completed' && pollResult.image_url) {
                finalResult = pollResult;
                console.log(`✅ 轮询成功！总耗时：${pollCount * 2}秒`);
                break;
            } else if (pollResult.status === 'failed') {
                finalResult = pollResult;
                console.log(`❌ 轮询失败！`);
                break;
            } else if (pollResult.status === 'processing' || pollResult.status === 'pending') {
                // 继续轮询
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.log(`⚠️  未知状态：${pollResult.status}`);
                finalResult = {
                    status: 'failed',
                    error: `Unknown poll status: ${JSON.stringify(pollResult)}`
                };
                break;
            }
        }

        if (pollCount >= maxPolls) {
            console.log(`⏰ 轮询超时（60秒）`);
            if (!finalResult) {
                finalResult = {
                    status: 'failed',
                    error: 'Timeout: Task did not complete within 60 seconds'
                };
            }
        }

        console.log();
        console.log('='.repeat(60));
        console.log('🎯 最终结果:');
        console.log(JSON.stringify(finalResult, null, 2));
        console.log('='.repeat(60));

        if (finalResult && finalResult.status === 'completed') {
            console.log(`\n✅ 测试成功！图片 URL: ${finalResult.image_url}`);
            process.exit(0);
        } else {
            console.log(`\n❌ 测试失败！`);
            console.log(`错误信息: ${finalResult?.error || 'Unknown error'}`);
            console.log(`状态: ${finalResult?.status || 'Unknown status'}`);
            process.exit(1);
        }

    } else if (result1.error) {
        console.log(`❌ 步骤 1 失败：${result1.error}`);
        console.log();
        console.log('='.repeat(60));
        console.log('🎯 最终结果: API 调用失败');
        console.log(`错误信息: ${result1.error}`);
        console.log('='.repeat(60));
        process.exit(1);
    } else if (result1.image_url) {
        console.log(`✅ 步骤 1 成功：立即返回图片 URL`);
        console.log(`图片 URL: ${result1.image_url}`);
        console.log('='.repeat(60));
        process.exit(0);
    } else {
        console.log('❌ 步骤 1 返回未知结果');
        console.log('返回数据:', JSON.stringify(result1, null, 2));
        process.exit(1);
    }
}

// 执行测试
testVolcImageGeneration().catch(err => {
    console.error('\n❌ 测试过程中发生未捕获错误:');
    console.error(err);
    process.exit(1);
});
