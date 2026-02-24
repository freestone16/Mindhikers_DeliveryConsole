"""
Skill 执行器
负责：
1. 读取同步过来的 skill 文件
2. 调用 LLM 执行 skill
3. 输出结果到项目目录
"""
import os
import json
import glob
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from .base_expert import ExpertInput, ExpertOutput
from .connectors import get_connector, get_connector_info


# Skill 目录（同步后）
SKILLS_DIR = os.path.dirname(__file__)

# 输出 Markdown 格式的 skill 列表（不强制 JSON）
MARKDOWN_SKILLS = {'ShortsMaster', 'Writer', 'Editor', 'DialogueWeaver', 'ThreadWeaver'}


def load_skill_prompt(expert_id: str) -> Optional[str]:
    """加载 skill 的系统提示词"""
    skill_dir = os.path.join(SKILLS_DIR, expert_id)
    skill_md = os.path.join(skill_dir, 'SKILL.md')
    
    if not os.path.exists(skill_md):
        return None
    
    with open(skill_md, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取 --- 后的内容作为 system prompt
    # 或者直接返回整个文件内容
    return content


def execute_skill(
    expert_id: str,
    project_name: str,
    script_content: str,
    output_dir: str,
    extra: Dict[str, Any] = None
) -> ExpertOutput:
    """
    执行指定专家的 skill
    
    Args:
        expert_id: 专家 ID (Director, MusicDirector, etc.)
        project_name: 项目名称
        script_content: 文稿内容
        output_dir: 输出目录
        extra: 额外参数
    
    Returns:
        ExpertOutput: 执行结果
    """
    logs = []
    
    # 1. 获取 LLM 连接器
    try:
        llm = get_connector(expert_id)
        logs.append(f"使用 LLM: {llm.get_provider_name()}")
    except Exception as e:
        return ExpertOutput(
            success=False,
            output_files=[],
            error=f"LLM 配置错误: {str(e)}",
            logs=[f"错误: {str(e)}"]
        )
    
    # 2. 加载 skill prompt
    skill_prompt = load_skill_prompt(expert_id)
    if not skill_prompt:
        return ExpertOutput(
            success=False,
            output_files=[],
            error=f"未找到 skill: {expert_id}",
            logs=[f"错误: skill 目录不存在"]
        )
    
    logs.append(f"已加载 skill: {expert_id}")
    
    # 3. 构建用户 prompt
    user_prompt = f"""项目名称: {project_name}
输出目录: {output_dir}

请根据以下文稿内容执行视觉方案设计：

{script_content}

"""
    
    # 添加额外参数到 prompt
    if extra:
        user_prompt += f"\n额外参数: {json.dumps(extra, ensure_ascii=False)}\n"
    
    # 4. 调用 LLM
    try:
        logs.append("正在调用 LLM...")
        
        if expert_id in MARKDOWN_SKILLS:
            response = llm.chat(
                messages=[
                    {"role": "system", "content": skill_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=8192
            )
            logs.append("LLM 响应已接收 (Markdown 模式)")
        else:
            response = llm.chat_with_json(
                system_prompt=skill_prompt,
                user_prompt=user_prompt,
                temperature=0.7,
                max_tokens=8192
            )
            logs.append("LLM 响应已接收 (JSON 模式)")
    except Exception as e:
        return ExpertOutput(
            success=False,
            output_files=[],
            error=f"LLM 调用失败: {str(e)}",
            logs=logs
        )
    
    # 5. 解析输出并写入文件
    output_files = []
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # 宽容处理响应：如果是字符串尝试正则提取 JSON
        if isinstance(response, str):
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                try:
                    response = json.loads(json_match.group(1))
                except:
                    pass
            elif re.search(r'\{[\s\S]*\}', response):
                try:
                    response = json.loads(re.search(r'\{[\s\S]*\}', response).group())
                except:
                    pass

        # 根据响应类型处理
        if isinstance(response, dict):
            output_content = response.get('content') or response.get('markdown') or json.dumps(response, ensure_ascii=False, indent=2)
        else:
            output_content = str(response)
        
        # 根据专家类型生成文件名
        if expert_id == 'ShortsMaster':
            filename = f"Shorts_Script_{project_name}.md"
        elif expert_id == 'Director':
            filename = f"phase2_分段视觉执行方案_{project_name}.md"
        elif expert_id == 'MarketingMaster':
            filename = f"Marketing_Plan_{project_name}.md"
        elif expert_id == 'MusicDirector':
            filename = f"Music_Plan_{project_name}.md"
        elif expert_id == 'ThumbnailMaster':
            filename = f"Thumbnail_Plan_{project_name}.md"
        else:
            filename = f"{expert_id}_Output_{project_name}.md"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(output_content)
        
        output_files.append(filepath)
        logs.append(f"已输出: {filename}")
        
    except Exception as e:
        return ExpertOutput(
            success=False,
            output_files=output_files,
            error=f"写入文件失败: {str(e)}",
            logs=logs
        )
    
    # 6. 同时尝试输出 visual_plan.json（如果 LLM 返回了结构化数据）
    if isinstance(response, dict):
        try:
            # 检查是否有 visual_plan 结构
            if 'visual_plan' in response or 'scenes' in response:
                vp_filename = "visual_plan.json"
                vp_filepath = os.path.join(output_dir, vp_filename)
                
                vp_data = {
                    "version": "1.0",
                    "project": project_name,
                    "created_at": __import__('datetime').datetime.now().isoformat(),
                    **response
                }
                
                with open(vp_filepath, 'w', encoding='utf-8') as f:
                    json.dump(vp_data, f, ensure_ascii=False, indent=2)
                
                output_files.append(vp_filepath)
                logs.append(f"已输出: {vp_filename}")
        except Exception as e:
            logs.append(f"警告: 未能生成 visual_plan.json - {str(e)}")
    
    return ExpertOutput(
        success=True,
        output_files=output_files,
        error="",
        logs=logs
    )


def get_skill_status(expert_id: str) -> Dict[str, Any]:
    """获取 skill 状态信息"""
    skill_dir = os.path.join(SKILLS_DIR, expert_id)
    skill_exists = os.path.exists(skill_dir)
    
    llm_info = get_connector_info(expert_id)
    
    return {
        "expert_id": expert_id,
        "skill_exists": skill_exists,
        "llm_config": llm_info,
        "skill_dir": skill_dir
    }
