from abc import ABC, abstractmethod

import openai
import anthropic

from app.config import settings


class LLMClient(ABC):
    """Abstract base class for LLM provider clients."""

    @abstractmethod
    async def generate(
        self, prompt: str, system: str = "", max_tokens: int = 2000
    ) -> str:
        """Generate a text completion from the LLM."""
        ...


class OpenAIClient(LLMClient):
    """OpenAI API client implementation."""

    def __init__(self, model: str) -> None:
        self.model = model
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(
        self, prompt: str, system: str = "", max_tokens: int = 2000
    ) -> str:
        messages: list[dict] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.8,
        )
        return response.choices[0].message.content or ""


class AnthropicClient(LLMClient):
    """Anthropic API client implementation."""

    def __init__(self, model: str) -> None:
        self.model = model
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self, prompt: str, system: str = "", max_tokens: int = 2000
    ) -> str:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system

        response = await self.client.messages.create(**kwargs)
        return response.content[0].text


def get_llm_client(provider: str, model: str) -> LLMClient:
    """Factory function to create the appropriate LLM client."""
    if provider == "anthropic":
        return AnthropicClient(model)
    elif provider == "openai":
        return OpenAIClient(model)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
