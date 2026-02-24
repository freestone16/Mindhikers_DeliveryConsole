from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import os


class BaseLLMConnector(ABC):
    """LLM 连接器基类"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.api_key = self.config.get('api_key') or os.environ.get('API_KEY', '')
        self.model = self.config.get('model', 'default')
    
    @staticmethod
    @abstractmethod
    def get_provider_name() -> str:
        """返回提供商标识"""
        pass
    
    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """发送聊天请求，返回内容"""
        pass
    
    @abstractmethod
    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        """发送聊天请求，返回 JSON"""
        pass
    
    def get_config_summary(self) -> dict:
        """获取配置摘要（不包含敏感信息）"""
        return {
            "provider": self.get_provider_name(),
            "model": self.model,
            "has_api_key": bool(self.api_key)
        }
