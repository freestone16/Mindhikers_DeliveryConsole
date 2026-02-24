from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ExpertInput:
    """Skill 输入数据"""
    project_name: str
    script_path: str
    script_content: str
    output_dir: str
    extra: dict = None
    
    def __post_init__(self):
        if self.extra is None:
            self.extra = {}


@dataclass
class ExpertOutput:
    """Skill 输出数据"""
    success: bool
    output_files: list
    error: str = ""
    logs: list = None
    
    def __post_init__(self):
        if self.logs is None:
            self.logs = []


class BaseExpertSkill(ABC):
    """Expert Skill 基类"""
    
    @property
    @abstractmethod
    def expert_id(self) -> str:
        """专家 ID"""
        pass
    
    @property
    def display_name(self) -> str:
        """显示名称"""
        return self.expert_id
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        pass
    
    @abstractmethod
    def run(self, input_data: ExpertInput) -> ExpertOutput:
        """执行 Skill"""
        pass
    
    def get_input_schema(self) -> dict:
        """获取输入参数 schema"""
        return {
            "project_name": "项目名称",
            "script_path": "文稿路径",
            "script_content": "文稿内容",
            "output_dir": "输出目录"
        }
    
    def get_output_files(self) -> list:
        """获取预期的输出文件列表"""
        return []
