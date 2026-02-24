import os
from typing import Dict, Type, Optional
from .base import BaseLLMConnector
from .llm_connectors import (
    DeepSeekConnector,
    OpenAIConnector,
    AnthropicConnector,
    KimiConnector,
    GeminiConnector,
    SiliconFlowConnector
)


# 连接器注册表
CONNECTORS: Dict[str, Type[BaseLLMConnector]] = {
    'deepseek': DeepSeekConnector,
    'openai': OpenAIConnector,
    'anthropic': AnthropicConnector,
    'kimi': KimiConnector,
    'gemini': GeminiConnector,
    'siliconflow': SiliconFlowConnector,
}


def get_connector(expert_id: str = None) -> BaseLLMConnector:
    """
    获取指定专家的 LLM 连接器
    
    优先级：
    1. 专家专属配置 (e.g., DIRECTOR_LLM_PROVIDER)
    2. 全局配置 (LLM_PROVIDER)
    """
    # 确定环境变量前缀
    prefix = f"{expert_id.upper()}_" if expert_id else ""
    
    # 获取 provider
    provider = os.environ.get(f"{prefix}LLM_PROVIDER") or os.environ.get('LLM_PROVIDER', 'deepseek')
    
    # 获取 API key
    # 尝试多种可能的 key 名称
    possible_key_names = [
        f"{prefix}API_KEY",
        f"{prefix}_API_KEY",
        f"{provider.upper()}_API_KEY",
        "API_KEY"
    ]
    
    api_key = None
    for key_name in possible_key_names:
        api_key = os.environ.get(key_name)
        if api_key:
            break
    
    # 构建配置
    config = {'api_key': api_key}
    
    # 获取模型配置
    model = os.environ.get(f"{prefix}LLM_MODEL") or os.environ.get('LLM_MODEL')
    if model:
        config['model'] = model
    
    # 获取连接器类
    connector_class = CONNECTORS.get(provider.lower())
    if not connector_class:
        raise ValueError(f"Unknown provider: {provider}. Available: {list(CONNECTORS.keys())}")
    
    return connector_class(config)


def get_available_providers() -> list:
    """获取所有可用的提供商"""
    return list(CONNECTORS.keys())


def get_connector_info(expert_id: str = None) -> dict:
    """获取连接器信息（不包含敏感数据）"""
    prefix = f"{expert_id.upper()}_" if expert_id else ""
    
    provider = os.environ.get(f"{prefix}LLM_PROVIDER") or os.environ.get('LLM_PROVIDER', 'deepseek')
    model = os.environ.get(f"{prefix}LLM_MODEL") or os.environ.get('LLM_MODEL', '')
    
    has_key = bool(os.environ.get(f"{prefix}API_KEY") or os.environ.get('API_KEY'))
    
    return {
        "provider": provider,
        "model": model,
        "has_api_key": has_key,
        "available_providers": get_available_providers()
    }
