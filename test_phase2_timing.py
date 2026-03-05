#!/usr/bin/env python3
import json
import time
import urllib.request
import ssl

# 禁用 SSL 验证
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

api_key = "sk-zdtbszvanzawamujyomhroxwpiqbaajabrfnfwzambradxwv"
url = "https://api.siliconflow.cn/v1/chat/completions"

# 真实 Phase2 prompt
test_prompt = """请作为导演,为以下3个章节生成 B-roll 视觉方案。

章节1: 信息有效密度
内容: 当"两个字"撑起一段大片。有效信息密度趋近于零。

章节2: 奶头乐闭环
内容: 资本看清了人性。精神鸦片的工业化时代。

章节3: 注意力经济
内容: 你的时间属于谁？注意力经济追求的是让你停留。

请输出 JSON 格式，每个章节至少3个方案。类型包括: remotion, generative, artlist, internet-clip, user-capture }"""

data = {
    "model": "Pro/moonshotai/Kimi-K2.5",
    "messages": [{"role": "user", "content": test_prompt}],
    "temperature": 1,
    "max_tokens": 2000
}

print("开始测试 Kimi-K2.5 API...")
start_time = time.time()
print(f"开始时间: {time.strftime('%H:%M:%S', time.localtime(start_time))}")

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode(),
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
)

try:
    # 设置5分钟超时
    with urllib.request.urlopen(req, timeout=300) as response:
        result = json.loads(response.read().decode())
        elapsed = time.time() - start_time
        
        print(f"\n{'='*60}")
        print(f"✅ API 调用成功!")
        print(f"   耗时: {elapsed:.1f}秒")
        
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        # 尝试解析 JSON
        try:
            parsed = json.loads(content)
            if 'chapters' in parsed:
                print(f"   ✅ JSON 格式正确! 章节数: {len(parsed['chapters'])}")
                for ch in parsed['chapters']:
                    print(f"      章节 {ch.get('chapterId')}: {len(ch.get('options', []))} 个方案")
            else:
                print(f"   ⚠️ JSON 格式不正确，缺少 'chapters' 字段")
                print(f"   原始内容: {content[:300]}...")
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON 解析失败: {e}")
            print(f"   原始内容: {content[:300]}...")
            
except urllib.error.URLError as e:
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"❌ 网络错误: {e}")
    print(f"   耗时: {elapsed:.1f}秒 (超时)")
except Exception as e:
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"❌ 其他错误: {e}")
    print(f"   类型: {type(e).__name__}")
    print(f"   耗时: {elapsed:.1f}秒")
