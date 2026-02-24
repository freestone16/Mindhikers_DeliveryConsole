import os
import json
import requests
from typing import List, Dict, Any, Optional
from .base import BaseLLMConnector


class DeepSeekConnector(BaseLLMConnector):
    """DeepSeek 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "deepseek"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('DEEPSEEK_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://api.deepseek.com/v1')
        self.model = self.config.get('model', 'deepseek-chat')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 4096)
        }

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"DeepSeek API Error: {response.text}")
        
        result = response.json()
        return result['choices'][0]['message']['content']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Deepseek supports JSON format
        kwargs['response_format'] = {"type": "json_object"}
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            clean_response = re.sub(r'```json\s*', '', response)
            clean_response = re.sub(r'```\s*', '', clean_response)
            try:
                return json.loads(clean_response)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', clean_response)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except Exception:
                        pass
                
                # Fallback: return raw string if it's just markdown content (like ShortsMaster)
                return response

class SiliconFlowConnector(BaseLLMConnector):
    """SiliconFlow 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "siliconflow"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('SILICONFLOW_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://api.siliconflow.cn/v1')
        self.model = self.config.get('model', 'deepseek-ai/DeepSeek-V3')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 4096)
        }

        # Some SiliconFlow models support json_object, but to be safe we don't force it here unless needed.

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"SiliconFlow API Error: {response.text}")
        
        result = response.json()
        return result['choices'][0]['message']['content']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            clean_response = re.sub(r'```json\s*', '', response)
            clean_response = re.sub(r'```\s*', '', clean_response)
            try:
                return json.loads(clean_response)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', clean_response)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except Exception:
                        pass
                        
                # Fallback: return raw string if it's just markdown content
                return response


class OpenAIConnector(BaseLLMConnector):
    """OpenAI 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "openai"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('OPENAI_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://api.openai.com/v1')
        self.model = self.config.get('model', 'gpt-4o')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 4096)
        }

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API Error: {response.text}")
        
        result = response.json()
        return result['choices'][0]['message']['content']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return response


class AnthropicConnector(BaseLLMConnector):
    """Anthropic (Claude) 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "anthropic"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('ANTHROPIC_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://api.anthropic.com/v1')
        self.model = self.config.get('model', 'claude-sonnet-4-20250514')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Convert messages format for Anthropic
        anthropic_messages = []
        for msg in messages:
            if msg['role'] == 'system':
                # System prompt handled separately
                continue
            anthropic_messages.append(msg)
        
        system_prompt = next((msg['content'] for msg in messages if msg['role'] == 'system'), '')
        
        payload = {
            "model": self.model,
            "max_tokens": kwargs.get('max_tokens', 4096),
            "temperature": kwargs.get('temperature', 0.7),
            "messages": anthropic_messages
        }
        
        if system_prompt:
            payload["system"] = system_prompt

        response = requests.post(
            f"{self.base_url}/messages",
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"Anthropic API Error: {response.text}")
        
        result = response.json()
        return result['content'][0]['text']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return response


class KimiConnector(BaseLLMConnector):
    """Kimi (月之暗面) 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "kimi"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('KIMI_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://api.moonshot.cn/v1')
        self.model = self.config.get('model', 'moonshot-v1-8k')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 4096)
        }

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"Kimi API Error: {response.text}")
        
        result = response.json()
        return result['choices'][0]['message']['content']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return response


class GeminiConnector(BaseLLMConnector):
    """Google Gemini 连接器"""

    @staticmethod
    def get_provider_name() -> str:
        return "gemini"

    def __init__(self, config: dict = None):
        super().__init__(config)
        self.api_key = self.api_key or os.environ.get('GEMINI_API_KEY', '')
        self.base_url = self.config.get('base_url', 'https://generativelanguage.googleapis.com/v1beta')
        self.model = self.config.get('model', 'gemini-2.0-flash')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            if msg['role'] == 'system':
                continue  # Gemini uses system instruction differently
            role = 'model' if msg['role'] == 'assistant' else 'user'
            contents.append({
                "role": role,
                "parts": [{"text": msg['content']}]
            })
        
        system_instruction = next((msg['content'] for msg in messages if msg['role'] == 'system'), '')
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": kwargs.get('temperature', 0.7),
                "maxOutputTokens": kwargs.get('max_tokens', 4096)
            }
        }
        
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=kwargs.get('timeout', 120)
        )
        
        if response.status_code != 200:
            raise Exception(f"Gemini API Error: {response.text}")
        
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']

    def chat_with_json(self, system_prompt: str, user_prompt: str, **kwargs) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(messages, **kwargs)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return response
