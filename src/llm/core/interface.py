"""LLM Provider interface definition."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from llm.core.types import LLMInput, LLMOutput, ModelInfo, ProviderType


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    provider_type: ProviderType

    @abstractmethod
    def generate(self, input: LLMInput) -> LLMOutput:
        """Generate a response from the LLM."""
        ...

    @abstractmethod
    def list_models(self) -> list[ModelInfo]:
        """List available models for this provider."""
        ...

    @abstractmethod
    def validate_config(self) -> bool:
        """Validate that the provider is correctly configured (e.g., API keys)."""
        ...

    def supports_tools(self) -> bool:
        """Return whether the provider supports tool use."""
        return True

    def supports_vision(self) -> bool:
        """Return whether the provider supports vision inputs."""
        return False

    def get_default_model(self) -> str:
        """Return the default model name for this provider."""
        raise NotImplementedError(f"{self.__class__.__name__} must implement get_default_model")


class LLMError(Exception):
    """Base class for LLM-related errors."""

    def __init__(
        self,
        message: str,
        provider: ProviderType | None = None,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.code = code
        self.details = details or {}


class AuthenticationError(LLMError): ...


class RateLimitError(LLMError): ...


class ContextLengthError(LLMError): ...


class ModelNotFoundError(LLMError): ...


class ToolExecutionError(LLMError): ...
