#!/usr/bin/env python3
"""
Skill 执行入口脚本
被 Node.js 后端调用
"""
import sys
import json
import os

# 添加 skills 目录到 path
sys.path.insert(0, os.path.dirname(__file__))

from skills.executor import execute_skill, get_skill_status


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "execute":
        # 参数: execute <expert_id> <project_name> <output_dir>
        # script_content 通过 stdin 传入
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Missing arguments"}))
            sys.exit(1)
        
        expert_id = sys.argv[2]
        project_name = sys.argv[3]
        output_dir = sys.argv[4]
        
        # 从 stdin 读取 script_content
        script_content = sys.stdin.read()
        
        result = execute_skill(
            expert_id=expert_id,
            project_name=project_name,
            script_content=script_content,
            output_dir=output_dir
        )
        
        print(json.dumps({
            "success": result.success,
            "output_files": result.output_files,
            "error": result.error,
            "logs": result.logs
        }, ensure_ascii=False))
    
    elif command == "status":
        expert_id = sys.argv[2] if len(sys.argv) > 2 else None
        status = get_skill_status(expert_id)
        print(json.dumps(status, ensure_ascii=False))
    
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))


if __name__ == "__main__":
    main()
